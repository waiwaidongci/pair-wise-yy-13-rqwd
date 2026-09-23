import type { OrderReleaseState } from "../domain/releaseRules";
import type { ReleaseStatus } from "../domain/types";

type Tone = "green" | "amber" | "red" | "gray" | "indigo";

const TONE_CLASS: Record<Tone, string> = {
  green: "badge-green",
  amber: "badge-amber",
  red: "badge-red",
  gray: "badge-gray",
  indigo: "badge-indigo",
};

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`badge ${TONE_CLASS[tone]}`}>{children}</span>;
}

export function OrderStateBadge({ state }: { state: OrderReleaseState }) {
  switch (state) {
    case "valid":
      return <Badge tone="green">有效放行</Badge>;
    case "needsRevalidation":
      return <Badge tone="amber">待重评</Badge>;
    case "missingSample":
      return <Badge tone="red">缺样品批次</Badge>;
    default:
      return <Badge tone="gray">未放行</Badge>;
  }
}

export function ReleaseStatusBadge({ status }: { status: ReleaseStatus }) {
  return status === "active" ? (
    <Badge tone="green">有效</Badge>
  ) : (
    <Badge tone="amber">已失效 · 存档</Badge>
  );
}
