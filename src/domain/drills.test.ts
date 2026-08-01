import { describe, expect, it } from "vitest";
import { drillLibrary, filterDrills, type DrillCategory } from "./drills";

describe("drill library", () => {
  it("searches English and Chinese names and filters favorites", () => {
    expect(filterDrills(drillLibrary, { query: "jab", domain: "boxing", category: "all", favoriteIds: [], favoritesOnly: false }))
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: "jab" })]));
    expect(filterDrills(drillLibrary, { query: "", domain: "boxing", category: "defense", favoriteIds: ["slip"], favoritesOnly: true }))
      .toEqual([expect.objectContaining({ id: "slip" })]);
  });

  it("keeps strength drills separate from boxing drills", () => {
    expect(filterDrills(drillLibrary, { query: "", domain: "strength", category: "chest", favoriteIds: [], favoritesOnly: false }))
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: "bench-press" })]));
  });

  it("includes Speed Bag as a three-round boxing equipment drill", () => {
    expect(filterDrills(drillLibrary, {
      query: "speed bag",
      domain: "boxing",
      category: "equipment",
      favoriteIds: [],
      favoritesOnly: false,
    })).toEqual([
      expect.objectContaining({
        id: "speed-bag",
        domain: "boxing",
        category: "equipment",
        name: { zhTW: "速度球", en: "Speed Bag" },
        cue: {
          zhTW: "放鬆肩膀，維持穩定節奏",
          en: "Relax shoulders, keep a steady rhythm",
        },
        defaultUnit: "rounds",
        defaultQuantity: 3,
      }),
    ]);
  });

  it("filters strength drills by equipment without mixing equipment types", () => {
    const drills = filterDrills(drillLibrary, {
      query: "",
      domain: "strength",
      category: "chest",
      equipment: "dumbbell",
      favoriteIds: [],
      favoritesOnly: false,
    });

    expect(drills).toEqual(expect.arrayContaining([expect.objectContaining({ id: "dumbbell-bench-press", equipment: "dumbbell" })]));
    expect(drills.every((drill) => drill.equipment === "dumbbell")).toBe(true);
  });

  it("keeps cardio drills in the dedicated strength category", () => {
    expect(filterDrills(drillLibrary, {
      query: "跑步",
      domain: "strength",
      category: "cardio" as DrillCategory,
      equipment: "all",
      favoriteIds: [],
      favoritesOnly: false,
    })).toEqual([expect.objectContaining({ id: "cardio-run", defaultUnit: "minutes", imageUrl: import.meta.env.BASE_URL + "cardio/running.png", imageSource: "Corner cardio illustration" })]);
  });

  it("gives every strength drill an image and equipment label", () => {
    const strengthDrills = drillLibrary.filter((drill) => drill.domain === "strength" && drill.category !== "cardio");
    expect(strengthDrills.length).toBeGreaterThanOrEqual(50);
    expect(strengthDrills.every((drill) => drill.imageUrl && drill.imageSource === "wger" && drill.equipment)).toBe(true);
    expect(new Set(strengthDrills.map((drill) => drill.name.en.toLowerCase())).size).toBe(strengthDrills.length);
  });
});
