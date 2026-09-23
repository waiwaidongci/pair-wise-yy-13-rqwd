import type {
  CheckCode,
  CustomerOrder,
  ProcessField,
  ProcessSnapshot,
  ProductionRelease,
  ReleaseCheckResult,
  SampleBatch,
} from "./types";

// ── 投产放行规则（规则层：只承载判定逻辑，不依赖页面与存档） ──

/** 色差阈值：Lab ΔE 不得超过 0.8 */
export const MAX_DELTA_E = 0.8;

/** 仅以下三类工艺变更会让已生效放行失效 */
export const INVALIDATING_FIELDS: ProcessField[] = [
  "recipe",
  "finish",
  "holdTime",
];

export const CHECK_LABELS: Record<CheckCode, string> = {
  colorDelta: "色差 ΔE ≤ 0.8",
  finishConsistent: "后整理一致",
  holdTime: "保温达标",
  reviewerIndependent: "复核人不同于工艺调整人",
};

export const FIELD_LABELS: Record<ProcessField, string> = {
  recipe: "配方",
  finish: "后整理",
  holdTime: "保温时间",
};

const rounded = (value: number) => Math.round(value * 100) / 100;

/** 按放行规则逐项核验 */
export function evaluateReleaseChecks(args: {
  order: CustomerOrder;
  batch: SampleBatch;
  reviewer: string;
}): ReleaseCheckResult[] {
  const { order, batch, reviewer } = args;
  const process = batch.process;

  return [
    {
      code: "colorDelta",
      label: CHECK_LABELS.colorDelta,
      passed: rounded(batch.deltaE) <= MAX_DELTA_E,
      detail: `小样 ${batch.id} 实测 ΔE ${rounded(batch.deltaE)}，阈值 ${MAX_DELTA_E}`,
    },
    {
      code: "finishConsistent",
      label: CHECK_LABELS.finishConsistent,
      passed: process.finish.trim() === order.requiredFinish.trim(),
      detail: `小样工艺「${process.finish}」 vs 订单要求「${order.requiredFinish}」`,
    },
    {
      code: "holdTime",
      label: CHECK_LABELS.holdTime,
      passed: process.holdTimeMin >= order.requiredHoldMin,
      detail: `保温 ${process.holdTimeMin} 分钟，要求 ≥ ${order.requiredHoldMin} 分钟`,
    },
    {
      code: "reviewerIndependent",
      label: CHECK_LABELS.reviewerIndependent,
      passed: reviewer.trim() !== "" && reviewer !== process.adjustedBy,
      detail: `复核人「${reviewer || "未选择"}」 vs 工艺调整人「${process.adjustedBy}」`,
    },
  ];
}

export function allChecksPassed(checks: ReleaseCheckResult[]): boolean {
  return checks.every((check) => check.passed);
}

/** 订单当前有效放行（同订单重复提交沿用首次，即只认这一条） */
export function getActiveRelease(
  orderNo: string,
  releases: ProductionRelease[]
): ProductionRelease | undefined {
  return releases.find(
    (release) => release.orderNo === orderNo && release.status === "active"
  );
}

/** 选订单时的三态分组：有效放行 / 待重评 / 缺样品批次 */
export type OrderReleaseState =
  | "valid"
  | "needsRevalidation"
  | "missingSample"
  | "notReleased";

export function deriveOrderState(
  order: CustomerOrder,
  batchById: Record<string, SampleBatch>,
  releases: ProductionRelease[]
): OrderReleaseState {
  const latestBatch = latestBatchOf(order, batchById);
  if (!latestBatch) return "missingSample";

  const active = getActiveRelease(order.orderNo, releases);
  if (active) return "valid";

  const hasHistory = releases.some(
    (release) => release.orderNo === order.orderNo
  );
  return hasHistory ? "needsRevalidation" : "notReleased";
}

export function latestBatchOf(
  order: CustomerOrder,
  batchById: Record<string, SampleBatch>
): SampleBatch | undefined {
  for (let i = order.batchIds.length - 1; i >= 0; i--) {
    const batch = batchById[order.batchIds[i]];
    if (batch) return batch;
  }
  return undefined;
}

/** 描述一次工艺调整中触及的放行失效项 */
export function describeChange(
  field: ProcessField,
  before: ProcessSnapshot,
  afterRecipeName: string,
  afterFinish: string,
  afterHold: number
): string {
  switch (field) {
    case "recipe":
      return `配方「${before.recipeName}」→「${afterRecipeName}」`;
    case "finish":
      return `后整理「${before.finish}」→「${afterFinish}」`;
    case "holdTime":
      return `保温时间 ${before.holdTimeMin} → ${afterHold} 分钟`;
  }
}
