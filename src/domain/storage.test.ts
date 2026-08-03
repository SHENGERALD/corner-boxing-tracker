import { beforeEach, describe, expect, it } from "vitest";
import {
  createEmptyState,
  importState,
  loadState,
  saveState,
  STORAGE_KEY,
} from "./storage";

describe("local training storage", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips records and language preferences", () => {
    const state = createEmptyState();
    state.language = "en";
    state.records["2026-07-30"] = {
      completedItemIds: ["coach-class"],
      rpe: 7,
      technicalNotes: "Relax the lead shoulder",
      bodyCheck: "Fresh",
      nextFocus: "Return the jab",
      updatedAt: "2026-07-30T19:00:00.000Z",
    };

    saveState(state);

    expect(loadState()).toEqual(state);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").version).toBe(3);
  });

  it("preserves valid target overrides and rejects invalid ones", () => {
    const state = createEmptyState();
    state.records["2026-08-03"] = {
      completedItemIds: [],
      itemTargetOverrides: { shadow: { quantity: 12, unit: "rounds" } },
    };
    saveState(state);
    expect(loadState().records["2026-08-03"].itemTargetOverrides?.shadow).toEqual({ quantity: 12, unit: "rounds" });

    const malformed = structuredClone(state);
    malformed.records["2026-08-03"].itemTargetOverrides = { shadow: { quantity: 0, unit: "rounds" } };
    expect(() => importState(JSON.stringify(malformed))).toThrow("Invalid backup");
  });

  it("rejects malformed backups without replacing current state", () => {
    const state = createEmptyState();
    saveState(state);

    expect(() => importState('{"version":2}')).toThrow("Invalid backup");
    expect(loadState()).toEqual(state);
  });

  it("migrates version 1 records to version 3 without losing their notes", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        language: "zh-TW",
        records: {
          "2026-07-30": {
            completedItemIds: ["coach-class"],
            technicalNotes: "手要回防",
          },
        },
      })
    );

    expect(loadState()).toMatchObject({
      version: 3,
      favoriteDrillIds: [],
      weeklyPlan: expect.arrayContaining([expect.objectContaining({ day: "tue", trainingType: "boxing" })]),
      records: {
        "2026-07-30": {
          technicalNotes: "手要回防",
          customItems: [],
        },
      },
    });
  });
  it("migrates version 2 data and adds an editable weekly schedule", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 2,
      language: "en",
      favoriteDrillIds: ["jab"],
      customDrills: [],
      records: { "2026-07-30": { completedItemIds: ["coach-class"] } },
    }));

    const state = loadState();
    expect(state.version).toBe(3);
    expect(state.favoriteDrillIds).toEqual(["jab"]);
    expect(state.weeklyPlan).toHaveLength(7);
    expect(state.records["2026-07-30"].completedItemIds).toEqual(["coach-class"]);
    expect(state.records["2026-07-30"].planSnapshot?.day).toBe("thu");
  });

  it("keeps guest and signed-in local caches separate", () => {
    const guest = createEmptyState();
    guest.language = "zh-TW";
    const account = createEmptyState();
    account.language = "en";

    saveState(guest);
    saveState(account, "user-123");

    expect(loadState().language).toBe("zh-TW");
    expect(loadState("user-123").language).toBe("en");
  });

  it("imports a backup into the signed-in account cache without exposing it to guests", () => {
    const backup = createEmptyState();
    backup.language = "en";

    importState(JSON.stringify(backup), "user-123");

    expect(loadState("user-123").language).toBe("en");
    expect(loadState().language).toBe("zh-TW");
  });

  it("rejects oversized backups and external custom drill images", () => {
    expect(() => importState("x".repeat(2 * 1024 * 1024 + 1))).toThrow("Invalid backup");
    const backup = createEmptyState();
    backup.customDrills = [{
      id: "unsafe", domain: "boxing", category: "offense",
      name: { zhTW: "測試", en: "Test" }, cue: { zhTW: "提示", en: "Cue" },
      defaultUnit: "rounds", defaultQuantity: 3, imageUrl: "https://example.com/image.png",
    }];
    expect(() => importState(JSON.stringify(backup))).toThrow("Invalid backup");
  });

});
