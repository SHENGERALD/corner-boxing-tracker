import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GENERIC_MEDIA_PATTERN = /\/assets\/strength\/generated\//;

function exerciseText(record) {
  return `${record?.name?.en ?? ""} ${record?.cue?.en ?? ""}`.toLowerCase();
}

function expectedEquipment(record) {
  const name = String(record?.name?.en ?? "").toLowerCase();
  const text = exerciseText(record);
  if (/weighted push[ -]?ups?/.test(name)) return "bodyweight";
  if (record?.equipment === "hammer" && /hack squat/.test(name)) return "hammer";
  if (/smith machine/.test(name)) return "machine";
  if (/\b(cable|pulley|polea)\b/.test(name)) return "cable";
  if (/\b(dumbbell|dumbbells|db)\b/.test(text)) return "dumbbell";
  if (/\b(kettlebell|kettlebells)\b/.test(text)) return "kettlebell";
  if (/\b(barbell|ez[ -]?bar|weight plate|with plates)\b/.test(text)) return "barbell";
  if (/\b(push[ -]?up|l[ -]?sit)\b/.test(name) || /\bbodyweight\b/.test(text)) return "bodyweight";
  return undefined;
}

export function auditStrengthIcons(records) {
  const genericPlaceholders = records.filter((record) =>
    GENERIC_MEDIA_PATTERN.test(String(record.imageUrl ?? ""))
  );
  const reviewedMissingMedia = records.filter((record) =>
    record.imageSource === "Corner generated"
      && !GENERIC_MEDIA_PATTERN.test(String(record.imageUrl ?? ""))
      && !record.imageUrl
  );
  const equipmentConflicts = [];
  for (const record of records) {
    const expected = expectedEquipment(record);
    if (expected && expected !== record.equipment) {
      equipmentConflicts.push({ id: record.id, current: record.equipment, expected });
    }
  }
  return { genericPlaceholders, reviewedMissingMedia, equipmentConflicts };
}

async function readMergedCatalog(root) {
  const directory = path.join(root, "src/domain/strengthCatalog/generated");
  const files = (await fs.readdir(directory)).filter((file) => file.endsWith(".ts") && file !== "manifest.ts");
  const records = [];
  for (const file of files) {
    const source = await fs.readFile(path.join(directory, file), "utf8");
    const marker = "export const records = ";
    records.push(...JSON.parse(source.slice(source.indexOf(marker) + marker.length).replace(/;\s*$/, "")));
  }
  const overrides = JSON.parse(await fs.readFile(path.join(root, "src/domain/strengthCatalog/reviewedOverrides.json"), "utf8"));
  return records.map((record) => ({ ...record, ...(overrides[record.id] ?? {}) }));
}

async function writeAuditReport(root) {
  const records = await readMergedCatalog(root);
  const audit = auditStrengthIcons(records);
  const genericByEquipment = Object.fromEntries(
    [...new Set(audit.genericPlaceholders.map((record) => record.equipment))]
      .sort()
      .map((equipment) => [equipment, audit.genericPlaceholders.filter((record) => record.equipment === equipment).length])
  );
  const report = {
    checked: records.length,
    reviewedMovementMedia: records.length - audit.genericPlaceholders.length,
    genericPlaceholders: audit.genericPlaceholders.length,
    genericByEquipment,
    reviewedMissingMedia: audit.reviewedMissingMedia,
    equipmentConflicts: audit.equipmentConflicts,
    genericRecords: audit.genericPlaceholders,
  };
  const output = path.join(root, "scripts/strength-icon-audit-report.json");
  await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ...report, genericRecords: undefined }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await writeAuditReport(process.cwd());
}
