import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCatalogMedia } from "./validate-strength-media.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewedOverrideIdPattern = /^(wger-\d+|[a-z0-9]+(?:-[a-z0-9]+)*)$/;

test("every generated strength drill has valid external or local media", async () => {
  const result = await validateCatalogMedia({ root });
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.invalid, []);
  assert.deepEqual(result.reviewedInvalid, []);
  assert.deepEqual(result.cableMissingFamily, []);
  assert.deepEqual(result.cableGenericFallback, []);
  assert.deepEqual(result.forbiddenLocalization, []);
  assert.deepEqual(result.unknownReviewedIds, []);
  assert.deepEqual(result.duplicateIds, []);
});

test("every generated strength drill has a Chinese title and cue", async () => {
  const directory = path.join(root, "src/domain/strengthCatalog/generated");
  const files = (await fs.readdir(directory)).filter((file) => file.endsWith(".ts") && file !== "manifest.ts");
  const records = [];
  for (const file of files) {
    const source = await fs.readFile(path.join(directory, file), "utf8");
    records.push(...JSON.parse(source.replace(/^export const records = /, "").replace(/;\s*$/, "")));
  }
  const hasChinese = (value) => /[\u3400-\u9fff]/.test(String(value ?? ""));

  assert.deepEqual(records.filter((record) => !hasChinese(record.name?.zhTW)).map((record) => record.id), []);
  assert.deepEqual(records.filter((record) => !hasChinese(record.cue?.zhTW)).map((record) => record.id), []);
});

test("reviewed media schema has valid families and override references", async () => {
  const familiesPath = path.join(root, "src/domain/strengthCatalog/mediaFamilies.json");
  const overridesPath = path.join(root, "src/domain/strengthCatalog/reviewedOverrides.json");
  const familyList = await fs.readFile(familiesPath, "utf8")
    .then((source) => JSON.parse(source))
    .catch(() => []);
  const overrides = JSON.parse(await fs.readFile(overridesPath, "utf8"));
  const familyIds = new Set();

  assert.ok(familyList.length > 0, "reviewed media families must be declared");
  for (const family of familyList) {
    assert.equal(typeof family.id, "string");
    assert.notEqual(family.id.trim(), "");
    assert.equal(typeof family.label?.zhTW, "string");
    assert.equal(typeof family.label?.en, "string");
    assert.notEqual(family.label.zhTW.trim(), "");
    assert.notEqual(family.label.en.trim(), "");
    assert.equal(typeof family.imageUrl, "string");
    assert.match(family.imageUrl, /^\/assets\/strength\/reviewed\//);
    assert.equal(familyIds.has(family.id), false, `duplicate media family id: ${family.id}`);
    familyIds.add(family.id);
  }

  for (const [id, override] of Object.entries(overrides)) {
    assert.match(id, reviewedOverrideIdPattern);
    if (override.mediaFamilyId) {
      assert.equal(
        familyIds.has(override.mediaFamilyId),
        true,
        `unknown media family ${override.mediaFamilyId} on ${id}`
      );
    }
  }
});
