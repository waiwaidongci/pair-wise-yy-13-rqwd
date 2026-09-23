import type { ProcessSpec, RecipePart } from "../domain/types";

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function recipeText(recipe: RecipePart[]): string {
  return recipe.map((r) => `${r.dye} ${r.percent}%`).join(" + ");
}

/** 把配方表单文本解析成组分，每行 "染料 1.2"，百分比 */
export function parseRecipeText(text: string): RecipePart[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.+?)[\s,，]+(\d+(?:\.\d+)?)\s*%?$/);
      if (!m) return null;
      const percent = Number(m[2]);
      if (!Number.isFinite(percent)) return null;
      return { dye: m[1].trim(), percent };
    })
    .filter((r): r is RecipePart => r !== null);
}

export function recipeToText(recipe: RecipePart[]): string {
  return recipe.map((r) => `${r.dye} ${r.percent}%`).join("\n");
}

/** 配方是否有可识别的改动（基于规范对象比较，忽略浮点格式差异） */
export function sameRecipe(a: RecipePart[], b: RecipePart[]): boolean {
  const key = (r: RecipePart[]) =>
    r
      .map((x) => `${x.dye}:${x.percent}`)
      .sort()
      .join("|");
  return key(a) === key(b);
}

export function isSameProcess(a: ProcessSpec, b: ProcessSpec): boolean {
  return (
    sameRecipe(a.recipe, b.recipe) &&
    a.finishing.trim() === b.finishing.trim() &&
    a.holdMinutes === b.holdMinutes &&
    a.liquorRatio.trim() === b.liquorRatio.trim() &&
    a.tempCurve.trim() === b.tempCurve.trim()
  );
}
