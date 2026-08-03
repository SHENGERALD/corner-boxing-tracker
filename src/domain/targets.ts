import type { Language, LocalizedLabel, TrainingTarget } from "./types";

export type { TrainingTarget } from "./types";

export function parseTrainingTarget(detail: LocalizedLabel): TrainingTarget | null {
  for (const text of [detail.zhTW, detail.en]) {
    const match = text.match(/(\d+(?:\.\d+)?)\s*(回合|rounds?|分鐘|minutes?|min)/i);
    if (!match) continue;
    return {
      quantity: Number(match[1]),
      unit: /回合|round/i.test(match[2]) ? "rounds" : "minutes",
    };
  }
  return null;
}

export function formatTrainingTarget(target: TrainingTarget, language: Language): string {
  if (language === "zh-TW") return `${target.quantity} ${target.unit === "rounds" ? "回合" : "分鐘"}`;
  return `${target.quantity} ${target.unit === "rounds" ? "rounds" : "min"}`;
}
