// 临时冒烟测试：验证放行规则与存档行为，不随应用打包
import { evaluateRelease, diffProcess, bumpProcess, classifyOrder, latestSample } from "../src/domain/releaseRules";
import type { DyeOrder } from "../src/domain/types";

function makeOrder(overrides: Partial<DyeOrder> = {}): DyeOrder {
  return {
    id: "T-1",
    customer: "测试客户",
    fabric: "测试布",
    composition: "棉",
    weightGsm: 100,
    quantityM: 1000,
    currentProcess: {
      version: 1,
      recipe: [{ dye: "红", percent: 1 }],
      liquorRatio: "1:10",
      tempCurve: "60℃×30min",
      holdMinutes: 30,
      finishing: "柔软",
      updatedBy: "工艺员甲",
      updatedAt: "2026-09-01T00:00:00+08:00",
      changeNote: "首版",
    },
    samples: [
      {
        id: "S-1",
        processVersion: 1,
        deltaE: 0.5,
        holdMinutes: 30,
        finishing: "柔软",
        verdict: "通过",
        testedAt: "2026-09-02T00:00:00+08:00",
      },
    ],
    ...overrides,
  };
}

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✕ ${name}`);
  }
}

console.log("[规则] 测控四项");
const order = makeOrder();
const ok = evaluateRelease(order, order.samples[0], "复核乙");
check("全部达标时通过", ok.passed && ok.criteria.every((c) => c.passed));

const over = evaluateRelease(order, { ...order.samples[0], deltaE: 0.81 }, "复核乙");
check("色差 0.81 不通过", !over.passed && !over.criteria[0].passed);
const boundary = evaluateRelease(order, { ...order.samples[0], deltaE: 0.8 }, "复核乙");
check("色差 0.8 临界通过", boundary.passed);
const finDiff = evaluateRelease(order, { ...order.samples[0], finishing: "预缩" }, "复核乙");
check("后整理不一致不通过", !finDiff.criteria[1].passed);
const holdLow = evaluateRelease(order, { ...order.samples[0], holdMinutes: 29 }, "复核乙");
check("保温 29 < 30 不通过", !holdLow.criteria[2].passed);
const holdEq = evaluateRelease(order, { ...order.samples[0], holdMinutes: 30 }, "复核乙");
check("保温 30 = 30 达标", holdEq.criteria[2].passed);
const sameReviewer = evaluateRelease(order, order.samples[0], "工艺员甲");
check("复核人=调整人不通过", !sameReviewer.criteria[3].passed);
const blankReviewer = evaluateRelease(order, order.samples[0], "  ");
check("复核人为空不通过", !blankReviewer.criteria[3].passed);

console.log("[规则] 工艺变更检测");
const p = order.currentProcess;
check("配方改 → 配方变更", diffProcess(p, { ...p, recipe: [{ dye: "红", percent: 2 }] }).reasons.includes("配方变更"));
check("后整理改 → 后整理变更", diffProcess(p, { ...p, finishing: "防水" }).reasons.includes("后整理变更"));
check("保温改 → 保温时间变更", diffProcess(p, { ...p, holdMinutes: 40 }).reasons.includes("保温时间变更"));
check("只改浴比/曲线 → 无控项变更", !diffProcess(p, { ...p, liquorRatio: "1:20", tempCurve: "90℃×10min" }).changed);

console.log("[规则] 升版逻辑");
const bumped = bumpProcess(p, { holdMinutes: 40 }, "工艺员甲", "2026-09-03T00:00:00+08:00");
check("控项变更 → 版本 +1", bumped.next.version === 2);
const notBumped = bumpProcess(p, { liquorRatio: "1:20" }, "工艺员甲", "2026-09-03T00:00:00+08:00");
check("非控项变更 → 版本不变", notBumped.next.version === 1);

console.log("[规则] 订单分组");
check("无样品 → 缺样品批次", classifyOrder(makeOrder({ samples: [] }), []) === "缺样品批次");
check("无放行 → 待重评", classifyOrder(order, []) === "待重评");
const validRel = {
  id: "R-1", orderId: "T-1", processVersion: 1,
  processSnapshot: p, sampleBatchId: "S-1", deltaE: 0.5,
  reviewer: "复核乙", releasedAt: "2026-09-02T12:00:00+08:00", status: "有效" as const,
};
check("有效放行版本匹配 → 有效放行", classifyOrder(order, [validRel]) === "有效放行");
const v2Order = makeOrder({ currentProcess: { ...p, version: 2, holdMinutes: 40 } });
check("放行版本落后 → 待重评（防御）", classifyOrder(v2Order, [validRel]) === "待重评");

console.log("[规则] 默认小样取最新");
const multi = makeOrder({
  samples: [
    { ...order.samples[0], id: "OLD", testedAt: "2026-09-01T00:00:00+08:00" },
    { ...order.samples[0], id: "NEW", testedAt: "2026-09-10T00:00:00+08:00" },
  ],
});
check("latestSample 取测试时间最新", latestSample(multi)?.id === "NEW");

console.log(`\n规则层：${passed} 通过 / ${failed} 失败`);
if (failed > 0) process.exit(1);
