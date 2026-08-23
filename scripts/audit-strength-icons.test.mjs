import assert from "node:assert/strict";
import test from "node:test";
import { auditStrengthIcons } from "./audit-strength-icons.mjs";

test("separates generic placeholders from reviewed movement media", () => {
  const result = auditStrengthIcons([
    { id: "generic", name: { en: "Incline Push-up" }, equipment: "bodyweight", imageUrl: "/assets/strength/generated/chest.webp" },
    { id: "reviewed", name: { en: "Pullover Machine" }, equipment: "machine", imageUrl: "/assets/strength/reviewed/machine-pullover.webp" },
  ]);

  assert.deepEqual(result.genericPlaceholders.map((record) => record.id), ["generic"]);
  assert.deepEqual(result.reviewedMissingMedia, []);
});

test("flags high-confidence equipment contradictions", () => {
  const result = auditStrengthIcons([
    { id: "pushup", name: { en: "Incline Push-up" }, cue: { en: "Bodyweight exercise" }, equipment: "machine", imageUrl: "/x.webp" },
    { id: "cable", name: { en: "Cable Lateral Raise" }, cue: { en: "Use a low pulley" }, equipment: "machine", imageUrl: "/x.webp" },
    { id: "curl", name: { en: "DB Spider Curl" }, cue: { en: "Use dumbbells" }, equipment: "machine", imageUrl: "/x.webp" },
  ]);

  assert.deepEqual(result.equipmentConflicts, [
    { id: "pushup", current: "machine", expected: "bodyweight" },
    { id: "cable", current: "machine", expected: "cable" },
    { id: "curl", current: "machine", expected: "dumbbell" },
  ]);
});

test("does not mistake Smith machine movements for free-barbell work", () => {
  const result = auditStrengthIcons([
    { id: "smith", equipment: "machine", name: { en: "Smith Machine Shoulder Press" }, cue: { en: "Press the barbell overhead." } },
  ]);

  assert.deepEqual(result.equipmentConflicts, []);
});
