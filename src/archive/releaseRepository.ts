import type {
  DyeOrder,
  InvalidateReason,
  ProcessSpec,
  ReleaseRecord,
} from "../domain/types";
import { bumpProcess, diffProcess, evaluateRelease } from "../domain/releaseRules";
import { seedData, type ProcessHistoryEntry } from "./seed";

const STORAGE_KEY = "hxyfront-62012:release-board:v1";

interface PersistShape {
  orders: DyeOrder[];
  releases: ReleaseRecord[];
  processHistory: ProcessHistoryEntry[];
  seq: number;
}

export type SubmitOutcome =
  | { kind: "created"; release: ReleaseRecord }
  | { kind: "reused"; release: ReleaseRecord }
  | {
      kind: "rejected";
      criteria: ReturnType<typeof evaluateRelease>["criteria"];
    }
  | { kind: "no-sample" };

export interface AdjustOutcome {
  order: DyeOrder;
  changed: boolean;
  reasons: InvalidateReason[];
  /** 被作废的放行（可能多张） */
  invalidated: ReleaseRecord[];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * 放行存档仓储：只管持久化与台账，不知道页面长什么样。
 * 所有读出的数据都是深拷贝，外部无法越过仓储直接改存档。
 */
export class ReleaseRepository {
  private db: PersistShape;

  constructor() {
    this.db = this.load();
  }

  private load(): PersistShape {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistShape;
        if (Array.isArray(parsed.orders) && Array.isArray(parsed.releases)) {
          return parsed;
        }
      }
    } catch {
      // 存档损坏时回退到演示数据
    }
    return {
      orders: clone(seedData.orders),
      releases: clone(seedData.releases),
      processHistory: clone(seedData.processHistory),
      seq: 2,
    };
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch {
      // 隐私模式等场景下仅保留内存态
    }
  }

  resetToSeed() {
    this.db = {
      orders: clone(seedData.orders),
      releases: clone(seedData.releases),
      processHistory: clone(seedData.processHistory),
      seq: 2,
    };
    this.persist();
  }

  getOrders(): DyeOrder[] {
    return clone(this.db.orders);
  }

  getReleases(): ReleaseRecord[] {
    return clone(this.db.releases);
  }

  getProcessHistory(orderId: string): ProcessSpec[] {
    return this.db.processHistory
      .filter((h) => h.orderId === orderId)
      .map((h) => clone(h.process))
      .sort((a, b) => a.version - b.version);
  }

  private findOrder(orderId: string): DyeOrder | undefined {
    return this.db.orders.find((o) => o.id === orderId);
  }

  /**
   * 提交放行：
   * - 已有与当前工艺绑定的有效放行时，重复提交沿用首次（幂等，不产生新单）
   * - 四项测控不达标则拒绝
   */
  submitRelease(input: {
    orderId: string;
    sampleBatchId: string;
    reviewer: string;
    note?: string;
    now?: string;
  }): SubmitOutcome {
    const order = this.findOrder(input.orderId);
    if (!order) return { kind: "no-sample" };

    // 幂等：当前工艺下已有有效放行，直接沿用首次
    const existing = this.db.releases.find(
      (r) =>
        r.orderId === input.orderId &&
        r.status === "有效" &&
        r.processVersion === order.currentProcess.version
    );
    if (existing) {
      return { kind: "reused", release: clone(existing) };
    }

    const sample = order.samples.find((s) => s.id === input.sampleBatchId);
    if (!sample) return { kind: "no-sample" };

    const evaluation = evaluateRelease(
      clone(order),
      clone(sample),
      input.reviewer
    );
    if (!evaluation.passed) {
      return { kind: "rejected", criteria: evaluation.criteria };
    }

    this.db.seq += 1;
    const record: ReleaseRecord = {
      id: `REL-${order.id.slice(3)}-${String(this.db.seq).padStart(2, "0")}`,
      orderId: order.id,
      processVersion: order.currentProcess.version,
      processSnapshot: clone(order.currentProcess),
      sampleBatchId: sample.id,
      deltaE: sample.deltaE,
      reviewer: input.reviewer.trim(),
      releasedAt: input.now ?? new Date().toISOString(),
      status: "有效",
      note: input.note?.trim() || undefined,
    };
    this.db.releases.push(record);
    this.persist();
    return { kind: "created", release: clone(record) };
  }

  /**
   * 调整工艺：
   * - 配方 / 后整理 / 保温时间变更 → 版本 +1，原有效放行全部失效并保留旧版存档
   * - 仅改浴比、温度曲线、说明 → 不升版、不作废
   */
  adjustProcess(input: {
    orderId: string;
    patch: Partial<
      Pick<
        ProcessSpec,
        "recipe" | "liquorRatio" | "tempCurve" | "holdMinutes" | "finishing" | "changeNote"
      >
    >;
    updatedBy: string;
    now?: string;
  }): AdjustOutcome | undefined {
    const order = this.findOrder(input.orderId);
    if (!order || !input.updatedBy.trim()) return undefined;

    const { next } = bumpProcess(
      order.currentProcess,
      input.patch,
      input.updatedBy.trim(),
      input.now ?? new Date().toISOString()
    );
    const change = diffProcess(order.currentProcess, next);

    order.currentProcess = next;

    let invalidated: ReleaseRecord[] = [];
    if (change.changed) {
      invalidated = this.db.releases.filter(
        (r) => r.orderId === order.id && r.status === "有效"
      );
      for (const r of invalidated) {
        r.status = "已失效";
        r.invalidatedAt = next.updatedAt;
        r.invalidateReasons = change.reasons;
        r.supersededByVersion = next.version;
      }
      // 新版工艺入档，旧版放行快照仍可在放行台账中查看
      this.db.processHistory.push({ orderId: order.id, process: clone(next) });
    }

    this.persist();
    return {
      order: clone(order),
      changed: change.changed,
      reasons: change.reasons,
      invalidated: clone(invalidated),
    };
  }
}
