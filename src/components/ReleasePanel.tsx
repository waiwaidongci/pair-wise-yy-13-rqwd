import { useEffect, useMemo, useState } from "react";
import type {
  DyeOrder,
  ReleaseRecord,
} from "../domain/types";
import {
  evaluateRelease,
  latestSample,
  MAX_DELTA_E,
} from "../domain/releaseRules";
import type { SubmitOutcome } from "../archive/releaseRepository";
import { formatDateTime } from "./format";

interface ReleasePanelProps {
  order: DyeOrder;
  releases: ReleaseRecord[];
  onSubmit: (input: {
    orderId: string;
    sampleBatchId: string;
    reviewer: string;
    note?: string;
  }) => SubmitOutcome;
  onNotice: (text: string, tone: "error" | "warn") => void;
}

export function ReleasePanel({ order, releases, onSubmit, onNotice }: ReleasePanelProps) {
  const defaultSample = latestSample(order);
  const [sampleId, setSampleId] = useState(defaultSample?.id ?? "");
  const [reviewer, setReviewer] = useState("");
  const [note, setNote] = useState("");

  // 切换订单后重置为该订单的最新小样
  useEffect(() => {
    setSampleId(latestSample(order)?.id ?? "");
    setReviewer("");
    setNote("");
  }, [order.id]);

  const active = releases.find(
    (r) =>
      r.orderId === order.id &&
      r.status === "有效" &&
      r.processVersion === order.currentProcess.version
  );

  const sample = order.samples.find((s) => s.id === sampleId);

  const evaluation = useMemo(() => {
    if (!sample) return null;
    return evaluateRelease(order, sample, reviewer);
  }, [order, sample, reviewer]);

  if (order.samples.length === 0) {
    return (
      <section className="panel subpanel">
        <div className="subpanel-head">
          <h3>投产放行</h3>
          <span className="tag tag-bad">缺样品批次</span>
        </div>
        <p className="muted">
          该订单尚无任何小样批次，无法核对色差、后整理与保温数据。请先安排实验室打样。
        </p>
      </section>
    );
  }

  if (active) {
    return (
      <section className="panel subpanel">
        <div className="subpanel-head">
          <h3>投产放行</h3>
          <span className="tag tag-ok">有效放行 · V{active.processVersion}</span>
        </div>
        <div className="active-release">
          <p>
            放行单 <b>{active.id}</b> 已绑定当前工艺 V{active.processVersion} 与样品批次{" "}
            <b>{active.sampleBatchId}</b>（ΔE {active.deltaE.toFixed(2)}），复核人{" "}
            {active.reviewer}，{formatDateTime(active.releasedAt)} 放行。
          </p>
          <p className="muted">
            生产线按此工艺排产即可。重复点"提交放行"将沿用本张首次放行，不会生成新单。
          </p>
          <button
            className="btn-secondary"
            onClick={() => {
              const outcome = onSubmit({
                orderId: order.id,
                sampleBatchId: active.sampleBatchId,
                reviewer: active.reviewer,
                note,
              });
              if (outcome.kind === "reused") {
                onNotice(`已沿用首次放行 ${outcome.release.id}`, "warn");
              }
            }}
          >
            重复提交（沿用首次放行）
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel subpanel">
      <div className="subpanel-head">
        <h3>投产放行</h3>
        <span className="tag tag-warn">待重评</span>
      </div>

      <div className="form-row">
        <label>
          <span>放行小样批次</span>
          <select value={sampleId} onChange={(e) => setSampleId(e.target.value)}>
            {order.samples.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}（V{s.processVersion} · ΔE {s.deltaE.toFixed(2)} ·{" "}
                {s.verdict}）
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>放行复核人</span>
          <input
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            placeholder={`不得为工艺调整人「${order.currentProcess.updatedBy}」`}
          />
        </label>
      </div>

      {evaluation && (
        <ul className="criteria">
          {evaluation.criteria.map((c) => (
            <li key={c.key} className={c.passed ? "pass" : "fail"}>
              <span className="criteria-icon">{c.passed ? "✓" : "✕"}</span>
              <div>
                <b>{c.label}</b>
                <small>{c.detail}</small>
              </div>
            </li>
          ))}
        </ul>
      )}

      <label className="full-label">
        <span>放行意见（可选）</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="如：同意按当前工艺排产大货" />
      </label>

      <div className="submit-row">
        <button
          className="btn-primary"
          disabled={!evaluation?.passed}
          onClick={() => {
            if (!sample) return;
            const outcome = onSubmit({
              orderId: order.id,
              sampleBatchId: sample.id,
              reviewer,
              note,
            });
            if (outcome.kind === "rejected") {
              onNotice("测控项未全部达标，已拒绝放行", "error");
            } else if (outcome.kind === "created") {
              setReviewer("");
              setNote("");
            }
          }}
        >
          提交放行（绑定订单 + 当前工艺 V{order.currentProcess.version}）
        </button>
        {!evaluation?.passed && (
          <small className="submit-hint">
            色差需 ≤ {MAX_DELTA_E.toFixed(1)}、后整理一致、保温达标，且复核人不同于工艺调整人
          </small>
        )}
      </div>
    </section>
  );
}
