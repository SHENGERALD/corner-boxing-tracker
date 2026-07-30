import { describe, expect, it } from "vitest";
import { getPlanForWeekday } from "./plan";
import { getRecordCompletion, getWeeklySummary } from "./progress";

describe("progress helpers", () => {
  it("counts completed checklist items and weekly estimated minutes", () => {
    const tue = getPlanForWeekday("tue");
    expect(getRecordCompletion(tue, { completedItemIds: ["coach-class", "shadow"] }).completed).toBe(2);
    const summary = getWeeklySummary([
      { plan: tue, record: { completedItemIds: ["coach-class", "shadow", "heavy-bag", "cooldown"] } },
      { plan: getPlanForWeekday("wed"), record: undefined },
    ]);
    expect(summary.completedSessions).toBe(1);
    expect(summary.estimatedMinutes).toBeGreaterThanOrEqual(75);
  });
});
