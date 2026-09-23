// 领域模型：订单投产放行相关的数据结构

/** 染料配方组分（百分比之和应为 100） */
export interface RecipePart {
  dye: string;
  /** 用量百分比（o.w.f） */
  percent: number;
}

/** 当前工艺（配方 / 后整理 / 保温时间是放行测控项，变更会触发重评） */
export interface ProcessSpec {
  version: number;
  /** 染料配方 */
  recipe: RecipePart[];
  /** 浴比，如 1:10 */
  liquorRatio: string;
  /** 温度曲线摘要，如 60℃×30min */
  tempCurve: string;
  /** 保温时间（分钟）—— 工艺要求值，样品必须达到该值 */
  holdMinutes: number;
  /** 后整理方式，如 "柔软剂 20g/L 浸轧" */
  finishing: string;
  /** 最近一次调整人 */
  updatedBy: string;
  /** 最近调整时间（ISO 字符串） */
  updatedAt: string;
  /** 调整说明 */
  changeNote: string;
}

/** 小样批次 */
export interface SampleBatch {
  id: string;
  /** 对应打样时的工艺版本 */
  processVersion: number;
  /** Lab 实测总色差 ΔE */
  deltaE: number;
  /** 实测保温时间（分钟） */
  holdMinutes: number;
  /** 实测/实际使用的后整理方式 */
  finishing: string;
  /** 实验室评语 */
  verdict: "通过" | "待复染" | "客户确认中";
  testedAt: string;
}

/** 客户订单 */
export interface DyeOrder {
  id: string;
  customer: string;
  fabric: string;
  /** 面料成分 */
  composition: string;
  /** 克重 g/m² */
  weightGsm: number;
  /** 数量（米） */
  quantityM: number;
  currentProcess: ProcessSpec;
  samples: SampleBatch[];
}

/** 放行状态 */
export type ReleaseStatus = "有效" | "已失效";

/** 失效原因 */
export type InvalidateReason =
  | "配方变更"
  | "后整理变更"
  | "保温时间变更";

/** 放行单：绑定订单 + 放行时的工艺版本 */
export interface ReleaseRecord {
  id: string;
  orderId: string;
  /** 放行时绑定的工艺版本 */
  processVersion: number;
  /** 放行时工艺的快照（旧版可查） */
  processSnapshot: ProcessSpec;
  sampleBatchId: string;
  /** 放行时实测色差 */
  deltaE: number;
  reviewer: string;
  releasedAt: string;
  status: ReleaseStatus;
  /** 失效时间 */
  invalidatedAt?: string;
  /** 失效原因（一次调整可能涉及多项） */
  invalidateReasons?: InvalidateReason[];
  /** 失效后对应的新工艺版本 */
  supersededByVersion?: number;
  note?: string;
}

/** 单条放行测控项结果 */
export interface CriterionResult {
  key: "deltaE" | "finishing" | "holding" | "reviewer";
  label: string;
  passed: boolean;
  detail: string;
}

/** 放行评估结果 */
export interface ReleaseEvaluation {
  passed: boolean;
  criteria: CriterionResult[];
}

/** 工艺变更检测结果 */
export interface ProcessChange {
  changed: boolean;
  reasons: InvalidateReason[];
}

/** 选订单时的分组：有效放行 / 待重评 / 缺样品批次 */
export type OrderBoardGroup = "有效放行" | "待重评" | "缺样品批次";
