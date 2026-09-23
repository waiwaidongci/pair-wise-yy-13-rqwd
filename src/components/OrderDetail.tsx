import type {
  DyeOrder,
  ProcessSpec,
  ReleaseRecord,
  SampleBatch,
} from "../domain/types";
import { MAX_DELTA_E } from "../domain/releaseRules";
import { formatDateTime, recipeText } from "./format";
import { ReleasePanel } from "./ReleasePanel";
import { ProcessAdjustForm } from "./ProcessAdjustForm";
import { HistoryPanels } from "./HistoryPanels";
import type { SubmitOutcome, AdjustOutcome } from "../archive/releaseRepository";

type AdjustPatch = Partial<
  Pick<
    ProcessSpec,
    "recipe" | "liquorRatio" | "tempCurve" | "holdMinutes" | "finishing" | "changeNote"
  >
>;

interface OrderDetailProps {
  order: DyeOrder;
  releases: ReleaseRecord[];
  processHistory: ProcessSpec[];
  onSubmitRelease: (input: {
    orderId: string;
    sampleBatchId: string;
    reviewer: string;
    note?: string;
  }) => SubmitOutcome;
  onAdjustProcess: (input: {
    orderId: string;
    patch: AdjustPatch;
    updatedBy: string;
  }) => AdjustOutcome | undefined;
  onNotice: (text: string, tone: "error" | "warn") => void;
}

function SampleTable({ samples, requiredHold, processFinishing }: {
  samples: SampleBatch[];
  requiredHold: number;
  processFinishing: string;
}) {
  return (
    <section className="panel subpanel">
      <div className="subpanel-head">
        <h3>小样批次</h3>
        <span className="tag">{samples.length} 批</span>
      </div>
      {samples.length === 0 ? (
        <p className="muted">暂无样品批次，无法办理放行。</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>批次号</th>
              <th>对样工艺</th>
              <th>色差 ΔE</th>
              <th>保温</th>
              <th>后整理</th>
              <th>评语</th>
              <th>测试时间</th>
            </tr>
          </thead>
          <tbody>
            {[...samples]
              .sort((a, b) => b.testedAt.localeCompare(a.testedAt))
              .map((s) => {
                const deOk = s.deltaE <= MAX_DELTA_E;
                const holdOk = s.holdMinutes >= requiredHold;
                const finOk = s.finishing.trim() === processFinishing.trim();
                return (
                  <tr key={s.id}>
                    <td><b>{s.id}</b></td>
                    <td>V{s.processVersion}</td>
                    <td className={deOk ? "num-ok" : "num-bad"}>
                      {s.deltaE.toFixed(2)} {deOk ? "✓" : `> ${MAX_DELTA_E}`}
                    </td>
                    <td className={holdOk ? "num-ok" : "num-bad"}>
                      {s.holdMinutes}min {holdOk ? "✓" : "✕"}
                    </td>
                    <td className={finOk ? "num-ok" : "num-bad"}>
                      {s.finishing} {finOk ? "✓" : "不一致"}
                    </td>
                    <td>{s.verdict}</td>
                    <td>{formatDateTime(s.testedAt)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function OrderDetail({
  order,
  releases,
  processHistory,
  onSubmitRelease,
  onAdjustProcess,
  onNotice,
}: OrderDetailProps) {
  const orderReleases = releases
    .filter((r) => r.orderId === order.id)
    .sort((a, b) => a.releasedAt.localeCompare(b.releasedAt));
  const p = order.currentProcess;

  return (
    <div className="detail-scroll">
      <section className="panel order-hero">
        <div>
          <p className="eyebrow">{order.customer}</p>
          <h2>{order.id} · {order.fabric}</h2>
        </div>
        <div className="order-hero-meta">
          <div><small>成分 / 克重</small><b>{order.composition} · {order.weightGsm}g/m²</b></div>
          <div><small>订单数量</small><b>{order.quantityM.toLocaleString()} 米</b></div>
          <div><small>工艺版本</small><b>V{p.version}（{p.updatedBy} 调整）</b></div>
        </div>
        <div className="process-summary">
          <p><span>配方</span>{recipeText(p.recipe)}</p>
          <p><span>浴比 / 曲线</span>{p.liquorRatio} · {p.tempCurve}</p>
          <p><span>保温 / 后整理</span>{p.holdMinutes}min · {p.finishing}</p>
        </div>
      </section>

      <SampleTable
        samples={order.samples}
        requiredHold={p.holdMinutes}
        processFinishing={p.finishing}
      />

      <ReleasePanel
        order={order}
        releases={orderReleases}
        onSubmit={onSubmitRelease}
        onNotice={onNotice}
      />

      <ProcessAdjustForm order={order} onAdjust={onAdjustProcess} />

      <HistoryPanels
        releases={orderReleases}
        processHistory={processHistory}
        currentVersion={p.version}
      />
    </div>
  );
}
