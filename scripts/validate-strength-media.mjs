import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCableFamilyAssignments } from "./audit-strength-cable.mjs";
import { findLocalizationIssues } from "./strength-localization.mjs";

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

async function readMediaFamilies(root) {
  const source = await fs.readFile(
    path.join(root, "src/domain/strengthCatalog/mediaFamilies.json"),
    "utf8"
  );
  return JSON.parse(source);
}

async function readBaselineIds(root) {
  const source = await fs.readFile(path.join(root, "src/domain/strengthData.ts"), "utf8");
  return new Set([...source.matchAll(/(?:strength|cardio)\("([^"]+)"/g)].map((match) => match[1]));
}

export async function validateCatalogMedia({ root }) {
  const records = await readGeneratedRecords(root);
  const reviewedOverrides = await readReviewedOverrides(root);
  const mergedRecords = records.map((record) => ({ ...record, ...(reviewedOverrides[record.id] ?? {}) }));
  const missing = [];
  const invalid = [];
  for (const record of mergedRecords) {
    if (!record.imageUrl) {
      missing.push({ id: record.id, category: record.category, name: record.name?.en });
    } else if (!isExternalImage(record.imageUrl) && !(await isLocalImage(root, record.imageUrl))) {
      invalid.push({ id: record.id, imageUrl: record.imageUrl });
    }
  }
  const reviewedInvalid = [];
  for (const [id, override] of Object.entries(reviewedOverrides)) {
    if (!override.imageUrl) continue;
    if (!(await isLocalImage(root, override.imageUrl))) {
      reviewedInvalid.push({ id, imageUrl: override.imageUrl });
    }
  }
  const cableAudit = validateCableFamilyAssignments(mergedRecords, await readMediaFamilies(root));
  const forbiddenLocalization = findLocalizationIssues(mergedRecords);
  const knownIds = new Set([...records.map((record) => record.id), ...await readBaselineIds(root)]);
  const unknownReviewedIds = Object.keys(reviewedOverrides).filter((id) => !knownIds.has(id));
  const counts = new Map();
  for (const record of records) counts.set(record.id, (counts.get(record.id) ?? 0) + 1);
  const duplicateIds = [...counts].filter(([, count]) => count > 1).map(([id]) => id);
  return {
    total: records.length,
    missing,
    invalid,
    reviewedInvalid,
    cableMissingFamily: cableAudit.missingFamily,
    cableGenericFallback: cableAudit.genericFallback,
    forbiddenLocalization,
    unknownReviewedIds,
    duplicateIds,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const result = await validateCatalogMedia({ root });
  console.log(JSON.stringify({
    total: result.total,
    missing: result.missing.length,
    invalid: result.invalid.length,
    reviewedInvalid: result.reviewedInvalid.length,
    cableMissingFamily: result.cableMissingFamily.length,
    cableGenericFallback: result.cableGenericFallback.length,
    forbiddenLocalization: result.forbiddenLocalization.length,
    unknownReviewedIds: result.unknownReviewedIds.length,
    duplicateIds: result.duplicateIds.length,
  }, null, 2));
  if (Object.entries(result).some(([key, value]) => key !== "total" && Array.isArray(value) && value.length)) {
    process.exitCode = 1;
  }
}
