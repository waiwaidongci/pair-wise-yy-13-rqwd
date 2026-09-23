class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}
(globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage();
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import App from "../src/App";

const html = renderToStaticMarkup(React.createElement(App));
const checks: [string, boolean][] = [
  ["标题", html.includes("订单投产放行")],
  ["三组分类", html.includes("有效放行") && html.includes("待重评") && html.includes("缺样品批次")],
  ["默认订单的有效放行单号", html.includes("REL-2509-011-01")],
  ["缺样品订单", html.includes("PO-2509-034")],
  ["色差规则", html.includes("0.8")],
  ["复核人规则", html.includes("工艺调整人")],
  ["工艺调整面板", html.includes("工艺调整")],
  ["历史放行", html.includes("历史放行")],
];
let fail = 0;
for (const [name, ok] of checks) {
  console.log(ok ? `  ✓ 渲染包含 ${name}` : `  ✕ 渲染缺少 ${name}`);
  if (!ok) fail++;
}
console.log(`HTML 长度 ${html.length}`);
process.exit(fail ? 1 : 0);
