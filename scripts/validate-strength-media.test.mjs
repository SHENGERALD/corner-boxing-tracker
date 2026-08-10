import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCatalogMedia } from "./validate-strength-media.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("every generated strength drill has valid external or local media", async () => {
  const result = await validateCatalogMedia({ root });
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.invalid, []);
  assert.deepEqual(result.reviewedInvalid, []);
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
