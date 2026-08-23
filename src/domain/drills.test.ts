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
    expect(reviewed.get("wger-1384")).toEqual(expect.objectContaining({
      name: expect.objectContaining({ zhTW: "坐姿機械上拉" }),
      imageUrl: expect.stringContaining("machine-pullover.webp"),
    }));
    expect(reviewed.get("wger-1374")).toEqual(expect.objectContaining({
      name: expect.objectContaining({ zhTW: "軀幹旋轉機" }),
      imageUrl: expect.stringContaining("machine-rotary-torso.webp"),
    }));
    expect(reviewed.get("wger-2478")).toEqual(expect.objectContaining({
      name: expect.objectContaining({ zhTW: "臀腿抬舉" }),
      imageUrl: expect.stringContaining("machine-glute-ham-raise.webp"),
    }));

    for (const id of ["wger-379", "wger-380", "wger-1414", "wger-1424", "wger-543"]) {
      expect(reviewed.get(id)?.imageUrl).toContain("assets/strength/reviewed/");
      expect(reviewed.get(id)?.imageUrl).toMatch(new RegExp("^" + import.meta.env.BASE_URL));
    }
  });

  it("corrects high-confidence equipment mismatches and their reviewed media", async () => {
    const reviewed = new Map((await loadStrengthLibrary()).map((drill) => [drill.id, drill]));

    expect(reviewed.get("wger-911")).toEqual(expect.objectContaining({ equipment: "dumbbell", imageUrl: expect.stringContaining("dumbbell-incline-skull-crusher.webp") }));
    expect(reviewed.get("wger-1471")).toEqual(expect.objectContaining({ equipment: "dumbbell", imageUrl: expect.stringContaining("dumbbell-kroc-row.webp") }));
    expect(reviewed.get("wger-2490")).toEqual(expect.objectContaining({ equipment: "cable", mediaFamilyId: "cable-row-seated" }));
    expect(reviewed.get("wger-1120")).toEqual(expect.objectContaining({ equipment: "cable", mediaFamilyId: "cable-row-seated" }));
    expect(reviewed.get("wger-1112")).toEqual(expect.objectContaining({ equipment: "bodyweight" }));
    expect(reviewed.get("wger-1653")).toEqual(expect.objectContaining({ equipment: "dumbbell" }));
    expect(reviewed.get("wger-254")).toEqual(expect.objectContaining({ equipment: "barbell", imageUrl: expect.stringContaining("plate-front-raise.webp") }));
    expect(reviewed.get("wger-478")).toEqual(expect.objectContaining({ equipment: "dumbbell" }));
    expect(reviewed.get("wger-441")).toEqual(expect.objectContaining({ equipment: "barbell", imageUrl: expect.stringContaining("barbell-overhead-squat.webp") }));
    expect(reviewed.get("wger-632")).toEqual(expect.objectContaining({ equipment: "barbell", imageUrl: expect.stringContaining("barbell-sumo-squat.webp") }));
    expect(reviewed.get("wger-722")).toEqual(expect.objectContaining({ equipment: "barbell", imageUrl: expect.stringContaining("barbell-weighted-step-up.webp") }));
    expect(reviewed.get("wger-289")).toEqual(expect.objectContaining({ equipment: "barbell", imageUrl: expect.stringContaining("barbell-high-pull.webp") }));
    expect(reviewed.get("wger-569")).toEqual(expect.objectContaining({ equipment: "machine", imageUrl: expect.stringContaining("machine-smith-shoulder-press.webp") }));
    expect(reviewed.get("wger-598")).toEqual(expect.objectContaining({ equipment: "machine", imageUrl: expect.stringContaining("machine-smith-close-grip-bench-press.webp") }));
    expect(reviewed.get("wger-1508")).toEqual(expect.objectContaining({ equipment: "machine", imageUrl: expect.stringContaining("machine-smith-high-incline-press.webp") }));
    expect(reviewed.get("wger-925")).toEqual(expect.objectContaining({ equipment: "machine", name: expect.objectContaining({ zhTW: "低角度上斜史密斯胸推" }) }));
    expect(reviewed.get("wger-1593")).toEqual(expect.objectContaining({ equipment: "machine", name: expect.objectContaining({ zhTW: "史密斯機分腿蹲" }) }));
    expect(reviewed.get("wger-258")).toEqual(expect.objectContaining({ equipment: "cable", mediaFamilyId: "cable-pulldown-wide", name: expect.objectContaining({ zhTW: "寬握滑輪下拉" }) }));
    expect(reviewed.get("wger-259")).toEqual(expect.objectContaining({ equipment: "cable", mediaFamilyId: "cable-pulldown-neutral", name: expect.objectContaining({ zhTW: "窄握滑輪下拉" }) }));
    expect(reviewed.get("wger-510")).toEqual(expect.objectContaining({ equipment: "dumbbell", name: expect.objectContaining({ zhTW: "胸部支撐啞鈴划船" }) }));
    expect(reviewed.get("wger-604")).toEqual(expect.objectContaining({ equipment: "barbell", name: expect.objectContaining({ zhTW: "速度硬舉" }) }));
    expect(reviewed.get("wger-1967")).toEqual(expect.objectContaining({ category: "shoulders", name: expect.objectContaining({ zhTW: "坐姿啞鈴肩推" }) }));
    expect(reviewed.get("wger-1137")).toEqual(expect.objectContaining({ equipment: "cable", name: expect.objectContaining({ zhTW: "高位滑輪直臂下壓" }), imageUrl: expect.stringContaining("generated/back/wger-1137.webp") }));
    expect(reviewed.get("wger-1138")).toEqual(expect.objectContaining({ equipment: "cable", name: expect.objectContaining({ zhTW: "俯臥上斜凳滑輪下拉" }), imageUrl: expect.stringContaining("generated/back/wger-1138.webp") }));
    expect(reviewed.get("wger-1728")).toEqual(expect.objectContaining({ equipment: "cable", name: expect.objectContaining({ zhTW: "單臂滑輪肩內旋" }), imageUrl: expect.stringContaining("generated/shoulders/wger-1728.webp") }));
    expect(reviewed.get("wger-194")).toEqual(expect.objectContaining({ equipment: "bodyweight", name: expect.objectContaining({ zhTW: "雙槓撐體" }), imageUrl: expect.stringContaining("generated/chest/wger-194.webp") }));
    expect(reviewed.get("wger-570")).toEqual(expect.objectContaining({ equipment: "dumbbell", name: expect.objectContaining({ zhTW: "啞鈴聳肩" }), imageUrl: expect.stringContaining("generated/shoulders/wger-570.webp") }));
    expect(reviewed.get("wger-1573")).toEqual(expect.objectContaining({ name: expect.objectContaining({ zhTW: "跪姿健腹輪" }), imageUrl: expect.stringContaining("generated/core/wger-1573.webp") }));
    expect(reviewed.get("wger-1363")).toEqual(expect.objectContaining({ name: expect.objectContaining({ zhTW: "上背泡棉滾筒放鬆" }), imageUrl: expect.stringContaining("generated/back/wger-1363.webp") }));
    expect(reviewed.get("wger-1915")).toEqual(expect.objectContaining({ category: "legs", imageUrl: expect.stringContaining("generated/legs/wger-1915.webp") }));
    expect(reviewed.get("wger-1833")).toEqual(expect.objectContaining({ category: "legs" }));
    expect(reviewed.get("wger-1580")).toEqual(expect.objectContaining({ category: "back" }));
    expect(reviewed.get("wger-1372")).toEqual(expect.objectContaining({ equipment: "machine" }));
    expect(reviewed.get("wger-1929")).toEqual(expect.objectContaining({ equipment: "machine" }));
    expect(reviewed.get("wger-623")).toEqual(expect.objectContaining({ equipment: "cable" }));

    for (const id of ["wger-1480", "wger-493", "wger-495", "wger-1698", "wger-1699", "wger-445", "wger-615", "wger-1925"]) {
      expect(reviewed.get(id)?.imageUrl).not.toContain("/assets/strength/generated/");
      expect(reviewed.get(id)?.imageUrl).toContain("/assets/strength/reviewed/");
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
