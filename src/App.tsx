import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import { useReleaseBoard } from "./components/useReleaseBoard";
import { OrderList } from "./components/OrderList";
import { OrderDetail } from "./components/OrderDetail";
import { classifyOrder } from "./domain/releaseRules";

function App() {
  const board = useReleaseBoard();
  const [selectedId, setSelectedId] = useState<string | null>(
    board.orders[0]?.id ?? null
  );
  const [detailNotice, setDetailNotice] = useState<{
    id: number;
    tone: "error" | "warn";
    text: string;
  } | null>(null);

  const selectedOrder = useMemo(
    () => board.orders.find((o) => o.id === selectedId) ?? null,
    [board.orders, selectedId]
  );

  const processHistory = useMemo(
    () => (selectedOrder ? board.getProcessHistory(selectedOrder.id) : []),
    // 订单或台账变化后重新取版本存档
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedId, board.orders]
  );

  useEffect(() => {
    if (detailNotice) {
      const t = setTimeout(() => setDetailNotice(null), 5000);
      return () => clearTimeout(t);
    }
  }, [detailNotice]);

  const counts = useMemo(() => {
    const c = { 有效放行: 0, 待重评: 0, 缺样品批次: 0 } as Record<string, number>;
    for (const o of board.orders) c[classifyOrder(o, board.releases)] += 1;
    return c;
  }, [board.orders, board.releases]);

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">hxyfront-62012 · 纺织染整小样台账</p>
          <h1>订单投产放行</h1>
          <p className="subtitle">
            放行绑定订单与当前工艺；色差 ≤ 0.8、后整理一致、保温达标，复核人不同于工艺调整人。
            工艺（配方 / 后整理 / 保温）变更后原放行自动失效，旧版留档可查。
          </p>
        </div>
        <div className="topbar-stats">
          <div className="stat stat-ok"><b>{counts["有效放行"]}</b><span>有效放行</span></div>
          <div className="stat stat-warn"><b>{counts["待重评"]}</b><span>待重评</span></div>
          <div className="stat stat-bad"><b>{counts["缺样品批次"]}</b><span>缺样品批次</span></div>
          <button className="btn-link" onClick={board.resetDemo}>恢复演示数据</button>
        </div>
      </header>

      {board.banner && (
        <div className={`banner banner-${board.banner.tone}`}>
          <span>{board.banner.tone === "error" ? "✕" : board.banner.tone === "warn" ? "!" : "✓"}</span>
          <p>{board.banner.text}</p>
          <button onClick={() => board.setBanner(null)}>×</button>
        </div>
      )}

      <div className="layout">
        <OrderList
          orders={board.orders}
          releases={board.releases}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <section className="detail-pane">
          {detailNotice && (
            <div className={`banner banner-${detailNotice.tone} banner-inline`}>
              <span>{detailNotice.tone === "error" ? "✕" : "!"}</span>
              <p>{detailNotice.text}</p>
              <button onClick={() => setDetailNotice(null)}>×</button>
            </div>
          )}
          {selectedOrder ? (
            <OrderDetail
              key={selectedOrder.id}
              order={selectedOrder}
              releases={board.releases}
              processHistory={processHistory}
              onSubmitRelease={board.submitRelease}
              onAdjustProcess={board.adjustProcess}
              onNotice={(text, tone) =>
                setDetailNotice({ id: Date.now(), tone, text })
              }
            />
          ) : (
            <div className="panel empty-state">请选择左侧订单</div>
          )}
        </section>
      </div>
    </main>
  );
}

export default App;
