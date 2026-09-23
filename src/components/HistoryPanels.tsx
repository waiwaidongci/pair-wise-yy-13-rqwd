import { Fragment, useState } from "react";
import type {
  ProcessSpec,
  ReleaseRecord,
} from "../domain/types";
import { formatDateTime, recipeText } from "./format";

interface HistoryPanelsProps {
  releases: ReleaseRecord[];
  processHistory: ProcessSpec[];
  currentVersion: number;
}

function ProcessTimeline({ processHistory, currentVersion }: Pick<HistoryPanelsProps, "processHistory" | "currentVersion">) {
  const [openVersion, setOpenVersion] = useState<number | null>(null);
  return (
    <section className="panel subpanel">
      <div className="subpanel-head">
        <h3>工艺版本存档</h3>
        <span className="tag">{processHistory.length} 版</span>
      </div>
      <ol className="timeline">
        {[...processHistory].reverse().map((p) => {
          const open = openVersion === p.version;
          return (
            <li key={p.version} className={p.version === currentVersion ? "current" : ""}>
              <button className="timeline-head" onClick={() => setOpenVersion(open ? null : p.version)}>
                <b>V{p.version}</b>
                {p.version === currentVersion && <span className="tag tag-ok">当前</span>}
                <span className="timeline-note">{p.changeNote}</span>
                <small>{formatDateTime(p.updatedAt)} · {p.updatedBy}</small>
                <span className="caret">{open ? "收起" : "展开"}</span>
              </button>
              {open && (
                <div className="timeline-body">
                  <p><span>配方</span>{recipeText(p.recipe)}</p>
                  <p><span>浴比 / 曲线</span>{p.liquorRatio} · {p.tempCurve}</p>
                  <p><span>保温时间</span>{p.holdMinutes} 分钟</p>
                  <p><span>后整理</span>{p.finishing}</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ReleaseArchive({ releases }: { releases: ReleaseRecord[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (releases.length === 0) {
    return (
      <section className="panel subpanel">
        <div className="subpanel-head">
          <h3>历史放行（旧版可查）</h3>
        </div>
        <p className="muted">该订单还没有办理过放行。</p>
      </section>
    );
  }
  return (
    <section className="panel subpanel">
      <div className="subpanel-head">
        <h3>历史放行（旧版可查）</h3>
        <span className="tag">{releases.length} 张</span>
      </div>
      <table className="archive-table">
        <thead>
          <tr>
            <th>放行单</th>
            <th>绑定工艺</th>
            <th>样品 / 色差</th>
            <th>复核人</th>
            <th>放行时间</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {[...releases].reverse().map((r) => {
            const open = openId === r.id;
            return (
              <Fragment key={r.id}>
                <tr
                  className={`archive-row ${r.status === "有效" ? "row-ok" : "row-dead"}`}
                  onClick={() => setOpenId(open ? null : r.id)}
                >
                  <td><b>{r.id}</b></td>
                  <td>V{r.processVersion}</td>
                  <td>{r.sampleBatchId} · ΔE {r.deltaE.toFixed(2)}</td>
                  <td>{r.reviewer}</td>
                  <td>{formatDateTime(r.releasedAt)}</td>
                  <td>
                    <span className={`tag ${r.status === "有效" ? "tag-ok" : "tag-dead"}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
                {open && (
                  <tr className="archive-detail-row">
                    <td colSpan={6}>
                      <div className="archive-detail">
                        {r.status === "已失效" && (
                          <p className="invalidate-info">
                            {formatDateTime(r.invalidatedAt!)} 因「
                            {r.invalidateReasons?.join("、")}」自动失效
                            {r.supersededByVersion ? `，已被 V${r.supersededByVersion} 取代` : ""}。
                            生产线不应再按本张放行排产。
                          </p>
                        )}
                        <p><span>放行时工艺配方</span>{recipeText(r.processSnapshot.recipe)}</p>
                        <p><span>后整理</span>{r.processSnapshot.finishing}</p>
                        <p><span>保温时间</span>{r.processSnapshot.holdMinutes} 分钟</p>
                        <p><span>浴比 / 曲线</span>{r.processSnapshot.liquorRatio} · {r.processSnapshot.tempCurve}</p>
                        {r.note && <p><span>放行意见</span>{r.note}</p>}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export function HistoryPanels({ releases, processHistory, currentVersion }: HistoryPanelsProps) {
  return (
    <>
      <ProcessTimeline processHistory={processHistory} currentVersion={currentVersion} />
      <ReleaseArchive releases={releases} />
    </>
  );
}
