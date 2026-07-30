import { describe, expect, it } from "vitest";
import { drillLibrary, filterDrills } from "./drills";

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
});
