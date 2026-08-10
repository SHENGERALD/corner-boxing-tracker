import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCatalogMedia } from "./validate-strength-media.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("every generated strength drill has valid external or local media", async () => {
  const result = await validateCatalogMedia({ root });
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.invalid, []);
});
