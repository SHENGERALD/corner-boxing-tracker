import { describe, expect, it } from "vitest";
import { drillCategories, drillLibrary, filterDrills, type DrillCategory } from "./drills";
import { loadStrengthLibrary, strengthCategoryIds } from "./strengthCatalog";

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

  it("exposes mobility as a strength-library category", () => {
    expect(drillCategories).toContain("mobility");
  });
  it("loads the complete strength catalog with legacy drills and mobility", async () => {
    const catalog = await loadStrengthLibrary();
    const ids = catalog.map((drill) => drill.id);

    expect(strengthCategoryIds).toContain("mobility");
    expect(catalog).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "bench-press" }),
      expect.objectContaining({ id: "back-squat" }),
      expect.objectContaining({ category: "mobility" }),
    ]));
    expect(new Set(ids).size).toBe(ids.length);
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

  it("corrects reviewed machine records with equipment and movement-specific local media", async () => {
    const catalog = await loadStrengthLibrary();
    const reviewed = new Map(catalog.map((drill) => [drill.id, drill]));

    expect(reviewed.get("wger-379")).toEqual(expect.objectContaining({
      equipment: "hammer",
      imageSource: "Corner generated",
    }));
    expect(reviewed.get("wger-380")).toEqual(expect.objectContaining({
      equipment: "hammer",
      imageSource: "Corner generated",
    }));
    expect(reviewed.get("wger-1414")).toEqual(expect.objectContaining({
      equipment: "hammer",
      imageSource: "Corner generated",
    }));
    expect(reviewed.get("wger-1424")).toEqual(expect.objectContaining({
      equipment: "machine",
      imageSource: "Corner generated",
    }));
    expect(reviewed.get("wger-543")).toEqual(expect.objectContaining({
      equipment: "machine",
      imageSource: "Corner generated",
    }));

    for (const id of ["wger-379", "wger-380", "wger-1414", "wger-1424", "wger-543"]) {
      expect(reviewed.get(id)?.imageUrl).toContain("assets/strength/reviewed/");
      expect(reviewed.get(id)?.imageUrl).toMatch(new RegExp("^" + import.meta.env.BASE_URL));
    }
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

  it("uses the deployed base path for boxing drill images", () => {
    expect(drillLibrary.find((drill) => drill.id === "jab")?.imageUrl)
      .toBe(`${import.meta.env.BASE_URL}assets/boxing/boxing-sprite-a.png`);
    expect(drillLibrary.find((drill) => drill.id === "high-guard")?.imageUrl)
      .toBe(`${import.meta.env.BASE_URL}assets/boxing/high-guard-reference.png`);
  });

  it("gives every strength drill an image and equipment label", () => {
    const strengthDrills = drillLibrary.filter((drill) => drill.domain === "strength" && drill.category !== "cardio");
    expect(strengthDrills.length).toBeGreaterThanOrEqual(50);
    expect(strengthDrills.every((drill) => drill.imageUrl && drill.imageSource === "wger" && drill.equipment)).toBe(true);
    expect(new Set(strengthDrills.map((drill) => drill.name.en.toLowerCase())).size).toBe(strengthDrills.length);
  });
});
