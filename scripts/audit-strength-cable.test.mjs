import assert from "node:assert/strict";
import test from "node:test";

const cableAudit = await import("./audit-strength-cable.mjs").catch(() => ({}));
const inferCableFamilyId = cableAudit.inferCableFamilyId ?? (() => undefined);
const validateCableFamilyAssignments = cableAudit.validateCableFamilyAssignments ?? (() => ({
  missingFamily: [],
  genericFallback: [],
  invalidFamily: [],
  duplicateFamilyViolations: [],
}));

test("separates cable families by height grip attachment and laterality", () => {
  const cases = [
    ["Low Pulley Cable Fly", "chest", "cable-chest-fly-low"],
    ["Cable Fly Middle Chest", "chest", "cable-chest-fly-mid"],
    ["Cable Fly Upper Chest", "chest", "cable-chest-fly-high"],
    ["Wide-grip Pulldown", "back", "cable-pulldown-wide"],
    ["Neutral Grip Lat Pulldown", "back", "cable-pulldown-neutral"],
    ["Seated V-Grip Row", "back", "cable-row-seated"],
    ["Unilateral Cable row", "back", "cable-row-single-arm"],
    ["Tricep Rope Pushdowns", "arms", "cable-pushdown-rope"],
    ["Single-arm cable pushdown", "arms", "cable-pushdown-single-arm"],
    ["Bayesian Curl", "arms", "cable-curl-bayesian"],
    ["Cable Woodchoppers", "core", "cable-core-rotation"],
  ];

  for (const [name, category, expected] of cases) {
    assert.equal(inferCableFamilyId({ name: { en: name }, category, equipment: "cable" }), expected);
  }
});

test("reports missing invalid and generic cable assignments", () => {
  const families = [{ id: "cable-row-seated" }];
  const result = validateCableFamilyAssignments([
    { id: "missing", equipment: "cable", imageUrl: "/assets/strength/reviewed/cable/row.webp" },
    { id: "invalid", equipment: "cable", mediaFamilyId: "unknown", imageUrl: "/assets/strength/reviewed/cable/row.webp" },
    { id: "generic", equipment: "cable", mediaFamilyId: "cable-row-seated", imageUrl: "/assets/strength/generated/back.webp" },
  ], families);

  assert.deepEqual(result.missingFamily, ["missing"]);
  assert.deepEqual(result.invalidFamily, ["invalid"]);
  assert.deepEqual(result.genericFallback, ["generic"]);
});
