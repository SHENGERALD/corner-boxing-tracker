import type { DayPlan, TrainingRecord } from "./types";

export function getRecordCompletion(
  plan: DayPlan,
  record?: Pick<TrainingRecord, "completedItemIds" | "customItems">
) {
  const completedPlanned = record?.completedItemIds.filter((id) =>
    plan.items.some((item) => item.id === id)
  ).length ?? 0;
  const customItems = record?.customItems ?? [];
  const completedCustom = customItems.filter((item) => item.completed).length;
  const total = plan.items.length + customItems.length;
  const completed = completedPlanned + completedCustom;

  return {
    completed,
    total,
    isComplete: total > 0 && completed === total,
  };
}

export function getWeeklySummary(
  entries: Array<{ plan: DayPlan; record?: TrainingRecord }>
) {
  return entries.reduce(
    (summary, entry) => {
      const completion = getRecordCompletion(entry.plan, entry.record);
      if (completion.isComplete) {
        summary.completedSessions += 1;
        summary.estimatedMinutes += entry.plan.duration;
      }
      return summary;
    },
    { completedSessions: 0, estimatedMinutes: 0 }
  );
}

