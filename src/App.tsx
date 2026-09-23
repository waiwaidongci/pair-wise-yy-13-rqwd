import { useState } from "react";
import "./styles.css";
import { resetLedger, useLedger } from "./archive/releaseStore";
import { deriveOrderState, type OrderReleaseState } from "./domain/releaseRules";
import type { CustomerOrder } from "./domain/types";
import { OrderPicker } from "./components/OrderPicker";
import { ReleaseDesk } from "./components/ReleaseDesk";
import { ReleaseArchive } from "./components/ReleaseArchive";

const PROJECT = {
  id: "hxyfront-62012",
  port: 62012,
};

type PickerFilter = "all" | OrderReleaseState;

function App() {
  const ledger = useLedger();
  const [selectedOrderNo, setSelectedOrderNo] = useState(
    ledger.orders[0]?.orderNo ?? ""
  );
  const [filter, setFilter] = useState<PickerFilter>("all");

  const selectOrder = (orderNo: string) => {
    setSelectedOrderNo(orderNo);
  };

  const selectedOrder: CustomerOrder | undefined = ledger.orders.find(
    (order) => order.orderNo === selectedOrderNo
  ) ?? ledger.orders[0];

  const stateOf = (order: CustomerOrder) =>
    deriveOrderState(order, ledger.batches, ledger.releases);

  const validCount = ledger.orders.filter(
    (o) => stateOf(o) === "valid"
  ).length;
  const revalidationCount = ledger.orders.filter(
    (o) => stateOf(o) === "needsRevalidation"
  ).length;
  const missingCount = ledger.orders.filter(
    (o) => stateOf(o) === "missingSample"
  ).length;
  const archivedCount = ledger.releases.length;

  return (
    <main className="app">
      <section className="hero">
        <p>
          {PROJECT.id} · 小样台账 · Port {PROJECT.port}
        </p>
        <h1>订单投产放行</h1>
        <span>
          业务员凭一张通过评语直接排大货、配方改后生产线分不清放行对应哪版工艺——
          本台账将放行绑定订单与当前工艺版本：色差 ΔE 不超过 0.8、后整理一致、保温达标、
          复核人不同于工艺调整人方可放行；重复提交沿用首次放行，配方 / 后整理 / 保温时间
          变更后原放行失效、旧版存档可查。
        </span>
      </section>

      <section className="rule-bar panel">
        <div className="rule-bar-title">
          <span className="rule-key">放行规则</span>
          <small>规则层独立判定，页面只负责执行与呈现</small>
        </div>
        <div className="rule-chips">
          <span className="rule-chip">色差 ΔE ≤ 0.8</span>
          <span className="rule-chip">后整理与订单要求一致</span>
          <span className="rule-chip">保温时间达标</span>
          <span className="rule-chip">复核人 ≠ 工艺调整人</span>
          <span className="rule-chip">放行绑定订单 + 当前工艺快照</span>
          <span className="rule-chip">重复提交沿用首次</span>
          <span className="rule-chip">配方 / 后整理 / 保温变更 → 原放行失效</span>
        </div>
      </section>

      <section className="metrics">
        <article>
          <small>客户订单</small>
          <strong>{ledger.orders.length}</strong>
        </article>
        <article>
          <small>有效放行</small>
          <strong className="num-green">{validCount}</strong>
        </article>
        <article>
          <small>待重评</small>
          <strong className="num-amber">{revalidationCount}</strong>
        </article>
        <article>
          <small>缺样品批次</small>
          <strong className="num-red">{missingCount}</strong>
        </article>
        <article>
          <small>放行单存档（含旧版）</small>
          <strong>{archivedCount}</strong>
        </article>
      </section>

      <section className="workspace">
        <aside className="panel picker-panel">
          <div className="heading">
            <div>
              <p>选择订单</p>
              <h2>客户订单</h2>
            </div>
          </div>
          <OrderPicker
            orders={ledger.orders}
            batchById={ledger.batches}
            releases={ledger.releases}
            selectedOrderNo={selectedOrder?.orderNo ?? ""}
            onSelect={selectOrder}
            filter={filter}
            onFilterChange={setFilter}
          />
        </aside>

        {selectedOrder && (
          <div className="desk-column">
            <ReleaseDesk
              key={selectedOrder.orderNo}
              order={selectedOrder}
              batchById={ledger.batches}
              releases={ledger.releases}
            />
          </div>
        )}
      </section>

      {selectedOrder && (
        <ReleaseArchive
          releases={ledger.releases}
          orderNo={selectedOrder.orderNo}
          customer={selectedOrder.customer}
          product={selectedOrder.product}
        />
      )}

      <footer className="page-footer">
        <span>
          分层：规则（releaseRules）· 存档（seedData / releaseStore）·
          页面（components）各司其职
        </span>
        <button onClick={() => resetLedger()}>恢复演示台账</button>
      </footer>
    </main>
  );
}

export default App;
