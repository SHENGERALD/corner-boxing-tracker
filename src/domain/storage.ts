import type { Language, TrainingRecord } from "./types";

export const STORAGE_KEY = "boxing-tracker-v1";

export interface AppState {
  version: 1;
  language: Language;
  records: Record<string, TrainingRecord>;
}

export function createEmptyState(): AppState {
  return {
    version: 1,
    language: "zh-TW",
    records: {},
  };
}

function isTrainingRecord(value: unknown): value is TrainingRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.completedItemIds) &&
    record.completedItemIds.every((item) => typeof item === "string")
  );
}

function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") return false;
  const state = value as Record<string, unknown>;
  if (
    state.version !== 1 ||
    (state.language !== "zh-TW" && state.language !== "en") ||
    !state.records ||
    typeof state.records !== "object" ||
    Array.isArray(state.records)
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
    return isAppState(parsed) ? parsed : createEmptyState();
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
    if (!isAppState(parsed)) throw new Error("Invalid backup");
    saveState(parsed);
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid backup") {
      throw error;
    }
    throw new Error("Invalid backup");
  }
}

