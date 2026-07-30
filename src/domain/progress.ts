import type { DayPlan, TrainingRecord } from "./types";

export function getRecordCompletion(
  plan: DayPlan,
  record?: Pick<TrainingRecord, "completedItemIds">
) {
  const completed = record?.completedItemIds.filter((id) =>
    plan.items.some((item) => item.id === id)
  ).length ?? 0;

  return {
    completed,
    total: plan.items.length,
    isComplete: plan.items.length > 0 && completed === plan.items.length,
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

