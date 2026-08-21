import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { writeGeneratedCatalog } from "./import-wger.mjs";

test("re-import preserves reviewed copy and local media", async () => {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "corner-strength-import-"));
  const recordsByCategory = {
    arms: [{
      id: "fixture-cable-curl",
      domain: "strength",
      category: "arms",
      equipment: "cable",
      name: { zhTW: "錯誤名稱", en: "Cable Curl" },
      cue: { zhTW: "錯誤提示", en: "Curl with control" },
      imageUrl: "https://example.com/wrong.webp",
      imageSource: "wger",
    }],
  };
  const reviewedOverrides = {
    "fixture-cable-curl": {
      name: { zhTW: "滑輪彎舉", en: "Cable Curl" },
      cue: { zhTW: "手肘固定於身體兩側，控制彎舉與回放", en: "Keep the elbows still and control both directions" },
      equipment: "cable",
      mediaFamilyId: "cable-curl",
      imageUrl: "/assets/strength/reviewed/cable/curl.webp",
      imageSource: "Corner generated",
    },
  };

  await writeGeneratedCatalog({
    recordsByCategory,
    counts: { arms: 1 },
    reviewedOverrides,
    outputDir,
    categoryOrder: ["arms"],
  });

  const source = await fs.readFile(path.join(outputDir, "arms.ts"), "utf8");
  const record = JSON.parse(source.match(/export const records = (.*);/s)[1])[0];
  assert.deepEqual(record.name, reviewedOverrides[record.id].name);
  assert.deepEqual(record.cue, reviewedOverrides[record.id].cue);
  assert.equal(record.equipment, "cable");
  assert.equal(record.mediaFamilyId, "cable-curl");
  assert.equal(record.imageUrl, "/assets/strength/reviewed/cable/curl.webp");
  assert.equal(record.imageSource, "Corner generated");
});
