import type { DyeOrder, OrderBoardGroup, ReleaseRecord } from "../domain/types";
import { classifyOrder, latestSample, MAX_DELTA_E } from "../domain/releaseRules";

interface OrderListProps {
  orders: DyeOrder[];
  releases: ReleaseRecord[];
  selectedId: string | null;
  onSelect: (orderId: string) => void;
}

const GROUP_ORDER: OrderBoardGroup[] = ["有效放行", "待重评", "缺样品批次"];

const GROUP_STYLE: Record<OrderBoardGroup, { cls: string; hint: string }> = {
  有效放行: { cls: "group-ok", hint: "放行与当前工艺版本绑定，可排大货" },
  待重评: { cls: "group-warn", hint: "从未放行，或工艺变更后原放行已失效" },
  缺样品批次: { cls: "group-bad", hint: "没有可评的小样，无法办理放行" },
};

export function OrderList({ orders, releases, selectedId, onSelect }: OrderListProps) {
  const grouped = new Map<OrderBoardGroup, DyeOrder[]>();
  for (const group of GROUP_ORDER) grouped.set(group, []);
  for (const order of orders) {
    grouped.get(classifyOrder(order, releases))!.push(order);
  }

  const validReleaseOf = (order: DyeOrder) =>
    releases.find(
      (r) =>
        r.orderId === order.id &&
        r.status === "有效" &&
        r.processVersion === order.currentProcess.version
    );

  return (
    <aside className="panel order-list">
      <div className="panel-head">
        <div>
          <p className="eyebrow">选择订单</p>
          <h2>订单投产放行</h2>
        </div>
      </div>

      {GROUP_ORDER.map((group) => {
        const list = grouped.get(group)!;
        const style = GROUP_STYLE[group];
        return (
          <div className={`order-group ${style.cls}`} key={group}>
            <div className="order-group-head">
              <span className="dot" />
              <strong>{group}</strong>
              <em>{list.length}</em>
              <small>{style.hint}</small>
            </div>
            {list.length === 0 && <p className="group-empty">暂无订单</p>}
            {list.map((order) => {
              const valid = validReleaseOf(order);
              const latest = latestSample(order);
              return (
                <button
                  key={order.id}
                  className={`order-card ${selectedId === order.id ? "selected" : ""}`}
                  onClick={() => onSelect(order.id)}
                >
                  <div className="order-card-top">
                    <b>{order.id}</b>
                    {valid && (
                      <span className="tag tag-ok">
                        放行 {valid.id.slice(-2)}
                      </span>
                    )}
                    {group === "待重评" && (
                      <span className="tag tag-warn">待重评</span>
                    )}
                    {group === "缺样品批次" && (
                      <span className="tag tag-bad">缺样品</span>
                    )}
                  </div>
                  <p className="order-card-customer">
                    {order.customer} · {order.fabric}
                  </p>
                  <p className="order-card-meta">
                    <span>V{order.currentProcess.version}</span>
                    <span>{order.quantityM.toLocaleString()} 米</span>
                    {latest ? (
                      <span className={latest.deltaE > MAX_DELTA_E ? "over" : ""}>
                        最新 ΔE {latest.deltaE.toFixed(2)}
                      </span>
                    ) : (
                      <span className="over">无样品批次</span>
                    )}
                  </p>
                </button>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
}
