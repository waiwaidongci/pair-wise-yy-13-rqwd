import type { DyeOrder, ReleaseRecord } from "../domain/types";

/**
 * 演示数据。
 * 时间以 2026-09 为背景：
 * - 森马 / 华丰：曾放行，后者工艺改过、原放行失效待重评
 * - 蓝派：从未放行，且现有小样色差/保温不合格
 * - 宜而爽：合格待首次放行（可演示"提交"）
 * - 顶峰：缺样品批次
 */

export interface ProcessHistoryEntry {
  orderId: string;
  process: DyeOrder["currentProcess"];
}

export interface SeedData {
  orders: DyeOrder[];
  releases: ReleaseRecord[];
  processHistory: ProcessHistoryEntry[];
}

const orders: DyeOrder[] = [
    {
      id: "PO-2509-011",
      customer: "森马服饰",
      fabric: "棉府绸",
      composition: "100% 棉",
      weightGsm: 120,
      quantityM: 8600,
      currentProcess: {
        version: 2,
        recipe: [
          { dye: "活性红 3BS", percent: 1.8 },
          { dye: "活性黄 3RS", percent: 0.7 },
          { dye: "元明粉", percent: 40 },
        ],
        liquorRatio: "1:10",
        tempCurve: "60℃×35min",
        holdMinutes: 35,
        finishing: "柔软剂 20g/L 浸轧",
        updatedBy: "周绮",
        updatedAt: "2026-09-16T09:20:00+08:00",
        changeNote: "追加柔软剂用量，改善客户反馈的手感偏硬",
      },
      samples: [
        {
          id: "LAB-617F",
          processVersion: 1,
          deltaE: 0.62,
          holdMinutes: 30,
          finishing: "柔软剂 10g/L 浸轧",
          verdict: "通过",
          testedAt: "2026-09-12T15:40:00+08:00",
        },
        {
          id: "LAB-620A",
          processVersion: 2,
          deltaE: 0.48,
          holdMinutes: 35,
          finishing: "柔软剂 20g/L 浸轧",
          verdict: "通过",
          testedAt: "2026-09-17T10:05:00+08:00",
        },
      ],
    },
    {
      id: "PO-2509-018",
      customer: "华丰外贸",
      fabric: "涤纶针织",
      composition: "100% 涤纶",
      weightGsm: 180,
      quantityM: 12000,
      currentProcess: {
        version: 2,
        recipe: [
          { dye: "分散橙 E-RL", percent: 1.2 },
          { dye: "分散红玉 S-5BL", percent: 0.35 },
        ],
        liquorRatio: "1:12",
        tempCurve: "130℃×40min",
        holdMinutes: 40,
        finishing: "定型 170℃×45s",
        updatedBy: "高志远",
        updatedAt: "2026-09-19T14:10:00+08:00",
        changeNote: "大货缸差偏红光，微调分散红玉比例",
      },
      samples: [
        {
          id: "LAB-621C",
          processVersion: 1,
          deltaE: 0.55,
          holdMinutes: 40,
          finishing: "定型 170℃×45s",
          verdict: "通过",
          testedAt: "2026-09-15T11:20:00+08:00",
        },
      ],
    },
    {
      id: "PO-2509-026",
      customer: "蓝派服饰",
      fabric: "锦纶弹力布",
      composition: "82% 锦纶 / 18% 氨纶",
      weightGsm: 210,
      quantityM: 5400,
      currentProcess: {
        version: 1,
        recipe: [
          { dye: "酸性藏青 R", percent: 2.4 },
          { dye: "酸性黑 LD", percent: 0.5 },
        ],
        liquorRatio: "1:15",
        tempCurve: "98℃×45min",
        holdMinutes: 45,
        finishing: "亲水整理剂 30g/L",
        updatedBy: "陈默",
        updatedAt: "2026-09-10T08:30:00+08:00",
        changeNote: "首版工艺",
      },
      samples: [
        {
          id: "LAB-624B",
          processVersion: 1,
          deltaE: 0.96,
          holdMinutes: 40,
          finishing: "亲水整理剂 20g/L",
          verdict: "客户确认中",
          testedAt: "2026-09-18T16:45:00+08:00",
        },
        {
          id: "LAB-622D",
          processVersion: 1,
          deltaE: 1.1,
          holdMinutes: 45,
          finishing: "亲水整理剂 30g/L",
          verdict: "待复染",
          testedAt: "2026-09-14T09:30:00+08:00",
        },
      ],
    },
    {
      id: "PO-2509-031",
      customer: "宜而爽内衣",
      fabric: "莫代尔针织",
      composition: "95% 莫代尔 / 5% 氨纶",
      weightGsm: 160,
      quantityM: 9800,
      currentProcess: {
        version: 1,
        recipe: [
          { dye: "活性翠蓝 G", percent: 0.9 },
          { dye: "活性黄 3RS", percent: 0.22 },
        ],
        liquorRatio: "1:10",
        tempCurve: "60℃×30min",
        holdMinutes: 30,
        finishing: "预缩 + 柔软剂 15g/L",
        updatedBy: "林晓峰",
        updatedAt: "2026-09-17T13:00:00+08:00",
        changeNote: "首版工艺",
      },
      samples: [
        {
          id: "LAB-628E",
          processVersion: 1,
          deltaE: 0.4,
          holdMinutes: 30,
          finishing: "预缩 + 柔软剂 15g/L",
          verdict: "通过",
          testedAt: "2026-09-20T10:50:00+08:00",
        },
      ],
    },
    {
      id: "PO-2509-034",
      customer: "顶峰户外",
      fabric: "涤锦混纺冲锋衣面料",
      composition: "60% 涤纶 / 40% 锦纶",
      weightGsm: 240,
      quantityM: 15000,
      currentProcess: {
        version: 1,
        recipe: [
          { dye: "分散黑 ECT", percent: 3.1 },
          { dye: "酸性黑 LD", percent: 0.8 },
        ],
        liquorRatio: "1:12",
        tempCurve: "120℃×40min",
        holdMinutes: 40,
        finishing: "防水涂层 PU 白胶",
        updatedBy: "高志远",
        updatedAt: "2026-09-18T10:00:00+08:00",
        changeNote: "首版工艺",
      },
      samples: [],
    },
];

const releases: ReleaseRecord[] = [
    {
      id: "REL-2509-011-01",
      orderId: "PO-2509-011",
      processVersion: 2,
      processSnapshot: {
        version: 2,
        recipe: [
          { dye: "活性红 3BS", percent: 1.8 },
          { dye: "活性黄 3RS", percent: 0.7 },
          { dye: "元明粉", percent: 40 },
        ],
        liquorRatio: "1:10",
        tempCurve: "60℃×35min",
        holdMinutes: 35,
        finishing: "柔软剂 20g/L 浸轧",
        updatedBy: "周绮",
        updatedAt: "2026-09-16T09:20:00+08:00",
        changeNote: "追加柔软剂用量，改善客户反馈的手感偏硬",
      },
      sampleBatchId: "LAB-620A",
      deltaE: 0.48,
      reviewer: "孙德胜",
      releasedAt: "2026-09-17T16:00:00+08:00",
      status: "有效",
      note: "评语通过且四项测控达标，同意排产大货",
    },
    {
      id: "REL-2509-018-01",
      orderId: "PO-2509-018",
      processVersion: 1,
      processSnapshot: {
        version: 1,
        recipe: [
          { dye: "分散橙 E-RL", percent: 1.2 },
          { dye: "分散红玉 S-5BL", percent: 0.5 },
        ],
        liquorRatio: "1:12",
        tempCurve: "130℃×40min",
        holdMinutes: 40,
        finishing: "定型 170℃×45s",
        updatedBy: "高志远",
        updatedAt: "2026-09-11T09:00:00+08:00",
        changeNote: "首版工艺",
      },
      sampleBatchId: "LAB-621C",
      deltaE: 0.55,
      reviewer: "孙德胜",
      releasedAt: "2026-09-15T17:30:00+08:00",
      status: "已失效",
      invalidatedAt: "2026-09-19T14:10:00+08:00",
      invalidateReasons: ["配方变更"],
      supersededByVersion: 2,
      note: "配方调整后，原放行自动失效，需重新评样放行",
    },
];

/** 曾放行过的订单保留其全部历史工艺版本，其余订单只有当前版本 */
const processHistory: ProcessHistoryEntry[] = (() => {
  const initialVersions: ProcessHistoryEntry[] = [
    {
      orderId: "PO-2509-011",
      process: {
        version: 1,
        recipe: [
          { dye: "活性红 3BS", percent: 1.8 },
          { dye: "活性黄 3RS", percent: 0.7 },
          { dye: "元明粉", percent: 40 },
        ],
        liquorRatio: "1:10",
        tempCurve: "60℃×30min",
        holdMinutes: 30,
        finishing: "柔软剂 10g/L 浸轧",
        updatedBy: "周绮",
        updatedAt: "2026-09-10T08:00:00+08:00",
        changeNote: "首版工艺",
      },
    },
    {
      orderId: "PO-2509-018",
      process: {
        version: 1,
        recipe: [
          { dye: "分散橙 E-RL", percent: 1.2 },
          { dye: "分散红玉 S-5BL", percent: 0.5 },
        ],
        liquorRatio: "1:12",
        tempCurve: "130℃×40min",
        holdMinutes: 40,
        finishing: "定型 170℃×45s",
        updatedBy: "高志远",
        updatedAt: "2026-09-11T09:00:00+08:00",
        changeNote: "首版工艺",
      },
    },
  ];
  const currentVersions = orders
    .filter((o) => ["PO-2509-011", "PO-2509-018"].includes(o.id))
    .map((o) => ({ orderId: o.id, process: o.currentProcess }));
  return [...initialVersions, ...currentVersions];
})();

export const seedData: SeedData = {
  orders,
  releases,
  processHistory,
};
