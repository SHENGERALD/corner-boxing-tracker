import type { LocalizedLabel } from "./types";

export const ADVENTURE_KEY = "corner-adventure-preview-v1";
export const ADVENTURE_DAMAGE = 45;

export interface AdventureFloor {
  floor: number;
  name: LocalizedLabel;
  maxHp: number;
  rewardXp: number;
  boss: boolean;
}

export interface AdventureState {
  floor: number;
  enemyHp: number;
  enemyMaxHp: number;
  level: number;
  experience: number;
  experienceToNext: number;
  completed: boolean;
  lastEvent: "idle" | "hit" | "defeat" | "level-up" | "complete";
  eventId: number;
}

export const adventureFloors: readonly AdventureFloor[] = [
  { floor: 1, name: { zhTW: "灰燼守衛", en: "Ash Sentinel" }, maxHp: 90, rewardXp: 40, boss: false },
  { floor: 2, name: { zhTW: "迷霧遊魂", en: "Mist Revenant" }, maxHp: 135, rewardXp: 50, boss: false },
  { floor: 3, name: { zhTW: "鐵棘騎士", en: "Thorn Knight" }, maxHp: 135, rewardXp: 60, boss: false },
  { floor: 4, name: { zhTW: "幽火祭司", en: "Hollow Flame" }, maxHp: 180, rewardXp: 70, boss: false },
  { floor: 5, name: { zhTW: "血月典獄長", en: "Bloodmoon Warden" }, maxHp: 315, rewardXp: 150, boss: true },
  { floor: 6, name: { zhTW: "寒霜守衛", en: "Frost Sentinel" }, maxHp: 180, rewardXp: 80, boss: false },
  { floor: 7, name: { zhTW: "深淵遊魂", en: "Abyss Revenant" }, maxHp: 225, rewardXp: 90, boss: false },
  { floor: 8, name: { zhTW: "黑曜騎士", en: "Obsidian Knight" }, maxHp: 225, rewardXp: 100, boss: false },
  { floor: 9, name: { zhTW: "暮光祭司", en: "Dusk Oracle" }, maxHp: 270, rewardXp: 110, boss: false },
  { floor: 10, name: { zhTW: "永夜之王", en: "The Night Sovereign" }, maxHp: 450, rewardXp: 200, boss: true },
];

export function createAdventureState(): AdventureState {
  return { floor: 1, enemyHp: 90, enemyMaxHp: 90, level: 1, experience: 0, experienceToNext: 100, completed: false, lastEvent: "idle", eventId: 0 };
}

export function attackAdventure(state: AdventureState): AdventureState {
  if (state.completed) return state;
  const enemyHp = Math.max(0, state.enemyHp - ADVENTURE_DAMAGE);
  const eventId = state.eventId + 1;
  if (enemyHp > 0) return { ...state, enemyHp, eventId, lastEvent: "hit" };
  const earned = state.experience + adventureFloors[state.floor - 1].rewardXp;
  const level = state.level + Math.floor(earned / 100);
  const completed = state.floor === 10;
  const nextFloor = adventureFloors[completed ? 9 : state.floor];
  return {
    ...state, floor: nextFloor.floor, enemyHp: completed ? 0 : nextFloor.maxHp,
    enemyMaxHp: nextFloor.maxHp, level, experience: earned % 100, completed, eventId,
    lastEvent: completed ? "complete" : level > state.level ? "level-up" : "defeat",
  };
}

export function loadAdventure(): AdventureState {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(ADVENTURE_KEY) ?? "null");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return createAdventureState();
    const saved = raw as Record<string, unknown>;
    // The finite, deterministic preview has fewer than 60 reachable states.
    // Replaying validates HP, XP, level and event consistency together, with a fixed bound.
    let candidate = createAdventureState();
    while (true) {
      if (Object.entries(candidate).every(([key, value]) => saved[key] === value)) return candidate;
      if (candidate.completed) break;
      candidate = attackAdventure(candidate);
    }
  } catch { /* Storage may be disabled or contain invalid JSON. */ }
  return createAdventureState();
}

export function saveAdventure(state: AdventureState): boolean {
  try {
    localStorage.setItem(ADVENTURE_KEY, JSON.stringify(state));
    return true;
  } catch { return false; }
}

export function resetAdventure(): AdventureState {
  const state = createAdventureState();
  saveAdventure(state);
  return state;
}
