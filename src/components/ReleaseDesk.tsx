import { useState } from "react";
import type {
  CustomerOrder,
  ProcessField,
  ProductionRelease,
  SampleBatch,
} from "../domain/types";
import {
  evaluateReleaseChecks,
  getActiveRelease,
  MAX_DELTA_E,
  FIELD_LABELS,
} from "../domain/releaseRules";
import {
  adjustProcess,
  submitRelease,
  type AdjustResult,
  type SubmitResult,
} from "../archive/releaseStore";
import { STAFF } from "../archive/seedData";
import { RuleChecklist } from "./RuleChecklist";
import { ReleaseStatusBadge } from "./StatusBadge";

export function ReleaseDesk(props: {
  order: CustomerOrder;
  batchById: Record<string, SampleBatch>;
  releases: ProductionRelease[];
}) {
  const { order, batchById, releases } = props;

  const orderBatches = order.batchIds
    .map((id) => batchById[id])
    .filter(Boolean);

  const [batchId, setBatchId] = useState<string>(
    orderBatches.length > 0 ? orderBatches[orderBatches.length - 1].id : ""
  );
  const batch = orderBatches.find((item) => item.id === batchId);

  const [applicant, setApplicant] = useState(STAFF.sales[0]);
  const [reviewer, setReviewer] = useState("");
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

  const [adjustField, setAdjustField] = useState<ProcessField>("recipe");
  const [recipeName, setRecipeName] = useState("");
  const [recipeItemsText, setRecipeItemsText] = useState("");
  const [finish, setFinish] = useState("");
  const [holdText, setHoldText] = useState("");
  const [adjustMsg, setAdjustMsg] = useState<AdjustResult | null>(null);

  const active = getActiveRelease(order.orderNo, releases);
  const lastInvalidated = releases
    .filter((r) => r.orderNo === order.orderNo && r.status === "invalidated")
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];

  const liveChecks = batch
    ? evaluateReleaseChecks({ order, batch, reviewer })
    : [];

  const reviewerOptions = Array.from(
    new Set(
      batch
        ? [...STAFF.reviewers, batch.process.adjustedBy]
        : STAFF.reviewers
    )
  );

  function handleSubmit() {
    if (!batch) return;
    const result = submitRelease({ order, batch, applicant, reviewer });
    setSubmitResult(result);
  }

  function handleAdjust() {
    if (!batch) return;
    const result = adjustProcess({
      batch,
      field: adjustField,
      recipeName:
        adjustField === "recipe" && recipeName.trim()
          ? recipeName.trim()
          : undefined,
      recipeItemsText:
        adjustField === "recipe" && recipeItemsText.trim()
          ? recipeItemsText
          : undefined,
      finish:
        adjustField === "finish" && finish.trim() ? finish.trim() : undefined,
      holdTimeMin:
        adjustField === "holdTime" && holdText.trim()
          ? Number(holdText)
          : undefined,
    });
    setAdjustMsg(result);
    if (result.changed) {
      setSubmitResult(null);
      setRecipeName("");
      setRecipeItemsText("");
      setFinish("");
      setHoldText("");
    }
  }

  return (
    <section className="panel desk-panel">
      <div className="heading">
        <div>
          <p>订单投产放行</p>
          <h2>
            {order.orderNo} · {order.customer}
          </h2>
        </div>
        {active ? <ReleaseStatusBadge status="active" /> : null}
      </div>

      <p className="order-product">{order.product}</p>
      <div className="order-requirements">
        <span>订单要求后整理：<em>{order.requiredFinish}</em></span>
        <span>工艺要求保温：<em>≥ {order.requiredHoldMin} 分钟</em></span>
      </div>

      {orderBatches.length === 0 && (
        <div className="notice notice-red">
          <strong>缺样品批次</strong>
          <p>
            该订单尚未登记任何小样批次，没有放行依据。请先完成打样、录入
            Lab 色差与评审结果后，再提交投产放行。
          </p>
        </div>
      )}

      {orderBatches.length > 1 && batch && (
        <label className="batch-switch">
          <span>选择小样批次</span>
          <select value={batch.id} onChange={(e) => {
            setBatchId(e.target.value);
            setSubmitResult(null);
            setAdjustMsg(null);
          }}>
            {orderBatches.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id}（v{item.process.version} · ΔE {item.deltaE}）
              </option>
            ))}
          </select>
        </label>
      )}

      {batch && active && (
        <div className="notice notice-green">
          <div className="notice-head">
            <strong>已有有效放行：{active.id}</strong>
            <span>{active.submittedAt}</span>
          </div>
          <p>
            放行绑定工艺 <em>{active.processSnapshot.recipeName} · v{active.processSnapshot.version}</em>
            ，放行小样 {active.batchId}（ΔE {active.batchDeltaE}），复核人
            {active.reviewer}。生产线按此版本工艺执行。
          </p>
          <p className="notice-sub">
            重复提交沿用首次放行，不重复出具；配方 / 后整理 / 保温时间变更后，该放行自动失效，须重新核验。
          </p>
        </div>
      )}

      {batch && !active && lastInvalidated && (
        <div className="notice notice-amber">
          <strong>
            待重评：原放行 {lastInvalidated.id} 已失效
          </strong>
          <p>
            失效原因：
            <em>
              {lastInvalidated.invalidatedReason
                ? FIELD_LABELS[lastInvalidated.invalidatedReason]
                : "工艺"}
              变更
            </em>
            （{lastInvalidated.changeDetail}，{lastInvalidated.invalidatedAt}）。
            当前工艺 v{batch.process.version} 需重新核验通过后方可排产，旧版在下方存档可查。
          </p>
        </div>
      )}

      {batch && (
        <>
          <article className="batch-card">
            <div className="batch-card-head">
              <div>
                <h3>{batch.id} 小样台账</h3>
                <span
                  className={
                    batch.reviewPassed ? "review-pass" : "review-fail"
                  }
                >
                  评语{batch.reviewPassed ? "通过" : "未通过"}：{batch.review}
                </span>
              </div>
              <span
                className={
                  batch.deltaE > MAX_DELTA_E ? "delta delta-over" : "delta"
                }
              >
                ΔE {batch.deltaE}
              </span>
            </div>

            <dl className="process-grid">
              <div>
                <dt>面料成分 / 克重</dt>
                <dd>{batch.fabric} · {batch.weightGsm} g/m²</dd>
              </div>
              <div>
                <dt>当前工艺版本</dt>
                <dd>
                  {batch.process.recipeName} · v{batch.process.version}
                </dd>
              </div>
              <div className="span-2">
                <dt>染料配方</dt>
                <dd>{batch.process.recipeItems.join("；")}</dd>
              </div>
              <div>
                <dt>浴比</dt>
                <dd>{batch.process.liquorRatio}</dd>
              </div>
              <div>
                <dt>温度曲线</dt>
                <dd>{batch.process.tempCurve}</dd>
              </div>
              <div>
                <dt>保温时间</dt>
                <dd>{batch.process.holdTimeMin} 分钟</dd>
              </div>
              <div>
                <dt>后整理方式</dt>
                <dd>{batch.process.finish}</dd>
              </div>
              <div className="span-2">
                <dt>工艺调整人 / 时间</dt>
                <dd>
                  {batch.process.adjustedBy} · {batch.process.adjustedAt}
                </dd>
              </div>
            </dl>
            <p className="warn-line">
              评语通过不代表可直接排大货：投产放行以本卡下方四项核验为准，放行单绑定当前工艺版本。
            </p>
          </article>

          {!active && (
            <div className="action-grid">
              {/* 放行提交 */}
              <article className="action-card">
                <h3>提交放行核验</h3>
                <div className="form-row">
                  <label>
                    <span>业务员</span>
                    <select
                      value={applicant}
                      onChange={(e) => setApplicant(e.target.value)}
                    >
                      {STAFF.sales.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>复核人</span>
                    <select
                      value={reviewer}
                      onChange={(e) => {
                        setReviewer(e.target.value);
                        setSubmitResult(null);
                      }}
                    >
                      <option value="">请选择复核人</option>
                      {reviewerOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <p className="block-label">
                  放行规则实时核验
                  <small>
                    （当前工艺调整人：{batch.process.adjustedBy}，复核人不可为同一人）
                  </small>
                </p>
                <RuleChecklist checks={liveChecks} />

                <button
                  className="primary full"
                  onClick={handleSubmit}
                  disabled={reviewer === ""}
                >
                  提交订单投产放行
                </button>

                {submitResult && (
                  <div
                    className={
                      submitResult.outcome === "rejected"
                        ? "submit-feedback fail"
                        : "submit-feedback pass"
                    }
                  >
                    <p>{submitResult.message}</p>
                    {submitResult.outcome === "rejected" && (
                      <RuleChecklist checks={submitResult.checks} />
                    )}
                  </div>
                )}
              </article>

              {/* 工艺调整 */}
              <article className="action-card">
                <h3>调整工艺（会重新校验放行）</h3>
                <label className="block-field">
                  <span>变更项</span>
                  <select
                    value={adjustField}
                    onChange={(e) => {
                      setAdjustField(e.target.value as ProcessField);
                      setAdjustMsg(null);
                    }}
                  >
                    <option value="recipe">配方变更</option>
                    <option value="finish">后整理变更</option>
                    <option value="holdTime">保温时间变更</option>
                  </select>
                </label>

                {adjustField === "recipe" && (
                  <>
                    <label className="block-field">
                      <span>新配方名称（当前：{batch.process.recipeName}）</span>
                      <input
                        placeholder="如：枣红配方 v2"
                        value={recipeName}
                        onChange={(e) => setRecipeName(e.target.value)}
                      />
                    </label>
                    <label className="block-field">
                      <span>新配方明细（每行一项，留空则保留原明细）</span>
                      <textarea
                        rows={4}
                        placeholder={"活性红3BS 2.3%\n活性黄3RS 0.5%"}
                        value={recipeItemsText}
                        onChange={(e) => setRecipeItemsText(e.target.value)}
                      />
                    </label>
                  </>
                )}

                {adjustField === "finish" && (
                  <label className="block-field">
                    <span>新后整理方式（当前：{batch.process.finish}）</span>
                    <input
                      placeholder={`订单要求：${order.requiredFinish}`}
                      value={finish}
                      onChange={(e) => setFinish(e.target.value)}
                    />
                  </label>
                )}

                {adjustField === "holdTime" && (
                  <label className="block-field">
                    <span>新保温时间（分钟，当前 {batch.process.holdTimeMin}）</span>
                    <input
                      type="number"
                      min={0}
                      placeholder={`订单要求 ≥ ${order.requiredHoldMin}`}
                      value={holdText}
                      onChange={(e) => setHoldText(e.target.value)}
                    />
                  </label>
                )}

                <button className="full" onClick={handleAdjust}>
                  保存工艺调整（升版 v{batch.process.version + 1}）
                </button>
                <p className="block-hint">
                  保存后配方 / 后整理 / 保温时间的变更将使该订单现有放行失效；其他字段（浴比、温度曲线）变更不影响放行。
                </p>
                {adjustMsg && (
                  <div
                    className={
                      adjustMsg.changed
                        ? adjustMsg.invalidatedReleaseId
                          ? "submit-feedback warn"
                          : "submit-feedback pass"
                        : "submit-feedback fail"
                    }
                  >
                    {adjustMsg.message}
                  </div>
                )}
              </article>
            </div>
          )}
        </>
      )}
    </section>
  );
}
