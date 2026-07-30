import type { DayPlan, TrainingRecord } from "./types";

export function isTrainingItemComplete(record: Pick<TrainingRecord, "completedItemIds" | "itemSetLogs"> | undefined, itemId: string) {
  return Boolean(
    record?.completedItemIds.includes(itemId) ||
    record?.itemSetLogs?.[itemId]?.some((set) => set.completed)
  );
}

export function getRecordCompletion(
  plan: DayPlan,
  record?: Pick<TrainingRecord, "completedItemIds" | "removedItemIds" | "customItems" | "itemSetLogs">
) {
  const visiblePlanItems = plan.items.filter((item) => !record?.removedItemIds?.includes(item.id));
  const completedPlanned = visiblePlanItems.filter((item) => isTrainingItemComplete(record, item.id)).length;
  const customItems = record?.customItems ?? [];
  const completedCustom = customItems.filter((item) => item.completed || isTrainingItemComplete(record, item.id)).length;
  const total = visiblePlanItems.length + customItems.length;
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

