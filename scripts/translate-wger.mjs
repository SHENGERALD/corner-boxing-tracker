import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedDir = path.join(root, "src/domain/strengthCatalog/generated");
const cachePath = path.join(root, "scripts/wger-zh-TW-cache.json");
const translateUrl = process.env.TRANSLATE_API_URL ?? "https://translate.googleapis.com/translate_a/single";
const categoryOrder = ["chest", "back", "legs", "shoulders", "arms", "core", "calves", "mobility", "cardio"];
const categoryLabels = {
  chest: "胸部",
  back: "背部",
  legs: "腿部",
  shoulders: "肩部",
  arms: "手臂",
  core: "核心",
  calves: "小腿",
  mobility: "活動度",
  cardio: "有氧",
};
const batchSize = Number(process.env.TRANSLATE_BATCH_SIZE ?? 12);
const hasChinese = (value) => /[\u3400-\u9fff]/.test(String(value ?? ""));

async function readGeneratedRecords() {
  const records = [];
  for (const category of categoryOrder) {
    const source = await fs.readFile(path.join(generatedDir, category + ".ts"), "utf8");
    const json = source.replace(/^export const records = /, "").replace(/;\s*$/, "");
    records.push(...JSON.parse(json));
  }
  return records;
}

async function readCache() {
  try {
    return JSON.parse(await fs.readFile(cachePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

function getTranslatedText(payload) {
  if (!Array.isArray(payload?.[0])) throw new Error("Unexpected translation response");
  return payload[0].map((part) => part?.[0] ?? "").join("");
}

function parseMarkedLines(text, expectedCount) {
  const values = new Map();
  const pattern = /⟦(\d+)⟧\s*([\s\S]*?)(?=⟦\d+⟧|$)/g;
  for (const match of text.matchAll(pattern)) values.set(Number(match[1]), match[2].trim());
  if (values.size !== expectedCount) {
    throw new Error(`Translation markers incomplete: expected ${expectedCount}, received ${values.size}`);
  }
  return Array.from({ length: expectedCount }, (_, index) => values.get(index) ?? "");
}

async function translateLines(lines) {
  const body = new URLSearchParams({
    client: "gtx",
    sl: "auto",
    tl: "zh-TW",
    dt: "t",
    q: lines.map((line, index) => `⟦${index}⟧ ${line}`).join("\n"),
  });
  const response = await fetch(translateUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body,
  });
  if (!response.ok) throw new Error("Translation request failed: " + response.status);
  return parseMarkedLines(getTranslatedText(await response.json()), lines.length);
}

async function translateWithRetry(lines) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await translateLines(lines);
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError;
}

async function writeCache(cache) {
  await fs.writeFile(cachePath, JSON.stringify(cache, null, 2) + "\n");
}

async function main() {
  const records = await readGeneratedRecords();
  const cache = await readCache();
  const pending = records.filter((record) => {
    const localized = cache[String(record.sourceId)];
    return !hasChinese(localized?.name) || !hasChinese(localized?.cue);
  });

  for (let offset = 0; offset < pending.length; offset += batchSize) {
    const batch = pending.slice(offset, offset + batchSize);
    const lines = batch.flatMap((record) => [record.name.en, record.cue.en]);
    const translated = await translateWithRetry(lines);
    for (let index = 0; index < translated.length; index += 1) {
      if (!hasChinese(translated[index])) {
        translated[index] = (await translateWithRetry([lines[index]]))[0];
      }
    }
    batch.forEach((record, index) => {
      cache[String(record.sourceId)] = {
        name: hasChinese(translated[index * 2])
          ? translated[index * 2]
          : `${categoryLabels[record.category]}動作 · ${record.name.en}`,
        cue: hasChinese(translated[index * 2 + 1])
          ? translated[index * 2 + 1]
          : "保持穩定並控制動作節奏。",
      };
    });
    await writeCache(cache);
    console.log(`Translated ${Math.min(offset + batch.length, pending.length)} / ${pending.length}`);
  }

  console.log(JSON.stringify({ records: records.length, cached: Object.keys(cache).length, translated: pending.length }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
