import type { CustomTrainingItem, DayPlan, Language, TrainingRecord, TrainingSet } from "./types";
import type { Drill } from "./drills";
import { cloneWeeklyPlan, getPlanForWeekday } from "./plan";

export const STORAGE_KEY = "boxing-tracker-v1";

export interface AppState {
  version: 3;
  language: Language;
  records: Record<string, TrainingRecord>;
  favoriteDrillIds: string[];
  customDrills?: Drill[];
  weeklyPlan: DayPlan[];
}

interface V2AppState {
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
    version: 3,
    language: "zh-TW",
    records: {},
    favoriteDrillIds: [],
    customDrills: [],
    weeklyPlan: cloneWeeklyPlan(),
  };
}

function isLocalizedLabel(value: unknown): value is { zhTW: string; en: string } {
  if (!value || typeof value !== "object") return false;
  const label = value as Record<string, unknown>;
  return typeof label.zhTW === "string" && typeof label.en === "string";
}

function isPlanItem(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && isLocalizedLabel(item.label) && isLocalizedLabel(item.detail);
}

function isDayPlan(value: unknown): value is DayPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Record<string, unknown>;
  return (
    ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].includes(plan.day as string) &&
    isLocalizedLabel(plan.dayLabel) &&
    isLocalizedLabel(plan.session) &&
    typeof plan.duration === "number" && plan.duration >= 0 &&
    ["light", "moderate", "hard", "rest"].includes(plan.intensity as string) &&
    ["boxing", "strength", "mixed", "rest"].includes(plan.trainingType as string) &&
    (plan.startTime === undefined || typeof plan.startTime === "string") &&
    (plan.time === undefined || typeof plan.time === "string") &&
    isLocalizedLabel(plan.focus) &&
    Array.isArray(plan.items) && plan.items.every(isPlanItem)
  );
}

function isWeeklyPlan(value: unknown): value is DayPlan[] {
  if (!Array.isArray(value) || value.length !== 7 || !value.every(isDayPlan)) return false;
  return new Set(value.map((day) => day.day)).size === 7;
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
    typeof item.quantity === "number" && item.quantity > 0 &&
    (item.unit === "rounds" || item.unit === "minutes") &&
    typeof item.completed === "boolean" &&
    (item.note === undefined || typeof item.note === "string")
  );
}

function isTrainingRecord(value: unknown): value is TrainingRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.completedItemIds) && record.completedItemIds.every((item) => typeof item === "string") &&
    (record.removedItemIds === undefined || (Array.isArray(record.removedItemIds) && record.removedItemIds.every((item) => typeof item === "string"))) &&
    (record.customItems === undefined || (Array.isArray(record.customItems) && record.customItems.every(isCustomTrainingItem))) &&
    (record.itemSetLogs === undefined || isItemSetLogs(record.itemSetLogs)) &&
    (record.planSnapshot === undefined || isDayPlan(record.planSnapshot))
  );
}

function normalizeRecord(record: TrainingRecord): TrainingRecord {
  return { ...record, removedItemIds: record.removedItemIds ?? [], customItems: record.customItems ?? [], itemSetLogs: record.itemSetLogs ?? {} };
}

function snapshotForDateKey(dateKey: string): DayPlan {
  const date = new Date(`${dateKey}T12:00:00`);
  const weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  return cloneWeeklyPlan([getPlanForWeekday(weekdays[date.getDay()])])[0];
}

function migrateV2State(state: V2AppState): AppState {
  return {
    version: 3,
    language: state.language,
    favoriteDrillIds: state.favoriteDrillIds,
    customDrills: state.customDrills ?? [],
    weeklyPlan: cloneWeeklyPlan(),
    records: Object.fromEntries(Object.entries(state.records).map(([key, record]) => [key, { ...normalizeRecord(record), planSnapshot: record.planSnapshot ?? snapshotForDateKey(key) }])),
  };
}

function migrateV1State(state: V1AppState): AppState {
  return migrateV2State({ version: 2, language: state.language, favoriteDrillIds: [], customDrills: [], records: state.records });
}

function hasValidCommonState(state: Record<string, unknown>) {
  return (
    (state.language === "zh-TW" || state.language === "en") &&
    Boolean(state.records) && typeof state.records === "object" && !Array.isArray(state.records) &&
    Object.values(state.records as Record<string, unknown>).every(isTrainingRecord)
  );
}

function isV2AppState(value: unknown): value is V2AppState {
  if (!value || typeof value !== "object") return false;
  const state = value as Record<string, unknown>;
  return state.version === 2 && hasValidCommonState(state) && Array.isArray(state.favoriteDrillIds) && state.favoriteDrillIds.every((id) => typeof id === "string") && (state.customDrills === undefined || (Array.isArray(state.customDrills) && state.customDrills.every(isCustomDrill)));
}

function isV1AppState(value: unknown): value is V1AppState {
  if (!value || typeof value !== "object") return false;
  const state = value as Record<string, unknown>;
  return state.version === 1 && hasValidCommonState(state);
}

function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") return false;
  const state = value as Record<string, unknown>;
  return (
    state.version === 3 && hasValidCommonState(state) &&
    Array.isArray(state.favoriteDrillIds) && state.favoriteDrillIds.every((id) => typeof id === "string") &&
    (state.customDrills === undefined || (Array.isArray(state.customDrills) && state.customDrills.every(isCustomDrill))) &&
    isWeeklyPlan(state.weeklyPlan)
  );
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
    if (isV2AppState(parsed)) return migrateV2State(parsed);
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
    const state = isAppState(parsed) ? parsed : isV2AppState(parsed) ? migrateV2State(parsed) : isV1AppState(parsed) ? migrateV1State(parsed) : undefined;
    if (!state) throw new Error("Invalid backup");
    saveState(state);
    return state;
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid backup") throw error;
    throw new Error("Invalid backup");
  }
}
