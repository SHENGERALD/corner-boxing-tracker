import assert from "node:assert/strict";
import test from "node:test";
import {
  isDuplicateMovement,
  normalizeCategory,
  normalizeEquipment,
  normalizeExercise,
  toStableId,
} from "./wger-normalize.mjs";

test("normalizes stretching into the dedicated mobility category", () => {
  assert.equal(normalizeCategory({ category: "Stretching" }), "mobility");
});

test("normalizes wger equipment into Corner equipment values", () => {
  assert.equal(normalizeEquipment({ equipment: "Dumbbell" }), "dumbbell");
});

test("creates deterministic source ids", () => {
  assert.equal(toStableId({ id: 123 }), "wger-123");
});

test("detects duplicate movements by stable id or normalized English name", () => {
  const existing = [{ id: "bench-press", name: { en: "Barbell Bench Press" } }];
  const candidate = {
    id: "wger-999",
    name: { en: "barbell bench press" },
  };
  assert.equal(isDuplicateMovement(existing, candidate), true);
});

test("reports exercises without usable images instead of dropping them", () => {
  const report = { missingMedia: [] };
  const result = normalizeExercise({
    id: 42,
    category: { name: "Chest" },
    equipment: [{ name: "Barbell" }],
    translations: [{ language: 2, name: "Barbell Press", description_source: "Press with control." }],
    images: [],
  }, { report });

  assert.equal(result.imageUrl, undefined);
  assert.deepEqual(report.missingMedia, [{ sourceId: 42, name: "Barbell Press" }]);
});
