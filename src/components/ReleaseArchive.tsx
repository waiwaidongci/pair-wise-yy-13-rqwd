import type { ProductionRelease } from "../domain/types";
import { FIELD_LABELS } from "../domain/releaseRules";
import { ReleaseStatusBadge } from "./StatusBadge";

/** 放行存档：有效与失效旧版均可查，失效原因随单留存 */
export function ReleaseArchive(props: {
  releases: ProductionRelease[];
  orderNo: string;
  customer: string;
  product: string;
}) {
  const { releases, orderNo } = props;
  const list = releases
    .filter((release) => release.orderNo === orderNo)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  return (
    <section className="panel archive-panel">
      <div className="heading">
        <div>
          <p>存档</p>
          <h2>放行单存档（旧版可查）</h2>
        </div>
        <span className="archive-count">共 {list.length} 份</span>
      </div>

      {list.length === 0 && (
        <p className="empty-hint">该订单尚无放行记录。</p>
      )}

      <div className="archive-list">
        {list.map((release) => {
          const snap = release.processSnapshot;
          return (
            <article
              key={release.id}
              className={
                release.status === "active"
                  ? "release-card active"
                  : "release-card invalid"
              }
            >
              <div className="release-card-head">
                <div>
                  <strong>{release.id}</strong>
                  <span className="release-date">{release.submittedAt}</span>
                </div>
                <ReleaseStatusBadge status={release.status} />
              </div>

              <dl className="release-grid">
                <div>
                  <dt>绑定订单</dt>
                  <dd>{release.orderNo}</dd>
                </div>
                <div>
                  <dt>放行小样</dt>
                  <dd>{release.batchId}</dd>
                </div>
                <div>
                  <dt>绑定工艺</dt>
                  <dd>{snap.recipeName} · v{snap.version}</dd>
                </div>
                <div>
                  <dt>放行时色差</dt>
                  <dd>ΔE {release.batchDeltaE}</dd>
                </div>
                <div>
                  <dt>后整理</dt>
                  <dd>{snap.finish}</dd>
                </div>
                <div>
                  <dt>保温时间</dt>
                  <dd>{snap.holdTimeMin} 分钟</dd>
                </div>
                <div>
                  <dt>业务员</dt>
                  <dd>{release.applicant}</dd>
                </div>
                <div>
                  <dt>复核人</dt>
                  <dd>{release.reviewer}</dd>
                </div>
              </dl>

              {release.status === "invalidated" && (
                <div className="invalidate-note">
                  已于 {release.invalidatedAt} 因
                  <em>
                    {release.invalidatedReason
                      ? FIELD_LABELS[release.invalidatedReason]
                      : "工艺"}
                    变更
                  </em>
                  失效：{release.changeDetail}。本单仅作存档，不可用于排产。
                </div>
              )}

              <details>
                <summary>查看绑定工艺快照明细</summary>
                <div className="snapshot-detail">
                  <p>
                    <span>配方明细</span>
                    {snap.recipeItems.join("；")}
                  </p>
                  <p>
                    <span>浴比</span>
                    {snap.liquorRatio}
                  </p>
                  <p>
                    <span>温度曲线</span>
                    {snap.tempCurve}
                  </p>
                  <p>
                    <span>工艺调整人</span>
                    {snap.adjustedBy}（{snap.adjustedAt}）
                  </p>
                </div>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
