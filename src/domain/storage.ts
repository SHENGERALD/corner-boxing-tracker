import type { CustomTrainingItem, DayPlan, Language, TrainingRecord, TrainingSet } from "./types";
import type { Drill } from "./drills";
import { cloneWeeklyPlan, getPlanForWeekday } from "./plan";

export const STORAGE_KEY = "boxing-tracker-v1";
const MAX_BACKUP_CHARS = 2 * 1024 * 1024;
const MAX_LABEL_LENGTH = 120;
const MAX_NOTE_LENGTH = 2_000;

export interface AppState {
  version: 3;
  language: Language;
  records: Record<string, TrainingRecord>;
  favoriteDrillIds: string[];
  customDrills?: Drill[];
  weeklyPlan: DayPlan[];
  weeklyPlanUpdatedAt?: string;
  deletedRecordUpdatedAt?: Record<string, string>;
  favoriteDrillUpdatedAt?: Record<string, string>;
  customDrillUpdatedAt?: Record<string, string>;
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
  return typeof label.zhTW === "string" && label.zhTW.length <= MAX_LABEL_LENGTH && typeof label.en === "string" && label.en.length <= MAX_LABEL_LENGTH;
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
    ["fundamentals", "footwork", "offense", "defense", "equipment", "conditioning", "chest", "back", "legs", "shoulders", "arms", "core", "calves", "cardio"].includes(drill.category as string) &&
    (drill.domain === "boxing" || drill.domain === "strength") &&
    isLocalizedLabel(drill.name) &&
    isLocalizedLabel(drill.cue) &&
    (drill.defaultUnit === "rounds" || drill.defaultUnit === "minutes") &&
    typeof drill.defaultQuantity === "number" && drill.defaultQuantity > 0 && drill.defaultQuantity <= 1_000 &&
    (drill.imageUrl === undefined || (typeof drill.imageUrl === "string" && drill.imageUrl.startsWith("/")))
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
    (item.note === undefined || (typeof item.note === "string" && item.note.length <= MAX_NOTE_LENGTH))
  );
}

function isTrainingRecord(value: unknown): value is TrainingRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.completedItemIds) && record.completedItemIds.every((item) => typeof item === "string") &&
    (record.removedItemIds === undefined || (Array.isArray(record.removedItemIds) && record.removedItemIds.every((item) => typeof item === "string"))) &&
    (record.customItems === undefined || (Array.isArray(record.customItems) && record.customItems.every(isCustomTrainingItem))) &&
    (record.itemOrder === undefined || (Array.isArray(record.itemOrder) && record.itemOrder.every((item) => typeof item === "string"))) &&
    (record.itemSetLogs === undefined || isItemSetLogs(record.itemSetLogs)) &&
    (record.planSnapshot === undefined || isDayPlan(record.planSnapshot)) &&
    (record.technicalNotes === undefined || (typeof record.technicalNotes === "string" && record.technicalNotes.length <= MAX_NOTE_LENGTH)) &&
    (record.bodyCheck === undefined || (typeof record.bodyCheck === "string" && record.bodyCheck.length <= MAX_NOTE_LENGTH)) &&
    (record.nextFocus === undefined || (typeof record.nextFocus === "string" && record.nextFocus.length <= MAX_NOTE_LENGTH))
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

function isTimestampMap(value: unknown): value is Record<string, string> {
  return value === undefined || (Boolean(value) && typeof value === "object" && !Array.isArray(value) && Object.values(value as Record<string, unknown>).every((item) => typeof item === "string"));
}

function hasValidCommonState(state: Record<string, unknown>) {
  return (
    (state.language === "zh-TW" || state.language === "en") &&
    Boolean(state.records) && typeof state.records === "object" && !Array.isArray(state.records) &&
    Object.values(state.records as Record<string, unknown>).every(isTrainingRecord) &&
    isTimestampMap(state.deletedRecordUpdatedAt) &&
    isTimestampMap(state.favoriteDrillUpdatedAt) &&
    isTimestampMap(state.customDrillUpdatedAt)
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

export function getStorageKey(userId?: string): string {
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

export function getStorageUpdatedAtKey(userId?: string): string {
  return `${getStorageKey(userId)}:updated-at`;
}

export function hasStoredState(userId?: string): boolean {
  return localStorage.getItem(getStorageKey(userId)) !== null;
}

export function getStateSavedAt(userId?: string): string | null {
  return localStorage.getItem(getStorageUpdatedAtKey(userId));
}

export function decodeState(value: unknown): AppState | null {
  if (isAppState(value)) return value;
  if (isV2AppState(value)) return migrateV2State(value);
  if (isV1AppState(value)) return migrateV1State(value);
  return null;
}

export function saveState(state: AppState, userId?: string, savedAt = new Date().toISOString()): void {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
  localStorage.setItem(getStorageUpdatedAtKey(userId), savedAt);
}

export function loadState(userId?: string): AppState {
  const raw = localStorage.getItem(getStorageKey(userId));
  if (!raw) return createEmptyState();
  try {
    return decodeState(JSON.parse(raw)) ?? createEmptyState();
  } catch {
    return createEmptyState();
  }
}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importState(raw: string, userId?: string): AppState {
  try {
    if (raw.length > MAX_BACKUP_CHARS) throw new Error("Invalid backup");
    const parsed: unknown = JSON.parse(raw);
    const state = decodeState(parsed);
    if (!state) throw new Error("Invalid backup");
    saveState(state, userId);
    return state;
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid backup") throw error;
    throw new Error("Invalid backup");
  }
}
