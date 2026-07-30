import type { CustomTrainingItem, Language, TrainingRecord, TrainingSet } from "./types";
import type { Drill } from "./drills";

export const STORAGE_KEY = "boxing-tracker-v1";

export interface AppState {
  version: 2;
  language: Language;
  records: Record<string, TrainingRecord>;
  favoriteDrillIds: string[];
  customDrills?: Drill[];
}

interface V1AppState {
  version: 1;
  language: Language;
  records: Record<string, TrainingRecord>;
}

export function createEmptyState(): AppState {
  return {
    version: 2,
    language: "zh-TW",
    records: {},
    favoriteDrillIds: [],
    customDrills: [],
  };
}

function isLocalizedLabel(value: unknown): value is { zhTW: string; en: string } {
  if (!value || typeof value !== "object") return false;
  const label = value as Record<string, unknown>;
  return typeof label.zhTW === "string" && typeof label.en === "string";
}

function isCustomDrill(value: unknown): value is Drill {
  if (!value || typeof value !== "object") return false;
  const drill = value as Record<string, unknown>;
  return (
    typeof drill.id === "string" &&
    ["fundamentals", "footwork", "offense", "defense", "equipment", "conditioning", "chest", "back", "legs", "shoulders", "core"].includes(drill.category as string) &&
    (drill.domain === "boxing" || drill.domain === "strength") &&
    isLocalizedLabel(drill.name) &&
    isLocalizedLabel(drill.cue) &&
    (drill.defaultUnit === "rounds" || drill.defaultUnit === "minutes") &&
    typeof drill.defaultQuantity === "number" && drill.defaultQuantity > 0
  );
}

function isTrainingRecord(value: unknown): value is TrainingRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const customItems = record.customItems;
  const itemSetLogs = record.itemSetLogs;
  return (
    Array.isArray(record.completedItemIds) &&
    record.completedItemIds.every((item) => typeof item === "string") &&
    (record.removedItemIds === undefined || (Array.isArray(record.removedItemIds) && record.removedItemIds.every((item) => typeof item === "string"))) &&
    (customItems === undefined ||
      (Array.isArray(customItems) && customItems.every(isCustomTrainingItem))) &&
    (itemSetLogs === undefined || isItemSetLogs(itemSetLogs))
  );
}

function isTrainingSet(value: unknown): value is TrainingSet {
  if (!value || typeof value !== "object") return false;
  const set = value as Record<string, unknown>;
  return (
    typeof set.id === "string" &&
    (set.weight === undefined || (typeof set.weight === "number" && set.weight >= 0)) &&
    (set.weightUnit === undefined || set.weightUnit === "kg" || set.weightUnit === "lb") &&
    (set.reps === undefined || (typeof set.reps === "number" && set.reps >= 0)) &&
    (set.durationSeconds === undefined || (typeof set.durationSeconds === "number" && set.durationSeconds >= 0)) &&
    (set.durationText === undefined || typeof set.durationText === "string") &&
    typeof set.completed === "boolean"
  );
}

function isItemSetLogs(value: unknown): value is Record<string, TrainingSet[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(([itemId, sets]) =>
    typeof itemId === "string" && Array.isArray(sets) && sets.every(isTrainingSet)
  );
}

function isCustomTrainingItem(value: unknown): value is CustomTrainingItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.drillId === "string" &&
    typeof item.quantity === "number" &&
    item.quantity > 0 &&
    (item.unit === "rounds" || item.unit === "minutes") &&
    typeof item.completed === "boolean" &&
    (item.note === undefined || typeof item.note === "string")
  );
}

function normalizeRecord(record: TrainingRecord): TrainingRecord {
  return { ...record, removedItemIds: record.removedItemIds ?? [], customItems: record.customItems ?? [], itemSetLogs: record.itemSetLogs ?? {} };
}

function migrateV1State(state: V1AppState): AppState {
  return {
    version: 2,
    language: state.language,
    favoriteDrillIds: [],
    customDrills: [],
    records: Object.fromEntries(
      Object.entries(state.records).map(([key, record]) => [key, normalizeRecord(record)])
    ),
  };
}

function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") return false;
  const state = value as Record<string, unknown>;
  if (
    state.version !== 2 ||
    (state.language !== "zh-TW" && state.language !== "en") ||
    !state.records ||
    typeof state.records !== "object" ||
    Array.isArray(state.records) ||
    !Array.isArray(state.favoriteDrillIds) ||
    !state.favoriteDrillIds.every((id) => typeof id === "string") ||
    (state.customDrills !== undefined && (!Array.isArray(state.customDrills) || !state.customDrills.every(isCustomDrill)))
  ) {
    return false;
  }
  return Object.values(state.records).every(isTrainingRecord);
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadState(): AppState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createEmptyState();

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isAppState(parsed)) return parsed;
    if (isV1AppState(parsed)) return migrateV1State(parsed);
    return createEmptyState();
  } catch {
    return createEmptyState();
  }
}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importState(raw: string): AppState {
  try {
    const parsed: unknown = JSON.parse(raw);
    const state = isAppState(parsed)
      ? parsed
      : isV1AppState(parsed)
        ? migrateV1State(parsed)
        : undefined;
    if (!state) throw new Error("Invalid backup");
    saveState(state);
    return state;
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid backup") {
      throw error;
    }
    throw new Error("Invalid backup");
  }
}

function isV1AppState(value: unknown): value is V1AppState {
  if (!value || typeof value !== "object") return false;
  const state = value as Record<string, unknown>;
  return (
    state.version === 1 &&
    (state.language === "zh-TW" || state.language === "en") &&
    Boolean(state.records) &&
    typeof state.records === "object" &&
    state.records !== null &&
    !Array.isArray(state.records) &&
    Object.values(state.records).every(isTrainingRecord)
  );
}
