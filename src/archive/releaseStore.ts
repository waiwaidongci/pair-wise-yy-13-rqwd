import { useSyncExternalStore } from "react";
import { buildSeedState } from "./seedData";
import type {
  CustomerOrder,
  LedgerState,
  ProcessField,
  ReleaseCheckResult,
  SampleBatch,
} from "../domain/types";
import {
  allChecksPassed,
  describeChange,
  evaluateReleaseChecks,
  getActiveRelease,
} from "../domain/releaseRules";

// ── 存档层：放行台账的写入、失效与留存，localStorage 持久化 ──

const STORAGE_KEY = "hxyfront-62012-release-ledger-v1";

let state: LedgerState = loadState();
const listeners = new Set<() => void>();

function loadState(): LedgerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LedgerState;
      if (parsed.orders && parsed.batches && parsed.releases) {
        return parsed;
      }
    }
  } catch {
    // 存档不可读时回落到演示台账
  }
  return buildSeedState();
}

function persist(next: LedgerState) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 持久化失败不影响本次会话内的台账操作
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLedgerState(): LedgerState {
  return state;
}

export function useLedger(): LedgerState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );
}

let releaseSeq = 100;
function nextReleaseId(): string {
  releaseSeq += 1;
  return `REL-2609-${String(releaseSeq).padStart(3, "0")}`;
}

function nowText(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export interface SubmitResult {
  outcome: "created" | "reused" | "rejected";
  releaseId?: string;
  checks: ReleaseCheckResult[];
  message: string;
}

/**
 * 提交订单投产放行：
 * - 已有有效放行时重复提交沿用首次（幂等，不产生新单）；
 * - 核验不通过则拒绝，不留存放行单。
 */
export function submitRelease(input: {
  order: CustomerOrder;
  batch: SampleBatch;
  applicant: string;
  reviewer: string;
}): SubmitResult {
  const { order, batch, applicant, reviewer } = input;

  const existing = getActiveRelease(order.orderNo, state.releases);
  if (existing) {
    return {
      outcome: "reused",
      releaseId: existing.id,
      checks: evaluateReleaseChecks({ order, batch, reviewer: existing.reviewer }),
      message: `该订单已有有效放行 ${existing.id}，重复提交沿用首次放行，不重复出具。`,
    };
  }

  const checks = evaluateReleaseChecks({ order, batch, reviewer });
  if (!allChecksPassed(checks)) {
    return {
      outcome: "rejected",
      checks,
      message: "核验未全部通过，不予放行，请调整工艺或重新打样后再提交。",
    };
  }

  const release = {
    id: nextReleaseId(),
    orderNo: order.orderNo,
    batchId: batch.id,
    applicant,
    reviewer,
    submittedAt: nowText(),
    batchDeltaE: batch.deltaE,
    processSnapshot: structuredClone(batch.process),
    status: "active" as const,
  };

  persist({ ...state, releases: [...state.releases, release] });
  return {
    outcome: "created",
    releaseId: release.id,
    checks,
    message: `放行通过：${release.id} 已绑定订单 ${order.orderNo} 与工艺版本 v${batch.process.version}，生产线据此排产。`,
  };
}

export interface AdjustResult {
  changed: boolean;
  newVersion: number;
  invalidatedReleaseId?: string;
  invalidatedField?: ProcessField;
  message: string;
}

/**
 * 工艺调整（配方 / 后整理 / 保温时间）：
 * 版本递增；若订单存在有效放行且变更属于三类失效项，原放行置为失效并留存。
 */
export function adjustProcess(input: {
  batch: SampleBatch;
  field: ProcessField;
  recipeName?: string;
  recipeItemsText?: string;
  finish?: string;
  holdTimeMin?: number;
}): AdjustResult {
  const { batch, field } = input;
  const before = batch.process;

  const recipeName = (input.recipeName ?? before.recipeName).trim() || before.recipeName;
  const recipeItems =
    field === "recipe" && input.recipeItemsText !== undefined
      ? input.recipeItemsText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
      : before.recipeItems;
  const finish = (input.finish ?? before.finish).trim() || before.finish;
  const holdTimeMin = input.holdTimeMin ?? before.holdTimeMin;

  const unchanged =
    (field !== "recipe" ||
      (recipeName === before.recipeName &&
        recipeItems.join("\n") === before.recipeItems.join("\n"))) &&
    (field !== "finish" || finish === before.finish) &&
    (field !== "holdTime" || holdTimeMin === before.holdTimeMin);

  if (unchanged) {
    return {
      changed: false,
      newVersion: before.version,
      message: "内容与当前工艺一致，未产生新版本。",
    };
  }

  const updatedProcess = {
    ...structuredClone(before),
    version: before.version + 1,
    recipeName,
    recipeItems,
    finish,
    holdTimeMin,
    adjustedAt: nowText(),
  };

  const updatedBatch: SampleBatch = {
    ...batch,
    process: updatedProcess,
  };

  const changeDetail = describeChange(
    field,
    before,
    recipeName,
    finish,
    holdTimeMin
  );

  let invalidatedReleaseId: string | undefined;
  const releases = state.releases.map((release) => {
    if (
      release.status === "active" &&
      release.batchId === batch.id
    ) {
      invalidatedReleaseId = release.id;
      return {
        ...release,
        status: "invalidated" as const,
        invalidatedAt: nowText(),
        invalidatedReason: field,
        changeDetail,
      };
    }
    return release;
  });

  persist({
    ...state,
    batches: { ...state.batches, [batch.id]: updatedBatch },
    releases,
  });

  return {
    changed: true,
    newVersion: updatedProcess.version,
    invalidatedReleaseId,
    invalidatedField: invalidatedReleaseId ? field : undefined,
    message: invalidatedReleaseId
      ? `工艺已升版至 v${updatedProcess.version}（${changeDetail}）；原放行 ${invalidatedReleaseId} 因${
          field === "recipe" ? "配方" : field === "finish" ? "后整理" : "保温时间"
        }变更失效，需重新核验放行，旧版存档可查。`
      : `工艺已升版至 v${updatedProcess.version}（${changeDetail}）。`,
  };
}

/** 恢复演示台账 */
export function resetLedger() {
  persist(buildSeedState());
}
