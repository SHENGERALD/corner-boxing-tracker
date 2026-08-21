const HAS_CHINESE = /[\u3400-\u9fff]/;
const FORBIDDEN_TERMS = /電纜|高排|回扣|飛翼|旋度|拒絕/;

const exactExerciseNames = new Map([
  ["cable curl", "滑輪彎舉"],
  ["cable curls", "滑輪彎舉"],
  ["cable fly", "滑輪飛鳥"],
  ["cable flye", "滑輪飛鳥"],
  ["cable flyes", "滑輪飛鳥"],
  ["high row", "高位划船"],
  ["cable tricep kickback", "滑輪三頭肌後踢"],
  ["cable triceps kickback", "滑輪三頭肌後踢"],
]);

const literalCorrections = [
  [/低(?:位)?滑輪(?:電纜|滑輪)?(?:門襟|飛翼|飛鳥)/g, "低位滑輪飛鳥"],
  [/高(?:位)?滑輪(?:電纜|滑輪)?(?:門襟|飛翼|飛鳥)/g, "高位滑輪飛鳥"],
  [/電纜/g, "滑輪"],
  [/飛翼/g, "飛鳥"],
  [/旋度/g, "彎舉"],
  [/高排/g, "高位划船"],
  [/回扣/g, "後踢"],
  [/拒絕(?=臥推|推胸|推舉)/g, "下斜"],
];

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizedEnglishKey(value) {
  return cleanText(value).toLocaleLowerCase().replace(/[–—-]+/g, " ");
}

export function normalizeTaiwanTerms(text, context = {}) {
  const source = cleanText(text);
  if (!source) return source;

  const exact = exactExerciseNames.get(normalizedEnglishKey(source));
  if (exact) return exact;

  let normalized = /decline/i.test(cleanText(context.englishName))
    ? source.replace(/拒絕/g, "下斜")
    : source;
  for (const [pattern, replacement] of literalCorrections) {
    normalized = normalized.replace(pattern, replacement);
  }

  if (normalized !== source || HAS_CHINESE.test(normalized)) return normalized;

  const englishName = normalizedEnglishKey(context.englishName ?? source);
  if (/^low pulley cable fly(?:e|es)?$/.test(englishName)) return "低位滑輪飛鳥";
  if (/^high pulley cable fly(?:e|es)?$/.test(englishName)) return "高位滑輪飛鳥";
  if (/^cable row$/.test(englishName)) return "滑輪划船";
  if (/^cable pulldown$/.test(englishName)) return "滑輪下拉";

  return source;
}

export function reviewLocalizedRecord(record, overrides = {}) {
  const override = overrides[record.id] ?? {};
  const normalizedName = normalizeTaiwanTerms(record.name?.zhTW || record.name?.en, {
    equipment: record.equipment,
    englishName: record.name?.en,
  });
  const normalizedCue = normalizeTaiwanTerms(record.cue?.zhTW || record.cue?.en, {
    equipment: record.equipment,
    englishName: record.name?.en,
  });

  return {
    ...record,
    ...override,
    name: {
      ...record.name,
      zhTW: cleanText(override.name?.zhTW) || normalizedName,
    },
    cue: {
      ...record.cue,
      zhTW: cleanText(override.cue?.zhTW) || normalizedCue,
    },
    searchTerms: Array.isArray(record.searchTerms) ? [...record.searchTerms] : record.searchTerms,
  };
}

export function findLocalizationIssues(records) {
  const issues = [];
  for (const record of records) {
    for (const field of ["name", "cue"]) {
      const value = cleanText(record?.[field]?.zhTW);
      if (!HAS_CHINESE.test(value)) {
        issues.push({ id: record.id, field, issue: "missing-chinese", value });
      } else if (FORBIDDEN_TERMS.test(value)) {
        issues.push({ id: record.id, field, issue: "forbidden-term", value });
      }
    }
  }
  return issues;
}

export function hasCompleteReviewedCopy(override) {
  return HAS_CHINESE.test(cleanText(override?.name?.zhTW))
    && HAS_CHINESE.test(cleanText(override?.cue?.zhTW));
}
