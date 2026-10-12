import { describe, expect, it } from "vitest";
import { getLeaderboardPeriod, getUtcWeekStart, normalizeLeaderboardName } from "./leaderboard";

describe("leaderboard helpers", () => {
  it("computes the shared reset across month and year boundaries", () => {
    const period = getLeaderboardPeriod("2026-12-28");
    expect(period.end).toBe("2027-01-03");
    expect(period.reset.toISOString()).toBe("2027-01-04T00:00:00.000Z");
  });
  it("uses Monday UTC as the shared leaderboard boundary", () => {
    expect(getUtcWeekStart(new Date("2026-10-11T23:59:59Z"))).toBe("2026-10-05");
    expect(getUtcWeekStart(new Date("2026-10-12T00:00:00Z"))).toBe("2026-10-12");
  });

  it("accepts a trimmed public nickname but rejects empty or oversized names", () => {
    expect(normalizeLeaderboardName("  Corner 拳手  ")).toBe("Corner 拳手");
    expect(normalizeLeaderboardName("   ")).toBeNull();
    expect(normalizeLeaderboardName("a".repeat(21))).toBeNull();
  });
});
