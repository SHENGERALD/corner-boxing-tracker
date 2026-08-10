import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeExercises } from "./wger-normalize.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiUrl = process.env.WGER_API_URL ?? "https://wger.de/api/v2/exerciseinfo/";
const inputPath = process.env.WGER_INPUT;
const outputDir = path.join(root, "src/domain/strengthCatalog/generated");
const reportPath = path.join(root, "scripts/wger-import-report.json");
const pageSize = Number(process.env.WGER_PAGE_SIZE ?? 100);
const categoryOrder = ["chest", "back", "legs", "shoulders", "arms", "core", "calves", "mobility", "cardio"];

async function loadJsonFile(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function fetchExercises() {
  const results = [];
  let nextUrl = new URL(apiUrl);
  nextUrl.searchParams.set("limit", String(pageSize));
  while (nextUrl) {
    const response = await fetch(nextUrl);
    if (!response.ok) throw new Error("wger API request failed: " + response.status);
    const payload = await response.json();
    if (!Array.isArray(payload.results)) throw new Error("wger API response has no results array");
    results.push(...payload.results);
    nextUrl = payload.next ? new URL(payload.next) : null;
  }
  return results;
}

function parseExistingCornerDrills(source) {
  const matches = source.matchAll(/(?:strength|cardio)\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"/g);
  return [...matches].map((match) => ({
    id: match[1],
    category: match[2],
    name: { zhTW: match[3], en: match[4] },
  }));
}

function findSourceIdCollisions(exercises) {
  const seen = new Map();
  const collisions = [];
  for (const exercise of exercises) {
    const sourceId = String(exercise?.id ?? "");
    if (!sourceId) continue;
    if (seen.has(sourceId)) collisions.push({ sourceId: exercise.id, firstIndex: seen.get(sourceId), nextIndex: exercises.indexOf(exercise) });
    else seen.set(sourceId, exercises.indexOf(exercise));
  }
  return collisions;
}

async function writeGeneratedCatalog(recordsByCategory, counts) {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  for (const category of categoryOrder) {
    const records = (recordsByCategory[category] ?? []).map((record) => record.imageUrl
      ? record
      : {
          ...record,
          imageUrl: "/assets/strength/generated/" + category + ".webp",
          imageSource: "Corner generated",
        });
    const source = "export const records = " + JSON.stringify(records, null, 2) + ";\n";
    await fs.writeFile(path.join(outputDir, category + ".ts"), source);
  }

  const manifest = [
    "export const generatedStrengthCategories = " + JSON.stringify(categoryOrder) + " as const;",
    "export const generatedStrengthCounts = " + JSON.stringify(counts, null, 2) + " as const;",
    "",
  ].join("\n");
  await fs.writeFile(path.join(outputDir, "manifest.ts"), manifest);
}

async function main() {
  const sourcePath = path.join(root, "src/domain/strengthData.ts");
  const existing = parseExistingCornerDrills(await fs.readFile(sourcePath, "utf8"));
  const exercises = inputPath
    ? (await loadJsonFile(path.resolve(inputPath))).results ?? await loadJsonFile(path.resolve(inputPath))
    : await fetchExercises();
  if (!Array.isArray(exercises)) throw new Error("Input must be an exercise array or an API payload");

  const collisions = findSourceIdCollisions(exercises);
  const report = { missingMedia: [], duplicates: [], invalid: [], collisions };
  const normalized = normalizeExercises(exercises, { existing, report });
  const recordsByCategory = Object.fromEntries(categoryOrder.map((category) => [category, []]));
  for (const record of normalized.records) {
    if (recordsByCategory[record.category]) recordsByCategory[record.category].push(record);
  }
  for (const category of categoryOrder) {
    recordsByCategory[category].sort((a, b) => a.name.en.localeCompare(b.name.en));
  }
  const counts = Object.fromEntries(categoryOrder.map((category) => [category, recordsByCategory[category].length]));

  await writeGeneratedCatalog(recordsByCategory, counts);
  const outputReport = {
    source: apiUrl,
    sourceLicense: "wger initial exercise data: CC BY-SA 3.0",
    fetchedCount: exercises.length,
    importedCount: normalized.records.length,
    skippedDuplicateCount: report.duplicates.length,
    categoryCounts: counts,
    missingMedia: report.missingMedia,
    invalid: report.invalid,
    collisions: report.collisions,
  };
  await fs.writeFile(reportPath, JSON.stringify(outputReport, null, 2) + "\n");
  console.log(JSON.stringify({
    fetched: outputReport.fetchedCount,
    imported: outputReport.importedCount,
    duplicates: outputReport.skippedDuplicateCount,
    missingMedia: outputReport.missingMedia.length,
    invalid: outputReport.invalid.length,
    collisions: outputReport.collisions.length,
    categoryCounts: outputReport.categoryCounts,
  }, null, 2));

  if (report.invalid.length || report.collisions.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
