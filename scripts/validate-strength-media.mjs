import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function readGeneratedRecords(root) {
  const directory = path.join(root, "src/domain/strengthCatalog/generated");
  const files = (await fs.readdir(directory)).filter((file) => file.endsWith(".ts") && file !== "manifest.ts");
  const records = [];
  for (const file of files) {
    const source = await fs.readFile(path.join(directory, file), "utf8");
    const start = source.indexOf("export const records = ") + "export const records = ".length;
    const json = source.slice(start).replace(/;\s*$/, "");
    records.push(...JSON.parse(json));
  }
  return records;
}

function isExternalImage(imageUrl) {
  return typeof imageUrl === "string" && /^https?:\/\//i.test(imageUrl);
}

async function isLocalImage(root, imageUrl) {
  if (typeof imageUrl !== "string" || !imageUrl.startsWith("/")) return false;
  try {
    await fs.access(path.join(root, "public", imageUrl.replace(/^\/+/, "")));
    return true;
  } catch {
    return false;
  }
}

async function readReviewedOverrides(root) {
  const source = await fs.readFile(
    path.join(root, "src/domain/strengthCatalog/reviewedOverrides.json"),
    "utf8"
  );
  return JSON.parse(source);
}

export async function validateCatalogMedia({ root }) {
  const records = await readGeneratedRecords(root);
  const missing = [];
  const invalid = [];
  for (const record of records) {
    if (!record.imageUrl) {
      missing.push({ id: record.id, category: record.category, name: record.name?.en });
    } else if (!isExternalImage(record.imageUrl) && !(await isLocalImage(root, record.imageUrl))) {
      invalid.push({ id: record.id, imageUrl: record.imageUrl });
    }
  }
  const reviewedOverrides = await readReviewedOverrides(root);
  const reviewedInvalid = [];
  for (const [id, override] of Object.entries(reviewedOverrides)) {
    if (!(await isLocalImage(root, override.imageUrl))) {
      reviewedInvalid.push({ id, imageUrl: override.imageUrl });
    }
  }
  return { total: records.length, missing, invalid, reviewedInvalid };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const result = await validateCatalogMedia({ root });
  console.log(JSON.stringify({
    total: result.total,
    missing: result.missing.length,
    invalid: result.invalid.length,
    reviewedInvalid: result.reviewedInvalid.length,
  }, null, 2));
  if (result.missing.length || result.invalid.length || result.reviewedInvalid.length) process.exitCode = 1;
}
