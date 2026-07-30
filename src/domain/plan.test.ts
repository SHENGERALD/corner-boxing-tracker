import { describe, expect, it } from "vitest";
import { getPlanForWeekday, weeklyPlan } from "./plan";

describe("weeklyPlan", () => {
  it("contains the approved seven-day boxing rhythm", () => {
    expect(weeklyPlan).toHaveLength(7);
    expect(getPlanForWeekday("thu").session.en).toBe("Coaching + Self Training");
    expect(getPlanForWeekday("thu").items.map((item) => item.id)).toEqual([
      "coach-class",
      "shadow",
      "heavy-bag",
      "cooldown",
    ]);
    expect(getPlanForWeekday("wed").session.en).toBe("Rest");
  });
});
