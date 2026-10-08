import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADVENTURE_KEY, adventureFloors, attackAdventure, createAdventureState, loadAdventure, resetAdventure, saveAdventure } from "./adventure";

describe("adventure progression", () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it("deals 45 damage without mutating the input", () => {
    const state = createAdventureState();
    expect(attackAdventure(state)).toMatchObject({ floor: 1, enemyHp: state.enemyHp - 45, eventId: 1, lastEvent: "hit" });
    expect(state).toEqual(createAdventureState());
  });

  it("advances exactly one floor and grants XP on defeat", () => {
    const next = attackAdventure(attackAdventure(createAdventureState()));
    expect(next).toMatchObject({ floor: 2, enemyHp: adventureFloors[1].maxHp, experience: 40, lastEvent: "defeat" });
  });

  it("has ten floors, bosses at 5/10, level-ups, and an immutable completed state", () => {
    expect(adventureFloors).toHaveLength(10);
    expect(adventureFloors.filter(f => f.boss).map(f => f.floor)).toEqual([5, 10]);
    let state = createAdventureState();
    let leveled = false;
    for (let i = 0; i < 200 && !state.completed; i++) {
      state = attackAdventure(state);
      saveAdventure(state);
      expect(loadAdventure()).toEqual(state);
      leveled ||= state.lastEvent === "level-up";
    }
    expect(leveled).toBe(true);
    expect(state).toMatchObject({ floor: 10, enemyHp: 0, completed: true, lastEvent: "complete" });
    expect(attackAdventure(state)).toBe(state);
    expect((state.level - 1) * 100 + state.experience).toBe(adventureFloors.reduce((sum, floor) => sum + floor.rewardXp, 0));
  });

  it("persists and resets only the preview key; elapsed time never changes progress", () => {
    localStorage.setItem("boxing-tracker-v1", "formal records");
    const state = attackAdventure(createAdventureState());
    expect(saveAdventure(state)).toBe(true);
    vi.spyOn(Date, "now").mockReturnValue(9999999999999);
    expect(loadAdventure()).toEqual(state);
    expect(resetAdventure()).toEqual(createAdventureState());
    expect(loadAdventure()).toEqual(createAdventureState());
    expect(localStorage.getItem("boxing-tracker-v1")).toBe("formal records");
  });

  it.each([null, [], {}, { floor: 99 }, { enemyHp: -1 }, { enemyHp: 999 }, { floor: 1.5 }, { level: Infinity }, { experience: 100 }, { completed: true }, { enemyMaxHp: 999 }, { eventId: -1 }, { lastEvent: "bad" }, { level: 2 }, { enemyHp: 44 }])("rejects malformed or inconsistent saves: %j", patch => {
    localStorage.setItem(ADVENTURE_KEY, JSON.stringify(patch === null || Array.isArray(patch) ? patch : { ...createAdventureState(), ...patch }));
    expect(loadAdventure()).toEqual(createAdventureState());
  });

  it("survives invalid JSON and blocked storage", () => {
    localStorage.setItem(ADVENTURE_KEY, "{");
    expect(loadAdventure()).toEqual(createAdventureState());
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
    expect(loadAdventure()).toEqual(createAdventureState());
    expect(saveAdventure(createAdventureState())).toBe(false);
    expect(resetAdventure()).toEqual(createAdventureState());
  });
});
