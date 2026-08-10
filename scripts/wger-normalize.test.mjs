import assert from "node:assert/strict";
import test from "node:test";
import {
  isDuplicateMovement,
  normalizeCategory,
  normalizeEquipment,
  normalizeExercise,
  normalizeExercises,
  toStableId,
} from "./wger-normalize.mjs";

test("normalizes stretching into the dedicated mobility category", () => {
  assert.equal(normalizeCategory({ category: "Stretching" }), "mobility");
});

test("normalizes wger equipment into Corner equipment values", () => {
  assert.equal(normalizeEquipment({ equipment: "Dumbbell" }), "dumbbell");
});

test("does not treat a bench as a machine", () => {
  assert.equal(normalizeEquipment({
    equipment: [{ name: "Bench" }],
    name: "Dumbbell Bench Press",
  }), "bodyweight");
});

test("infers plate-loaded and leverage equipment from unambiguous names", () => {
  assert.equal(normalizeEquipment({
    equipment: [{ name: "None" }],
    name: "Leverage Machine Iso Row",
  }), "hammer");
  assert.equal(normalizeEquipment({
    equipment: [{ name: "None" }],
    name: "Pendulum Squat",
  }), "hammer");
});

test("infers fixed-path machine equipment from unambiguous names", () => {
  assert.equal(normalizeEquipment({
    equipment: [{ name: "None" }],
    name: "Smith Machine Press",
  }), "machine");
  assert.equal(normalizeEquipment({
    equipment: [{ name: "None" }],
    name: "Biceps Curl Machine",
  }), "machine");
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

test("applies cached Traditional Chinese labels while preserving English search data", () => {
  const exercise = {
    id: 42,
    category: { name: "Chest" },
    equipment: [{ name: "Barbell" }],
    translations: [{ language: 2, name: "Barbell Bench Press", description_source: "Lower the bar with control." }],
    images: [],
  };

  const result = normalizeExercises([exercise], {
    translations: {
      42: { name: "槓鈴臥推", cue: "控制槓鈴下放。" },
    },
  }).records[0];

  assert.equal(result.name.zhTW, "槓鈴臥推");
  assert.equal(result.name.en, "Barbell Bench Press");
  assert.equal(result.cue.zhTW, "控制槓鈴下放。");
  assert.ok(result.searchTerms.includes("Barbell Bench Press"));
});
