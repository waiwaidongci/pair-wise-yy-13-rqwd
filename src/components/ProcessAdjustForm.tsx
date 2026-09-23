import { useEffect, useMemo, useState } from "react";
import type {
  DyeOrder,
  ProcessSpec,
  RecipePart,
} from "../domain/types";
import type { AdjustOutcome } from "../archive/releaseRepository";
import {
  parseRecipeText,
  recipeToText,
  sameRecipe,
} from "./format";

interface ProcessAdjustFormProps {
  order: DyeOrder;
  onAdjust: (input: {
    orderId: string;
    patch: Partial<
      Pick<
        ProcessSpec,
        "recipe" | "liquorRatio" | "tempCurve" | "holdMinutes" | "finishing" | "changeNote"
      >
    >;
    updatedBy: string;
  }) => AdjustOutcome | undefined;
}

export function ProcessAdjustForm({ order, onAdjust }: ProcessAdjustFormProps) {
  const p = order.currentProcess;
  const [recipeText, setRecipeText] = useState(recipeToText(p.recipe));
  const [liquorRatio, setLiquorRatio] = useState(p.liquorRatio);
  const [tempCurve, setTempCurve] = useState(p.tempCurve);
  const [holdMinutes, setHoldMinutes] = useState(String(p.holdMinutes));
  const [finishing, setFinishing] = useState(p.finishing);
  const [changeNote, setChangeNote] = useState("");
  const [updatedBy, setUpdatedBy] = useState("");
  const [error, setError] = useState("");

  // 换订单或工艺升版后，表单同步为最新工艺
  useEffect(() => {
    setRecipeText(recipeToText(p.recipe));
    setLiquorRatio(p.liquorRatio);
    setTempCurve(p.tempCurve);
    setHoldMinutes(String(p.holdMinutes));
    setFinishing(p.finishing);
    setChangeNote("");
    setUpdatedBy("");
    setError("");
  }, [order.id, p.version]);

  const parsedRecipe = useMemo(() => parseRecipeText(recipeText), [recipeText]);
  const recipeValid = parsedRecipe.length > 0;
  const holdValid = /^\d+$/.test(holdMinutes) && Number(holdMinutes) > 0;

  const draftRecipe: RecipePart[] = recipeValid ? parsedRecipe : p.recipe;
  const draftHold = holdValid ? Number(holdMinutes) : p.holdMinutes;

  const preview = useMemo(() => {
    const flags: string[] = [];
    if (!sameRecipe(p.recipe, draftRecipe)) flags.push("配方变更");
    if (p.finishing.trim() !== finishing.trim()) flags.push("后整理变更");
    if (p.holdMinutes !== draftHold) flags.push("保温时间变更");
    return flags;
  }, [p, draftRecipe, finishing, draftHold]);

  const submit = () => {
    if (!updatedBy.trim()) {
      setError("请填写工艺调整人");
      return;
    }
    if (!recipeValid) {
      setError("配方格式无法识别，请每行一条，如：活性红 3BS 1.8%");
      return;
    }
    if (!holdValid) {
      setError("保温时间需为正整数（分钟）");
      return;
    }
    setError("");
    onAdjust({
      orderId: order.id,
      patch: {
        recipe: draftRecipe,
        liquorRatio: liquorRatio.trim() || p.liquorRatio,
        tempCurve: tempCurve.trim() || p.tempCurve,
        holdMinutes: draftHold,
        finishing: finishing.trim(),
        changeNote: changeNote.trim() || "工艺参数调整",
      },
      updatedBy,
    });
  };

  return (
    <section className="panel subpanel">
      <div className="subpanel-head">
        <h3>工艺调整</h3>
        <span className="tag">当前 V{p.version}</span>
      </div>
      <p className="muted small">
        调整配方、后整理或保温时间将使工艺升版、原放行自动失效；只改浴比/温度曲线不触发重评。
      </p>

      <div className="form-grid">
        <label className="span-2">
          <span>染料配方（每行「染料 用量%」）</span>
          <textarea
            rows={3}
            value={recipeText}
            onChange={(e) => setRecipeText(e.target.value)}
          />
        </label>
        <label>
          <span>浴比</span>
          <input value={liquorRatio} onChange={(e) => setLiquorRatio(e.target.value)} />
        </label>
        <label>
          <span>温度曲线</span>
          <input value={tempCurve} onChange={(e) => setTempCurve(e.target.value)} />
        </label>
        <label>
          <span>保温时间（分钟）</span>
          <input value={holdMinutes} onChange={(e) => setHoldMinutes(e.target.value)} />
        </label>
        <label>
          <span>后整理方式</span>
          <input value={finishing} onChange={(e) => setFinishing(e.target.value)} />
        </label>
        <label className="span-2">
          <span>调整说明</span>
          <input value={changeNote} onChange={(e) => setChangeNote(e.target.value)} placeholder="如：缸差偏红光，微调染料比例" />
        </label>
        <label>
          <span>工艺调整人</span>
          <input value={updatedBy} onChange={(e) => setUpdatedBy(e.target.value)} placeholder="调整后由他人复核放行" />
        </label>
      </div>

      <div className={`adjust-preview ${preview.length ? "will-bump" : "no-bump"}`}>
        {preview.length ? (
          <span>保存后将升版至 V{p.version + 1}，并因「{preview.join("、")}」作废旧放行</span>
        ) : (
          <span>未改动控项，保存后版本不变，放行继续有效</span>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}
      <button className="btn-secondary" onClick={submit}>
        保存工艺调整
      </button>
    </section>
  );
}
