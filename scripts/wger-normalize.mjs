const CATEGORY_MAP = new Map([
  ["abs", "core"],
  ["arms", "arms"],
  ["back", "back"],
  ["calves", "calves"],
  ["cardio", "cardio"],
  ["chest", "chest"],
  ["legs", "legs"],
  ["shoulders", "shoulders"],
  ["stretching", "mobility"],
  ["mobility", "mobility"],
  ["flexibility", "mobility"],
  ["rehabilitation", "mobility"],
]);

const EQUIPMENT_MAP = [
  ["hammer strength", "hammer"],
  ["hammer", "hammer"],
  ["cable", "cable"],
  ["barbell", "barbell"],
  ["sz-bar", "barbell"],
  ["dumbbell", "dumbbell"],
  ["kettlebell", "kettlebell"],
  ["machine", "machine"],
  ["bench", "machine"],
  ["pull-up bar", "bodyweight"],
  ["resistance band", "bodyweight"],
  ["gym mat", "bodyweight"],
  ["swiss ball", "bodyweight"],
  ["none", "bodyweight"],
];

const MOBILITY_TERMS = /stretch|mobil|flexib|rehab|foam roll|warm.?up|cool.?down|world.?s greatest|cossack|cat.?cow|hip airplane|thoracic rotation/i;

function cleanText(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function firstTranslation(exercise) {
  const translations = Array.isArray(exercise?.translations) ? exercise.translations : [];
  return translations.find((translation) => translation?.language === 2 || translation?.language === "en")
    ?? translations.find((translation) => typeof translation?.name === "string" && translation.name.trim())
    ?? null;
}

function exerciseSearchText(exercise) {
  const translations = Array.isArray(exercise?.translations) ? exercise.translations : [];
  return [
    exercise?.category?.name,
    exercise?.name,
    ...translations.flatMap((translation) => [
      translation?.name,
      ...(Array.isArray(translation?.aliases) ? translation.aliases.map((alias) => alias?.alias) : []),
    ]),
  ].filter(Boolean).join(" ");
}

export function normalizeCategory(input) {
  const categoryValue = typeof input === "string"
    ? input
    : input?.category?.name ?? input?.category ?? "";
  const category = String(categoryValue).trim().toLowerCase();
  const searchText = exerciseSearchText(input).toLowerCase();

  if (MOBILITY_TERMS.test(searchText) || MOBILITY_TERMS.test(category)) return "mobility";
  return CATEGORY_MAP.get(category) ?? null;
}

export function normalizeEquipment(input) {
  const rawEquipment = typeof input === "string"
    ? input
    : input?.equipment;
  const names = (Array.isArray(rawEquipment) ? rawEquipment : [rawEquipment])
    .map((equipment) => typeof equipment === "string" ? equipment : equipment?.name)
    .filter(Boolean)
    .map((name) => String(name).trim().toLowerCase());

  for (const [needle, value] of EQUIPMENT_MAP) {
    if (names.some((name) => name.includes(needle))) return value;
  }
  return "bodyweight";
}

export function toStableId(input) {
  const id = input?.id ?? input?.sourceId;
  if (id === undefined || id === null || id === "") throw new Error("Missing wger source id");
  return "wger-" + String(id);
}

function normalizeName(value) {
  return cleanText(value).toLocaleLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gi, " ").trim();
}

export function isDuplicateMovement(existing, candidate) {
  const candidateId = String(candidate?.id ?? "");
  const candidateName = normalizeName(candidate?.name?.en ?? candidate?.name ?? "");
  return existing.some((movement) => {
    const movementId = String(movement?.id ?? "");
    const movementName = normalizeName(movement?.name?.en ?? movement?.name ?? "");
    return (candidateId && movementId && candidateId === movementId) || (candidateName && movementName && candidateName === movementName);
  });
}

export function isUsableImageUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function selectImage(exercise) {
  const images = Array.isArray(exercise?.images) ? [...exercise.images] : [];
  images.sort((a, b) => Number(Boolean(b?.is_main)) - Number(Boolean(a?.is_main)));
  for (const image of images) {
    const candidates = [
      image?.image,
      image?.thumbnails?.medium,
      image?.thumbnails?.small,
    ];
    const url = candidates.find(isUsableImageUrl);
    if (url) return url;
  }
  return undefined;
}

function getCue(translation, name) {
  const description = cleanText(translation?.description_source ?? translation?.description);
  if (!description) return name;
  return description.split(/(?<=[.!?。！？])\s+/)[0].slice(0, 180) || name;
}

function getSearchTerms(exercise, label, category, equipment) {
  const translations = Array.isArray(exercise?.translations) ? exercise.translations : [];
  return [...new Set([
    label.en,
    label.zhTW,
    category,
    equipment,
    ...translations.flatMap((translation) => [
      translation?.name,
      ...(Array.isArray(translation?.aliases) ? translation.aliases.map((alias) => alias?.alias) : []),
    ]),
  ].map(cleanText).filter(Boolean))];
}

export function normalizeExercise(exercise, { report = { missingMedia: [] }, localized } = {}) {
  const translation = firstTranslation(exercise);
  const englishName = cleanText(translation?.name ?? exercise?.name);
  if (!englishName) throw new Error("Exercise is missing an English name");

  const category = normalizeCategory(exercise);
  if (!category) throw new Error("Exercise has an unsupported category");

  const equipment = normalizeEquipment(exercise);
  const imageUrl = selectImage(exercise);
  const id = toStableId(exercise);
  const englishCue = getCue(translation, englishName);
  const label = { zhTW: cleanText(localized?.name) || englishName, en: englishName };
  if (!imageUrl) report.missingMedia.push({ sourceId: exercise.id, name: englishName });

  const isTimed = category === "cardio" || category === "mobility";
  const result = {
    id,
    sourceId: exercise.id,
    domain: "strength",
    category,
    name: label,
    cue: { zhTW: cleanText(localized?.cue) || englishCue, en: englishCue },
    defaultUnit: isTimed ? "minutes" : "rounds",
    defaultQuantity: category === "cardio" ? 20 : category === "mobility" ? 8 : 3,
    equipment,
    searchTerms: getSearchTerms(exercise, label, category, equipment),
    imageSource: imageUrl ? "wger" : "Corner generated",
  };
  if (imageUrl) result.imageUrl = imageUrl;
  return result;
}

export function normalizeExercises(exercises, { existing = [], report = {}, translations = {} } = {}) {
  const output = [];
  const seen = [...existing];
  const nextReport = {
    missingMedia: report.missingMedia ?? [],
    duplicates: report.duplicates ?? [],
    invalid: report.invalid ?? [],
  };

  for (const exercise of exercises) {
    try {
      const missingMediaStart = nextReport.missingMedia.length;
      const candidate = normalizeExercise(exercise, {
        report: nextReport,
        localized: translations[String(exercise?.id ?? "")],
      });
      if (isDuplicateMovement(seen, candidate)) {
        nextReport.missingMedia.splice(missingMediaStart);
        nextReport.duplicates.push({ sourceId: exercise.id, name: candidate.name.en });
        continue;
      }
      seen.push(candidate);
      output.push(candidate);
    } catch (error) {
      nextReport.invalid.push({ sourceId: exercise?.id ?? null, reason: error.message });
    }
  }

  return { records: output, report: nextReport };
}
