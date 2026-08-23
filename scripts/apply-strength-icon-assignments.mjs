import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const overridesPath = path.join(root, "src/domain/strengthCatalog/reviewedOverrides.json");
const assignmentsPath = path.join(root, "scripts/strength-icon-assignments.json");
const overrides = JSON.parse(await fs.readFile(overridesPath, "utf8"));
const assignments = JSON.parse(await fs.readFile(assignmentsPath, "utf8"));

for (const [id, assignment] of Object.entries(assignments)) {
  const { imageUrl, imageSource } = assignment;
  overrides[id] = { ...(overrides[id] ?? {}), imageUrl, imageSource };
}

await fs.writeFile(overridesPath, `${JSON.stringify(overrides, null, 2)}\n`);
console.log(JSON.stringify({ applied: Object.keys(assignments).length }, null, 2));
