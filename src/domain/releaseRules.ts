import type {
  CriterionResult,
  DyeOrder,
  InvalidateReason,
  OrderBoardGroup,
  ProcessChange,
  ProcessSpec,
  ReleaseEvaluation,
  ReleaseRecord,
  SampleBatch,
} from "./types";

/** 放行允许的最大色差 */
export const MAX_DELTA_E = 0.8;

/**
 * 放行测控四项：
 * 1. 色差不超过 0.8
 * 2. 样品后整理与当前工艺一致
 * 3. 样品保温时间达到工艺要求
 * 4. 复核人不同于工艺调整人（且双方都具名）
 */
export function evaluateRelease(
  order: DyeOrder,
  sample: SampleBatch,
  reviewer: string
): ReleaseEvaluation {
  const process = order.currentProcess;
  const criteria: CriterionResult[] = [
    {
      key: "deltaE",
      label: `色差 ΔE ≤ ${MAX_DELTA_E.toFixed(1)}`,
      passed: sample.deltaE <= MAX_DELTA_E,
      detail: `实测 ΔE ${sample.deltaE.toFixed(2)}（批次 ${sample.id}）`,
    },
    {
      key: "finishing",
      label: "后整理一致",
      passed: sample.finishing.trim() === process.finishing.trim(),
      detail: `样品「${sample.finishing}」 vs 工艺「${process.finishing}」`,
    },
    {
      key: "holding",
      label: "保温达标",
      passed: sample.holdMinutes >= process.holdMinutes,
      detail: `样品 ${sample.holdMinutes}min，工艺要求 ≥ ${process.holdMinutes}min`,
    },
    {
      key: "reviewer",
      label: "复核人 ≠ 工艺调整人",
      passed:
        reviewer.trim().length > 0 &&
        reviewer.trim() !== process.updatedBy.trim(),
      detail:
        reviewer.trim().length === 0
          ? "尚未填写复核人"
          : `复核人「${reviewer.trim()}」，工艺调整人「${process.updatedBy}」`,
    },
  ];

  return {
    passed: criteria.every((c) => c.passed),
    criteria,
  };
}

/** 比较新旧工艺，判断是否发生导致放行失效的变更 */
export function diffProcess(
  before: ProcessSpec,
  after: ProcessSpec
): ProcessChange {
  const reasons: InvalidateReason[] = [];

  const recipeKey = (p: ProcessSpec) =>
    p.recipe
      .map((r) => `${r.dye}:${r.percent}`)
      .sort()
      .join("|");
  if (recipeKey(before) !== recipeKey(after)) {
    reasons.push("配方变更");
  }
  if (before.finishing.trim() !== after.finishing.trim()) {
    reasons.push("后整理变更");
  }
  if (before.holdMinutes !== after.holdMinutes) {
    reasons.push("保温时间变更");
  }

  return { changed: reasons.length > 0, reasons };
}

/**
 * 工艺调整后产生下一版工艺：
 * 配方 / 后整理 / 保温时间变更才升版本；浴比、温度曲线、说明等不触发重评。
 */
export function bumpProcess(
  current: ProcessSpec,
  patch: Partial<Pick<ProcessSpec, "recipe" | "liquorRatio" | "tempCurve" | "holdMinutes" | "finishing" | "changeNote">>,
  updatedBy: string,
  updatedAt: string
): { next: ProcessSpec; change: ProcessChange } {
  const next: ProcessSpec = {
    ...current,
    ...patch,
    // 未提供的字段保持原值
    recipe: patch.recipe ?? current.recipe,
    holdMinutes: patch.holdMinutes ?? current.holdMinutes,
    finishing: patch.finishing ?? current.finishing,
    version: current.version, // 先占位，下面按变更情况决定
    updatedBy,
    updatedAt,
    changeNote: patch.changeNote ?? current.changeNote,
  };
  const change = diffProcess(current, next);
  next.version = change.changed ? current.version + 1 : current.version;
  return { next, change };
}

/**
 * 订单分组（选订单时一眼看到三类批次）：
 * - 有效放行：存在与当前工艺版本绑定的有效放行
 * - 缺样品批次：连可评的小样都没有（生产线此时无样可依）
 * - 待重评：无有效放行（从未放行，或放行已被工艺变更作废）
 * 另做防御：放行仍为"有效"但版本对不上当前工艺时，按待重评处理。
 */
export function classifyOrder(
  order: DyeOrder,
  releases: ReleaseRecord[]
): OrderBoardGroup {
  if (order.samples.length === 0) {
    return "缺样品批次";
  }
  const valid = releases.find(
    (r) =>
      r.orderId === order.id &&
      r.status === "有效" &&
      r.processVersion === order.currentProcess.version
  );
  return valid ? "有效放行" : "待重评";
}

/** 默认勾选的小样：取最新一批（按测试时间、批次号倒序） */
export function latestSample(
  order: DyeOrder
): SampleBatch | undefined {
  return [...order.samples].sort((a, b) => {
    const byTime = b.testedAt.localeCompare(a.testedAt);
    return byTime !== 0 ? byTime : b.id.localeCompare(a.id);
  })[0];
}
