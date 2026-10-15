export const BASE_PREVIEW_KEY = "corner-base-preview-v1";
export interface BaseState {
  credits: number;
  energy: number;
  trophies: number;
  levels: number[];
  claimedOn: string | null;
  battles: number;
}
export const createBase = (): BaseState => ({ credits: 400, energy: 3, trophies: 0, levels: [1, 1, 1, 1, 1, 1], claimedOn: null, battles: 0 });
export const upgradeCost = (level: number) => level * 100;
export function upgradeBase(state: BaseState, index: number): BaseState {
  const level = state.levels[index];
  if (!level || level >= 5 || state.credits < upgradeCost(level)) return state;
  return { ...state, credits: state.credits - upgradeCost(level), levels: state.levels.map((value, i) => i === index ? value + 1 : value) };
}
export function claimDemoTraining(state: BaseState, today: string): BaseState {
  if (state.claimedOn === today) return state;
  return { ...state, credits: state.credits + 150, energy: Math.min(6, state.energy + 2), claimedOn: today };
}
export const opponents = [
  { name: "IRON CAMP", nickname: "鐵拳阿凱", defense: 95, reward: 75, trophies: 120, friend: true, optIn: true, levels: [1, 1, 1, 1, 1, 1] },
  { name: "RED RIDGE", nickname: "Ruby", defense: 130, reward: 110, trophies: 185, friend: false, optIn: true, levels: [2, 2, 1, 2, 1, 2] },
  { name: "NIGHT WATCH", nickname: "夜行者", defense: 170, reward: 150, trophies: 260, friend: true, optIn: true, levels: [3, 2, 3, 3, 2, 3] },
  { name: "PINE POST", nickname: "松林拳手", defense: 105, reward: 85, trophies: 145, friend: false, optIn: true, levels: [1, 2, 1, 1, 2, 1] },
  { name: "STONE YARD", nickname: "Stone", defense: 120, reward: 95, trophies: 160, friend: false, optIn: true, levels: [2, 1, 2, 2, 1, 1] },
  { name: "COAST GUARD", nickname: "海風", defense: 140, reward: 115, trophies: 200, friend: false, optIn: true, levels: [2, 2, 2, 2, 2, 1] },
  { name: "ECHO FIELD", nickname: "Echo", defense: 155, reward: 130, trophies: 225, friend: false, optIn: true, levels: [2, 3, 2, 2, 2, 2] },
  { name: "SUNRISE", nickname: "晨練者", defense: 85, reward: 65, trophies: 90, friend: true, optIn: true, levels: [1, 1, 1, 1, 1, 1] },
  { name: "PRIVATE CAMP", nickname: "Private", defense: 90, reward: 70, trophies: 100, friend: true, optIn: false, levels: [1, 1, 1, 1, 1, 1] },
] as const;
export function findBaseOpponents(power: number, friendsOnly: boolean, search: string) {
  const query = search.trim().normalize("NFKC").toLocaleLowerCase();
  return opponents.map((opponent, index) => ({ ...opponent, index }))
    .filter(opponent => opponent.optIn && (!friendsOnly || opponent.friend) && `${opponent.nickname} ${opponent.name}`.normalize("NFKC").toLocaleLowerCase().includes(query))
    .sort((a, b) => Math.abs(a.defense - power) - Math.abs(b.defense - power) || a.index - b.index);
}
export function squadPower(squad: number[], levels: number[]): number {
  return squad.reduce((sum, count, i) => sum + count * [24, 32, 40][i], 0) + levels.slice(0, 3).reduce((sum, level) => sum + (level - 1) * 8, 0);
}
export function battleBase(state: BaseState, squad: number[], opponent: number) {
  if (!opponents[opponent]?.optIn || squad.length !== 3 || squad.some(value => !Number.isInteger(value) || value < 0 || value > 4) || squad.reduce((a, b) => a + b, 0) > 6 || !squad.some(Boolean) || state.energy < 1) return null;
  const power = squadPower(squad, state.levels);
  const won = power >= opponents[opponent].defense;
  return { won, power, state: { ...state, energy: state.energy - 1, credits: state.credits + (won ? opponents[opponent].reward : 20), trophies: state.trophies + (won ? 15 : 0), battles: state.battles + 1 } };
}
export function loadBase(): BaseState {
  try {
    const value = JSON.parse(localStorage.getItem(BASE_PREVIEW_KEY) ?? "null");
    if (value && [value.credits, value.energy, value.trophies, value.battles].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1000000) && value.energy <= 6 && Array.isArray(value.levels) && value.levels.length === 6 && value.levels.every((n: unknown) => Number.isInteger(n) && Number(n) >= 1 && Number(n) <= 5) && (value.claimedOn === null || typeof value.claimedOn === "string")) return value;
  } catch { /* Fall back when local storage is unavailable. */ }
  return createBase();
}
