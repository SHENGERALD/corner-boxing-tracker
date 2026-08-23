import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const report = JSON.parse(await fs.readFile(path.join(root, "scripts/strength-icon-audit-report.json"), "utf8"));
const records = report.genericRecords;
const batches = [];

for (let offset = 0; offset < records.length; offset += 9) {
  const items = records.slice(offset, offset + 9).map((record) => ({
    id: record.id,
    category: record.category,
    equipment: record.equipment,
    name: record.name,
    cue: record.cue,
  }));
  const panels = items.map((item, index) => {
    const cue = String(item.cue?.en ?? "").replace(/\s+/g, " ").slice(0, 220);
    return `${index + 1}. ${item.name?.en || item.name?.zhTW} (${item.equipment}; ${item.category})${cue ? `: ${cue}` : ""}`;
  });
  batches.push({
    index: batches.length,
    items,
    prompt: [
      "Create one square 3-by-3 contact sheet for the Corner exercise database.",
      "Exactly nine equal square panels, read left-to-right and top-to-bottom, with thin light-gray gutters.",
      "Use a warm off-white background and consistent classic wger-like graphite pencil figures. Highlight only the working muscles in orange.",
      "No text, numbers, logos, watermarks, outer border, or black background. Keep one full athlete and all equipment centered inside each panel with safe margins.",
      "Do not merge figures or equipment across panels. Make each named exercise mechanically accurate; the exercise name is authoritative if its cue is unclear.",
      ...panels,
    ].join("\n"),
  });
}

await fs.writeFile(
  path.join(root, "scripts/strength-icon-batches.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), total: records.length, batches }, null, 2)}\n`
);
console.log(JSON.stringify({ total: records.length, batches: batches.length }, null, 2));
