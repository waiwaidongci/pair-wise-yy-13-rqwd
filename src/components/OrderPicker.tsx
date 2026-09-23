import type { CustomerOrder, SampleBatch } from "../domain/types";
import {
  deriveOrderState,
  latestBatchOf,
  type OrderReleaseState,
} from "../domain/releaseRules";
import { OrderStateBadge } from "./StatusBadge";

type Filter = "all" | OrderReleaseState;

const FILTER_TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部订单" },
  { key: "valid", label: "有效放行" },
  { key: "needsRevalidation", label: "待重评" },
  { key: "missingSample", label: "缺样品批次" },
  { key: "notReleased", label: "未放行" },
];

export function OrderPicker(props: {
  orders: CustomerOrder[];
  batchById: Record<string, SampleBatch>;
  releases: import("../domain/types").ProductionRelease[];
  selectedOrderNo: string;
  onSelect: (orderNo: string) => void;
  filter: Filter;
  onFilterChange: (filter: Filter) => void;
}) {
  const { orders, batchById, releases, selectedOrderNo, onSelect } = props;

  const countOf = (state: OrderReleaseState) =>
    orders.filter(
      (order) => deriveOrderState(order, batchById, releases) === state
    ).length;

  const counts: Partial<Record<Filter, number>> = {
    valid: countOf("valid"),
    needsRevalidation: countOf("needsRevalidation"),
    missingSample: countOf("missingSample"),
    notReleased: countOf("notReleased"),
  };

  return (
    <div className="order-picker">
      <div className="picker-tabs">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            className={props.filter === tab.key ? "tab active" : "tab"}
            onClick={() => props.onFilterChange(tab.key)}
          >
            {tab.label}
            {counts[tab.key] !== undefined && (
              <em className="tab-count">{counts[tab.key]}</em>
            )}
          </button>
        ))}
      </div>

      <div className="order-list">
        {orders
          .filter((order) => {
            if (props.filter === "all") return true;
            return deriveOrderState(order, batchById, releases) === props.filter;
          })
          .map((order) => {
            const state = deriveOrderState(order, batchById, releases);
            const latest = latestBatchOf(order, batchById);
            const active = order.orderNo === selectedOrderNo;
            return (
              <button
                key={order.orderNo}
                className={active ? "order-item selected" : "order-item"}
                onClick={() => onSelect(order.orderNo)}
              >
                <div className="order-item-top">
                  <strong>{order.orderNo}</strong>
                  <OrderStateBadge state={state} />
                </div>
                <span className="order-item-customer">{order.customer}</span>
                <span className="order-item-product">{order.product}</span>
                <span className="order-item-meta">
                  {latest
                    ? `最新小样 ${latest.id} · ΔE ${latest.deltaE} · 工艺 v${latest.process.version}`
                    : "尚无样品批次，无法提交放行"}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
