// 临时冒烟测试：存档仓储（幂等放行、工艺变更作废旧版、旧版快照保留）
class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}
(globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage();

const { ReleaseRepository } = await import("../src/archive/releaseRepository");
const repo = new ReleaseRepository();

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

const now = "2026-09-23T10:00:00+08:00";

console.log("[存档] 首次放行与拒绝");
// 宜而爽：合格订单，工艺调整人 林晓峰
const first = repo.submitRelease({
  orderId: "PO-2509-031",
  sampleBatchId: "LAB-628E",
  reviewer: "孙德胜",
  now,
});
check("合格 → created", first.kind === "created");

// 复核人 = 工艺调整人 → 拒绝（用从未放行的蓝派订单，避免命中幂等）
const badReviewer = repo.submitRelease({
  orderId: "PO-2509-026",
  sampleBatchId: "LAB-622D",
  reviewer: "陈默",
});
check("复核人等于工艺调整人 → rejected", badReviewer.kind === "rejected");
if (badReviewer.kind === "rejected") {
  check("拒绝原因包含 reviewer", badReviewer.criteria.some((c) => c.key === "reviewer" && !c.passed));
}

// 蓝派：色差 0.96、保温 40<45、后整理不同 → 三条测控失败
const lanpai = repo.submitRelease({
  orderId: "PO-2509-026",
  sampleBatchId: "LAB-624B",
  reviewer: "孙德胜",
});
check("三项不合格 → rejected", lanpai.kind === "rejected");
if (lanpai.kind === "rejected") {
  const failedKeys = lanpai.criteria.filter((c) => !c.passed).map((c) => c.key);
  check(
    "失败项 = 色差+后整理+保温",
    JSON.stringify(failedKeys.sort()) === JSON.stringify(["deltaE", "finishing", "holding"])
  );
}

// 缺样品订单
const noSample = repo.submitRelease({
  orderId: "PO-2509-034",
  sampleBatchId: "X",
  reviewer: "孙德胜",
});
check("缺样品 → no-sample", noSample.kind === "no-sample");

console.log("[存档] 重复提交幂等");
const again = repo.submitRelease({
  orderId: "PO-2509-031",
  sampleBatchId: "LAB-628E",
  reviewer: "孙德胜",
  now,
});
check("重复提交 → reused 同一张", again.kind === "reused" && again.kind === "reused" && (again as { release: { id: string } }).release.id === (first as { release: { id: string } }).release.id);
check("台账没有多出放行单", repo.getReleases().filter((r) => r.orderId === "PO-2509-031").length === 1);

console.log("[存档] 工艺变更作废旧放行");
// 森马当前 V2 有有效放行；改配方 → V3，原放行失效
const adj = repo.adjustProcess({
  orderId: "PO-2509-011",
  patch: { recipe: [{ dye: "活性红 3BS", percent: 2.0 }, { dye: "活性黄 3RS", percent: 0.7 }, { dye: "元明粉", percent: 40 }], changeNote: "加深色光" },
  updatedBy: "周绮",
  now: "2026-09-23T11:00:00+08:00",
});
check("配方调整 → changed", adj?.changed === true);
check("升版至 V3", adj?.order.currentProcess.version === 3);
check("1 张旧放行被作废", adj?.invalidated.length === 1 && adj.invalidated[0].status === "已失效");
const dead = repo.getReleases().find((r) => r.id === "REL-2509-011-01");
check("旧放行保留并标记失效原因", dead?.status === "已失效" && dead.invalidateReasons?.includes("配方变更") && dead.supersededByVersion === 3);
check("旧版工艺快照仍在放行单上", dead?.processSnapshot.version === 2 && dead.processSnapshot.recipe[0].percent === 1.8);
const hist = repo.getProcessHistory("PO-2509-011");
check("工艺版本存档含 V1/V2/V3", hist.map((h) => h.version).join(",") === "1,2,3");

console.log("[存档] 非控项调整不影响放行");
const minor = repo.adjustProcess({
  orderId: "PO-2509-031",
  patch: { liquorRatio: "1:11", changeNote: "现场微调浴比" },
  updatedBy: "林晓峰",
  now: "2026-09-23T12:00:00+08:00",
});
check("只改浴比 → 不升版", minor?.changed === false && minor.order.currentProcess.version === 1);
check("首次放行仍有效", repo.getReleases().some((r) => r.orderId === "PO-2509-031" && r.status === "有效"));

console.log("[存档] 重评后可再次放行");
const rerelease = repo.submitRelease({
  orderId: "PO-2509-011",
  sampleBatchId: "LAB-620A",
  reviewer: "孙德胜",
  now: "2026-09-23T13:00:00+08:00",
});
// LAB-620A 是 V2 工艺的样品，其配方对应旧版但测控项只看色差/后整理/保温；V3 保温未变、后整理未变 → 可放行
check("失效后重新放行 → created V3", rerelease.kind === "created" && rerelease.kind === "created" && (rerelease as { release: { processVersion: number } }).release.processVersion === 3);

console.log("[存档] 重新加载持久化");
const repo2 = new ReleaseRepository();
check("localStorage 数据被保留", repo2.getOrders().find((o) => o.id === "PO-2509-011")?.currentProcess.version === 3);

console.log(`\n存档层：${passed} 通过 / ${failed} 失败`);
if (failed > 0) process.exit(1);
