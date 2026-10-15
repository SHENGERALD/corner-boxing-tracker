import { describe, expect, it } from "vitest";
import { battleBase, claimDemoTraining, createBase, findBaseOpponents, upgradeBase } from "./basePreview";

describe("base prototype economy", () => {
  it("only matches opted-in bases, sorts by strength and searches friends", () => {
    expect(findBaseOpponents(130, false, "")[0].name).toBe("RED RIDGE");
    expect(findBaseOpponents(130, false, "private")).toEqual([]);
    expect(findBaseOpponents(130, true, "ruby")).toEqual([]);
    expect(findBaseOpponents(130, true, " 夜行者 ")[0].name).toBe("NIGHT WATCH");
    expect(findBaseOpponents(130, false, "ｒｅｄ")[0].name).toBe("RED RIDGE");
    expect(battleBase(createBase(), [2,2,0], 8)).toBeNull();
  });
  it("grants the demo daily reward at most once for a date", () => {
    const claimed = claimDemoTraining(createBase(), "2026-10-15");
    expect(claimed.credits).toBe(550);
    expect(claimDemoTraining(claimed, "2026-10-15")).toBe(claimed);
  });
  it("charges upgrades once and refuses unaffordable upgrades", () => {
    const upgraded = upgradeBase(createBase(), 0);
    expect(upgraded.levels[0]).toBe(2);
    expect(upgraded.credits).toBe(300);
    const poor = { ...upgraded, credits: 0 };
    expect(upgradeBase(poor, 0)).toBe(poor);
  });
  it("requires energy and a valid squad and rewards the resolved battle", () => {
    expect(battleBase(createBase(), [4, 4, 4], 0)).toBeNull();
    expect(battleBase(createBase(), [0, 0, 0], 0)).toBeNull();
    expect(battleBase({ ...createBase(), energy: 0 }, [2, 2, 0], 0)).toBeNull();
    const won = battleBase(createBase(), [2, 2, 0], 0)!;
    expect(won.won).toBe(true);
    expect(won.state.energy).toBe(2);
    expect(won.state.credits).toBe(475);
    expect(won.state.trophies).toBe(15);
    expect(won.state.battles).toBe(1);
  });
});
