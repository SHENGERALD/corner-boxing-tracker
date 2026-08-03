export type TimerPhase = "work" | "rest";
export type TimerStatus = "running" | "paused" | "complete";

export interface BoxingTimerSettings {
  rounds: number;
  workSeconds: number;
  restSeconds: number;
}

export interface BoxingTimerState {
  status: TimerStatus;
  phase: TimerPhase;
  round: number;
  settings: BoxingTimerSettings;
  phaseEndsAt?: number;
  pausedRemainingSeconds?: number;
}

export type TimerCue =
  | { key: string; type: "phase"; phase: TimerPhase; round: number }
  | { key: string; type: "countdown"; seconds: number }
  | { key: string; type: "complete"; round: number };

export const TIMER_STORAGE_KEY = "corner-boxing-timer-v1";

function normalizeSettings(settings: BoxingTimerSettings): BoxingTimerSettings {
  return {
    rounds: Math.max(1, Math.round(settings.rounds)),
    workSeconds: Math.max(1, Math.round(settings.workSeconds)),
    restSeconds: Math.max(0, Math.round(settings.restSeconds)),
  };
}

export function startTimer(settings: BoxingTimerSettings, now = Date.now()): BoxingTimerState {
  const normalized = normalizeSettings(settings);
  return {
    status: "running",
    phase: "work",
    round: 1,
    settings: normalized,
    phaseEndsAt: now + normalized.workSeconds * 1000,
  };
}

export function getRemainingSeconds(state: BoxingTimerState, now = Date.now()): number {
  if (state.status === "complete") return 0;
  if (state.status === "paused") return state.pausedRemainingSeconds ?? 0;
  return Math.max(0, Math.ceil(((state.phaseEndsAt ?? now) - now) / 1000));
}

export function getTimerCues(state: BoxingTimerState, remainingSeconds: number): TimerCue[] {
  if (state.status === "complete") {
    return [{ key: `complete-${state.round}`, type: "complete", round: state.round }];
  }
  if (state.status !== "running") return [];

  const phaseKey = `${state.phase}-${state.round}`;
  const cues: TimerCue[] = [{ key: `phase-${phaseKey}`, type: "phase", phase: state.phase, round: state.round }];
  if (remainingSeconds > 0 && remainingSeconds <= 10) {
    cues.push({ key: `countdown-${phaseKey}-${remainingSeconds}`, type: "countdown", seconds: remainingSeconds });
  }
  return cues;
}

export function advanceTimer(state: BoxingTimerState, now = Date.now()): BoxingTimerState {
  if (state.status !== "running" || !state.phaseEndsAt || now < state.phaseEndsAt) return state;

  let next: BoxingTimerState = { ...state };
  let boundary = state.phaseEndsAt;
  while (next.status === "running" && now >= boundary) {
    if (next.phase === "work") {
      if (next.round >= next.settings.rounds && next.settings.restSeconds === 0) {
        next = { ...next, status: "complete", phaseEndsAt: undefined, pausedRemainingSeconds: undefined };
        break;
      }
      if (next.round >= next.settings.rounds) {
        next = { ...next, status: "complete", phaseEndsAt: undefined, pausedRemainingSeconds: undefined };
        break;
      }
      next = { ...next, phase: "rest", phaseEndsAt: boundary + next.settings.restSeconds * 1000 };
    } else {
      next = { ...next, phase: "work", round: next.round + 1, phaseEndsAt: boundary + next.settings.workSeconds * 1000 };
    }
    boundary = next.phaseEndsAt ?? boundary;
    if (next.settings.restSeconds === 0 && next.phase === "rest") {
      next = { ...next, phase: "work", round: next.round + 1, phaseEndsAt: boundary };
      boundary = next.phaseEndsAt ?? boundary;
    }
  }
  return next;
}

export function pauseTimer(state: BoxingTimerState, now = Date.now()): BoxingTimerState {
  if (state.status !== "running") return state;
  const advanced = advanceTimer(state, now);
  if (advanced.status !== "running") return advanced;
  return {
    ...advanced,
    status: "paused",
    phaseEndsAt: undefined,
    pausedRemainingSeconds: getRemainingSeconds(advanced, now),
  };
}

export function resumeTimer(state: BoxingTimerState, now = Date.now()): BoxingTimerState {
  if (state.status !== "paused") return state;
  return {
    ...state,
    status: "running",
    phaseEndsAt: now + (state.pausedRemainingSeconds ?? 0) * 1000,
    pausedRemainingSeconds: undefined,
  };
}

export function skipTimerPhase(state: BoxingTimerState, now = Date.now()): BoxingTimerState {
  if (state.status !== "running") return state;
  const boundary = now;
  if (state.phase === "work") {
    if (state.round >= state.settings.rounds) return { ...state, status: "complete", phaseEndsAt: undefined, pausedRemainingSeconds: undefined };
    return { ...state, phase: "rest", phaseEndsAt: boundary + state.settings.restSeconds * 1000 };
  }
  return { ...state, phase: "work", round: state.round + 1, phaseEndsAt: boundary + state.settings.workSeconds * 1000 };
}

export function loadTimer(): BoxingTimerState | null {
  const raw = localStorage.getItem(TIMER_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BoxingTimerState;
    if (!parsed || !["running", "paused", "complete"].includes(parsed.status) || !["work", "rest"].includes(parsed.phase)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTimer(state: BoxingTimerState | null): void {
  if (state) localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  else localStorage.removeItem(TIMER_STORAGE_KEY);
}
