import type {
  CustomerOrder,
  LedgerState,
  ProcessSnapshot,
  ProductionRelease,
  SampleBatch,
} from "../domain/types";

// ── 存档层：演示数据（真实环境由后端台账提供，页面不直接编造业务数据） ──

export const STAFF = {
  process: ["周建国", "方工", "赵雪梅"], // 工艺员
  reviewers: ["孙丽华", "钱明远", "李慧"], // 可担任复核的人
  sales: ["王海涛", "陈晓琳"], // 业务员
};

function process(
  version: number,
  recipeName: string,
  recipeItems: string[],
  finish: string,
  holdTimeMin: number,
  adjustedBy: string,
  adjustedAt: string,
  liquorRatio = "1:10",
  tempCurve = "60℃入染→1.5℃/min升至130℃→保温"
): ProcessSnapshot {
  return {
    version,
    recipeName,
    recipeItems,
    liquorRatio,
    tempCurve,
    holdTimeMin,
    finish,
    adjustedBy,
    adjustedAt,
  };
}

function batch(
  id: string,
  orderNo: string,
  fabric: string,
  weightGsm: number,
  deltaE: number,
  review: string,
  reviewPassed: boolean,
  proc: ProcessSnapshot
): SampleBatch {
  return { id, orderNo, fabric, weightGsm, deltaE, review, reviewPassed, process: proc };
}

export const seedOrders: CustomerOrder[] = [
  {
    orderNo: "PO-2609-018",
    customer: "华澜服饰",
    product: "棉府绸 120g 衬衣面料 · 枣红",
    requiredFinish: "柔软整理 2%",
    requiredHoldMin: 30,
    batchIds: ["LAB-620A"],
  },
  {
    orderNo: "PO-2609-021",
    customer: "启程运动",
    product: "涤纶针织 160g 运动T恤 · 藏青",
    requiredFinish: "亲水柔软 1.5%",
    requiredHoldMin: 35,
    batchIds: ["LAB-621C"],
  },
  {
    orderNo: "PO-2609-024",
    customer: "木也家居",
    product: "混纺斜纹 260g 家纺 · 卡其",
    requiredFinish: "预缩+柔软 2%",
    requiredHoldMin: 40,
    batchIds: ["LAB-624B"],
  },
  {
    orderNo: "PO-2609-026",
    customer: "华澜服饰",
    product: "全棉帆布 280g 箱包布 · 墨绿",
    requiredFinish: "三防整理 30g/L",
    requiredHoldMin: 30,
    batchIds: ["LAB-626A"],
  },
  {
    orderNo: "PO-2609-031",
    customer: "南禾制服",
    product: "涤棉双面 220g 工服 · 深灰",
    requiredFinish: "免烫+柔软 2.5%",
    requiredHoldMin: 35,
    batchIds: ["LAB-631A"],
  },
  {
    orderNo: "PO-2609-034",
    customer: "启程运动",
    product: "锦纶四面弹 180g 冲锋衣里料 · 炭黑",
    requiredFinish: "吸湿排汗 2%",
    requiredHoldMin: 40,
    batchIds: [], // 缺样品批次
  },
];

export const seedBatches: SampleBatch[] = [
  // 评语通过但色差超标：不能仅凭评语排产
  batch(
    "LAB-620A",
    "PO-2609-018",
    "100% 棉府绸",
    120,
    0.84,
    "评审通过，色光与客户来样一致",
    true,
    process(
      1,
      "枣红配方 v1",
      ["活性红3BS 2.1%", "活性黄3RS 0.4%", "元明粉 40g/L"],
      "柔软整理 2%",
      30,
      "周建国",
      "2026-09-12"
    )
  ),
  // 色差+后整理+保温三项不达标
  batch(
    "LAB-621C",
    "PO-2609-021",
    "100% 涤纶针织",
    160,
    0.96,
      "升温曲线偏快，待复染",
      false,
    process(
      1,
      "藏青配方 v1",
      ["分散蓝2BLN 1.8%", "分散红玉S-5BL 0.3%", "匀染剂 1g/L"],
      "亲水柔软 1%",
      30,
      "方工",
      "2026-09-13",
      "1:12",
      "70℃入染→2.5℃/min升至130℃→保温"
    )
  ),
  // 全部达标：可放行
  batch(
    "LAB-624B",
    "PO-2609-024",
    "涤棉65/35斜纹",
    260,
    0.62,
    "客户确认中，色光认可",
    true,
    process(
      1,
      "卡其配方 v1",
      ["分散黄棕S-2RFL 0.9%", "活性黑KN-B 0.2%", "活性红3BS 0.15%"],
      "预缩+柔软 2%",
      40,
      "赵雪梅",
      "2026-09-15"
    )
  ),
  // 已有有效放行，绑定 v2 工艺
  batch(
    "LAB-626A",
    "PO-2609-026",
    "100% 棉帆布",
    280,
    0.45,
    "评审通过，各项指标合格",
    true,
    process(
      2,
      "墨绿配方 v2",
      ["活性黄3RS 1.6%", "活性蓝KN-R 1.1%", "固色碱 12g/L"],
      "三防整理 30g/L",
      35,
      "周建国",
      "2026-09-18",
      "1:8",
      "50℃入染→1.2℃/min升至100℃→保温"
    )
  ),
  // 放行绑定 v1，后配方改为 v3 → 旧放行失效，待重评
  batch(
    "LAB-631A",
    "PO-2609-031",
    "涤棉80/20双面",
    220,
    0.58,
    "评审通过，追加深灰对比样",
    true,
    process(
      3,
      "深灰配方 v3",
      ["分散黑EX-SF 2.4%", "分散橙S-4RL 0.25%", "活性黑KN-B 0.5%"],
      "免烫+柔软 2.5%",
      35,
      "方工",
      "2026-09-22",
      "1:10",
      "60℃入染→1.5℃/min升至130℃→保温"
    )
  ),
];

export const seedReleases: ProductionRelease[] = [
  {
    id: "REL-2609-006",
    orderNo: "PO-2609-026",
    batchId: "LAB-626A",
    applicant: "王海涛",
    reviewer: "孙丽华",
    submittedAt: "2026-09-19 09:20",
    batchDeltaE: 0.45,
    processSnapshot: process(
      2,
      "墨绿配方 v2",
      ["活性黄3RS 1.6%", "活性蓝KN-R 1.1%", "固色碱 12g/L"],
      "三防整理 30g/L",
      35,
      "周建国",
      "2026-09-18",
      "1:8",
      "50℃入染→1.2℃/min升至100℃→保温"
    ),
    status: "active",
  },
  {
    id: "REL-2609-003",
    orderNo: "PO-2609-031",
    batchId: "LAB-631A",
    applicant: "陈晓琳",
    reviewer: "钱明远",
    submittedAt: "2026-09-16 14:05",
    batchDeltaE: 0.58,
    processSnapshot: process(
      1,
      "深灰配方 v1",
      ["分散黑EX-SF 2.1%", "活性黑KN-B 0.4%", "匀染剂 1g/L"],
      "免烫+柔软 2.5%",
      35,
      "方工",
      "2026-09-14"
    ),
    status: "invalidated",
    invalidatedAt: "2026-09-22 10:40",
    invalidatedReason: "recipe",
    changeDetail: "配方「深灰配方 v1」→「深灰配方 v3」",
  },
];

export function buildSeedState(): LedgerState {
  const batches: Record<string, SampleBatch> = {};
  for (const item of seedBatches) {
    batches[item.id] = structuredClone(item);
  }
  return {
    orders: structuredClone(seedOrders),
    batches,
    releases: structuredClone(seedReleases),
  };
}
