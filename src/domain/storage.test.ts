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
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").version).toBe(2);
  });

  it("rejects malformed backups without replacing current state", () => {
    const state = createEmptyState();
    saveState(state);

    expect(() => importState('{"version":2}')).toThrow("Invalid backup");
    expect(loadState()).toEqual(state);
  });

  it("migrates version 1 records to version 2 without losing their notes", () => {
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
      version: 2,
      favoriteDrillIds: [],
      records: {
        "2026-07-30": {
          technicalNotes: "手要回防",
          customItems: [],
        },
      },
    });
  });
});
