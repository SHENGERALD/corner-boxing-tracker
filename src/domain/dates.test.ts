import { describe, expect, it } from "vitest";
import { getWeekDates, getWeekday, toDateKey } from "./dates";

describe("date helpers", () => {
  it("uses stable date keys and Monday-start weeks", () => {
    expect(toDateKey(new Date("2026-07-30T12:00:00"))).toBe("2026-07-30");
    expect(getWeekday(new Date("2026-07-30T12:00:00"))).toBe("thu");
    expect(getWeekDates(new Date("2026-07-30T12:00:00")).map(toDateKey)).toEqual([
      "2026-07-27",
      "2026-07-28",
      "2026-07-29",
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
    ]);
  });
});
