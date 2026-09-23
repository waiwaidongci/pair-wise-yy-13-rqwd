// 领域模型：小样台账 + 订单投产放行

/** 工艺快照（放行时整体冻结，生产线凭放行单核对对应工艺版本） */
export interface ProcessSnapshot {
  version: number;
  recipeName: string; // 配方名称/摘要
  recipeItems: string[]; // 染料配方明细
  liquorRatio: string; // 浴比
  tempCurve: string; // 温度曲线摘要
  holdTimeMin: number; // 保温时间（分钟）
  finish: string; // 后整理方式
  adjustedBy: string; // 工艺调整人
  adjustedAt: string; // 调整时间
}

/** 小样批次 */
export interface SampleBatch {
  id: string;
  orderNo: string;
  fabric: string; // 面料成分
  weightGsm: number; // 克重 g/m²
  deltaE: number; // Lab 色差值
  review: string; // 评审评语
  reviewPassed: boolean; // 评语是否通过（仅作参考，不替代放行核验）
  process: ProcessSnapshot;
}

/** 客户订单 */
export interface CustomerOrder {
  orderNo: string;
  customer: string;
  product: string;
  requiredFinish: string; // 大货要求后整理方式
  requiredHoldMin: number; // 工艺要求保温时间（分钟）
  batchIds: string[];
}

/** 会触发放行失效的三类工艺变更 */
export type ProcessField = "recipe" | "finish" | "holdTime";

export type ReleaseStatus = "active" | "invalidated";

export type CheckCode =
  | "colorDelta"
  | "finishConsistent"
  | "holdTime"
  | "reviewerIndependent";

export interface ReleaseCheckResult {
  code: CheckCode;
  label: string;
  passed: boolean;
  detail: string;
}

/** 投产放行单：绑定订单 + 放行时的当前工艺快照 */
export interface ProductionRelease {
  id: string;
  orderNo: string;
  batchId: string;
  applicant: string; // 申请放行的业务员
  reviewer: string; // 复核人
  submittedAt: string;
  batchDeltaE: number; // 放行依据小样色差
  processSnapshot: ProcessSnapshot; // 绑定工艺（快照）
  status: ReleaseStatus;
  invalidatedAt?: string;
  invalidatedReason?: ProcessField;
  changeDetail?: string; // 失效时的变更描述
}

export interface LedgerState {
  orders: CustomerOrder[];
  batches: Record<string, SampleBatch>;
  releases: ProductionRelease[];
}
