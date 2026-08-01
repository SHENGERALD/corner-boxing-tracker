import { afterEach, describe, expect, it } from "vitest";
import { advanceTimer, getRemainingSeconds, pauseTimer, resumeTimer, startTimer } from "./timer";

describe("boxing timer", () => {
  const settings = { rounds: 2, workSeconds: 180, restSeconds: 60 };

  it("starts at round one work phase", () => {
    const state = startTimer(settings, 1_000);
    expect(state).toMatchObject({ status: "running", phase: "work", round: 1, phaseEndsAt: 181_000 });
    expect(getRemainingSeconds(state, 1_000)).toBe(180);
  });

  it("moves from work to rest and then to the next round", () => {
    const started = startTimer(settings, 1_000);
    const resting = advanceTimer(started, 181_000);
    expect(resting).toMatchObject({ status: "running", phase: "rest", round: 1, phaseEndsAt: 241_000 });
    const nextRound = advanceTimer(resting, 241_000);
    expect(nextRound).toMatchObject({ status: "running", phase: "work", round: 2, phaseEndsAt: 421_000 });
  });

  it("completes after the final work phase", () => {
    const started = startTimer(settings, 1_000);
    const completed = advanceTimer(started, 421_000);
    expect(completed).toMatchObject({ status: "complete", phase: "work", round: 2 });
    expect(getRemainingSeconds(completed, 421_000)).toBe(0);
  });

  it("pauses with remaining time and resumes from that point", () => {
    const started = startTimer(settings, 1_000);
    const paused = pauseTimer(started, 46_000);
    expect(paused).toMatchObject({ status: "paused", pausedRemainingSeconds: 135 });
    const resumed = resumeTimer(paused, 100_000);
    expect(resumed).toMatchObject({ status: "running", phaseEndsAt: 235_000 });
  });
});