import { useCallback, useMemo, useState } from "react";
import type {
  DyeOrder,
  ReleaseRecord,
} from "../domain/types";
import { ReleaseRepository, type AdjustOutcome, type SubmitOutcome } from "../archive/releaseRepository";

export interface BoardBanner {
  tone: "ok" | "warn" | "error";
  text: string;
}

const repo = new ReleaseRepository();

/** 页面状态：从存档仓储读数据，操作后回刷；规则判断在 domain 层完成 */
export function useReleaseBoard() {
  const [orders, setOrders] = useState<DyeOrder[]>(() => repo.getOrders());
  const [releases, setReleases] = useState<ReleaseRecord[]>(() =>
    repo.getReleases()
  );
  const [historyVersion, setHistoryVersion] = useState(0);
  const [banner, setBanner] = useState<BoardBanner | null>(null);

  const refresh = useCallback(() => {
    setOrders(repo.getOrders());
    setReleases(repo.getReleases());
    setHistoryVersion((v) => v + 1);
  }, []);

  const submitRelease = useCallback(
    (input: {
      orderId: string;
      sampleBatchId: string;
      reviewer: string;
      note?: string;
    }): SubmitOutcome => {
      const outcome = repo.submitRelease(input);
      if (outcome.kind === "created") {
        setBanner({ tone: "ok", text: `已生成放行单 ${outcome.release.id}，绑定工艺 V${outcome.release.processVersion}` });
        refresh();
      } else if (outcome.kind === "reused") {
        setBanner({
          tone: "warn",
          text: `当前工艺已有有效放行 ${outcome.release.id}，重复提交沿用首次放行，未生成新单`,
        });
      }
      // rejected / no-sample 的文案由调用方结合测控项展示
      return outcome;
    },
    [refresh]
  );

  const adjustProcess = useCallback(
    (input: {
      orderId: string;
      patch: Parameters<ReleaseRepository["adjustProcess"]>[0]["patch"];
      updatedBy: string;
    }): AdjustOutcome | undefined => {
      const outcome = repo.adjustProcess(input);
      if (!outcome) return outcome;
      if (outcome.changed) {
        const names = outcome.reasons.join("、");
        setBanner(
          outcome.invalidated.length > 0
            ? {
                tone: "warn",
                text: `${names}，工艺升版至 V${outcome.order.currentProcess.version}；原放行 ${outcome.invalidated
                  .map((r) => r.id)
                  .join("、")} 已自动失效，可在历史放行中查旧版`,
              }
            : {
                tone: "ok",
                text: `${names}，工艺升版至 V${outcome.order.currentProcess.version}，该订单此前无有效放行`,
              }
        );
      } else {
        setBanner({ tone: "ok", text: "仅更新非控项（浴比/温度曲线/说明），工艺版本不变，原放行继续有效" });
      }
      refresh();
      return outcome;
    },
    [refresh]
  );

  const resetDemo = useCallback(() => {
    repo.resetToSeed();
    setBanner({ tone: "ok", text: "已恢复演示数据" });
    refresh();
  }, [refresh]);

  const getProcessHistory = useCallback(
    (orderId: string) => repo.getProcessHistory(orderId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [historyVersion]
  );

  return useMemo(
    () => ({
      orders,
      releases,
      banner,
      setBanner,
      submitRelease,
      adjustProcess,
      resetDemo,
      getProcessHistory,
    }),
    [
      orders,
      releases,
      banner,
      submitRelease,
      adjustProcess,
      resetDemo,
      getProcessHistory,
    ]
  );
}
