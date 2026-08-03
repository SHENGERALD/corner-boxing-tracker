import {
  Archive,
  Activity,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Cloud,
  CloudOff,
  Download,
  Dumbbell,
  Flame,
  Globe2,
  GripVertical,
  Heart,
  LogOut,
  Home,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  TrendingUp,
  Timer as TimerIcon,
  Pause,
  Play,
  SkipForward,
  Settings2,
  Volume2,
  VolumeX,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
function CornerMark({ className = "" }: { className?: string }) {
  return (
    <span className={`corner-mark ${className}`.trim()} aria-hidden="true">
      <img src={`${import.meta.env.BASE_URL}corner-mark.png`} alt="" />
    </span>
  );
}

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { mergeForRevisionedSave, mergeStateWithCloud, resolveInitialState } from "./domain/cloud";
import { getWeekDates, getWeekday, toDateKey } from "./domain/dates";
import { formatPlanLabel, t } from "./domain/i18n";
import { cloneWeeklyPlan, createBlankWeeklyPlan, getPlanForWeekday } from "./domain/plan";
import { getRecordCompletion, getWeeklySummary, isTrainingItemComplete } from "./domain/progress";
import {
  createEmptyState,
  decodeState,
  exportState,
  getStateSavedAt,
  getStorageKey,
  getStorageUpdatedAtKey,
  hasStoredState,
  importState,
  loadState,
  saveState,
  type AppState,
} from "./domain/storage";
import { getAuthRedirectUrl, isSupabaseConfigured, supabase } from "./domain/supabase";
import type { CustomTrainingItem, DayPlan, Language, PlanItem, TrainingRecord, TrainingSet, TrainingTarget, TrainingType, Weekday } from "./domain/types";
import { drillLibrary, filterDrills, type Drill, type DrillCategory, type EquipmentType, type TrainingDomain } from "./domain/drills";
import { advanceTimer, getRemainingSeconds, getTimerCues, loadTimer, pauseTimer, resumeTimer, saveTimer, skipTimerPhase, startTimer, type BoxingTimerSettings, type BoxingTimerState } from "./domain/timer";
import { NumericDraftInput } from "./components/NumericDraftInput";
import { formatTrainingTarget, parseTrainingTarget } from "./domain/targets";

type View = "today" | "schedule" | "history" | "library" | "backup";
type HistoryMode = "history" | "stats";
type SyncStatus = "local" | "syncing" | "synced" | "error";

interface AppProps {
  initialDate?: Date;
}

const navItems = [
  { id: "today", icon: Home, label: "nav.today" },
  { id: "schedule", icon: CalendarRange, label: "nav.schedule" },
  { id: "history", icon: CalendarDays, label: "nav.history" },
  { id: "library", icon: ClipboardList, label: "nav.library" },
  { id: "backup", icon: Archive, label: "nav.backup" },
] as const;

function formatDate(date: Date, language: Language, detail = true) {
  return new Intl.DateTimeFormat(language, {
    month: detail ? "long" : "short",
    day: "numeric",
    weekday: detail ? "long" : "short",
  }).format(date);
}

function initialRecord(): TrainingRecord {
  return { completedItemIds: [] };
}

type PreviewSet = { id: string; weight?: number; reps?: number; completed: boolean };

function QuickLogPreview() {
  const [boxingComplete, setBoxingComplete] = useState(false);
  const [cardioComplete, setCardioComplete] = useState(false);
  const [boxingDetailsOpen, setBoxingDetailsOpen] = useState(false);
  const [cardioDetailsOpen, setCardioDetailsOpen] = useState(false);
  const [boxingQuantity, setBoxingQuantity] = useState(3);
  const [cardioQuantity, setCardioQuantity] = useState(20);
  const [sets, setSets] = useState<PreviewSet[]>([{ id: "squat-1", weight: 60, reps: 8, completed: false }]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const updateSet = (id: string, field: "weight" | "reps", value: number | undefined) => {
    setSets((current) => current.map((set) => set.id === id ? { ...set, [field]: value } : set));
  };
  const addSet = () => setSets((current) => {
    const previous = current[current.length - 1];
    return [...current, { ...previous, id: `squat-${current.length + 1}`, completed: false }];
  });

  return <main className="quick-log-preview">
    <header className="quick-log-header"><p className="eyebrow">CORNER / PREVIEW</p><h1>快速記錄原型</h1><p>今天的訓練，幾秒內留下來。</p></header>
    <section className="quick-log-list" aria-label="示範訓練">
      <article className={`quick-log-card ${boxingComplete ? "is-complete" : ""}`}>
        <div className="quick-log-card-top"><div className="quick-log-card-heading"><Activity size={20} /><div><h2>影子拳擊</h2><p>{boxingQuantity || "0"} 回合</p></div></div><button className="quick-log-more" aria-expanded={boxingDetailsOpen} onClick={() => setBoxingDetailsOpen((open) => !open)}>更多</button></div>
        {boxingDetailsOpen && <div className="quick-log-extra"><label>數量<NumericDraftInput aria-label="影子拳擊數量" min={1} value={boxingQuantity} onCommit={(value) => setBoxingQuantity(value ?? 1)} /></label><label>備註<textarea aria-label="影子拳擊備註" placeholder="選填" /></label></div>}
        <button className="quick-log-complete" onClick={() => setBoxingComplete(true)} disabled={boxingComplete}><Check size={18} />{boxingComplete ? "已完成" : "完成 影子拳擊"}</button>
      </article>
      <article className={`quick-log-card ${cardioComplete ? "is-complete" : ""}`}>
        <div className="quick-log-card-top"><div className="quick-log-card-heading"><TimerIcon size={20} /><div><h2>Zone 2 跑步</h2><p>{cardioQuantity || "0"} 分鐘</p></div></div><button className="quick-log-more" aria-expanded={cardioDetailsOpen} onClick={() => setCardioDetailsOpen((open) => !open)}>更多</button></div>
        {cardioDetailsOpen && <div className="quick-log-extra"><label>數量<NumericDraftInput aria-label="Zone 2 跑步數量" min={1} value={cardioQuantity} onCommit={(value) => setCardioQuantity(value ?? 1)} /></label><label>備註<textarea aria-label="Zone 2 跑步備註" placeholder="選填" /></label></div>}
        <button className="quick-log-complete" onClick={() => setCardioComplete(true)} disabled={cardioComplete}><Check size={18} />{cardioComplete ? "已完成" : "完成 Zone 2 跑步"}</button>
      </article>
      <article className="quick-log-card quick-log-strength"><div className="quick-log-card-heading"><Dumbbell size={20} /><div><h2>深蹲</h2><p>60 kg x 8</p></div></div><div className="quick-log-sets">{sets.map((set, index) => <div className={`quick-log-set ${set.completed ? "is-complete" : ""}`} key={set.id}><span>第 {index + 1} 組</span><label>重量<NumericDraftInput aria-label={`第${index + 1}組重量`} min={0} value={set.weight} allowEmpty onCommit={(weight) => updateSet(set.id, "weight", weight)} /></label><label>次數<NumericDraftInput aria-label={`第${index + 1}組次數`} min={0} value={set.reps} allowEmpty onCommit={(reps) => updateSet(set.id, "reps", reps)} /></label><button aria-label={`完成第${index + 1}組深蹲`} onClick={() => setSets((current) => current.map((item) => item.id === set.id ? { ...item, completed: !item.completed } : item))}><Check size={17} /></button></div>)}</div><button className="quick-log-add-set" onClick={addSet}><Plus size={18} />新增一組 深蹲</button></article>
    </section>
    <button className="quick-log-details-trigger" onClick={() => setDetailsOpen(true)}>查看細節</button>
    {detailsOpen && <div className="quick-log-backdrop" data-testid="details-backdrop" onClick={() => setDetailsOpen(false)}><section className="quick-log-details" role="dialog" aria-modal="true" aria-label="訓練細節" onClick={(event) => event.stopPropagation()}><div><h2>可選細節</h2><button aria-label="關閉" onClick={() => setDetailsOpen(false)}><X size={20} /></button></div><p>這裡可補上 RPE、技術感受和下一次的提醒；完成按鈕仍是最快的記錄方式。</p></section></div>}
  </main>;
}

function LaunchSplash() {
  return <div className="launch-splash" role="status" aria-label="Corner loading">
    <div className="launch-splash-mark"><img src={import.meta.env.BASE_URL + "corner-mark.png"} alt="" /></div>
    <strong>CORNER</strong>
  </div>;
}

export default function App(props: AppProps) {
  const isPreview = new URLSearchParams(window.location.search).get("preview") === "quick-log";
  const [showSplash, setShowSplash] = useState(() => !isPreview && import.meta.env.MODE !== "test");

  useEffect(() => {
    if (!showSplash) return;
    const timer = window.setTimeout(() => setShowSplash(false), 700);
    return () => window.clearTimeout(timer);
  }, [showSplash]);

  if (isPreview) return <QuickLogPreview />;
  return <>
    <BoxingTrackerApp {...props} />
    {showSplash && <LaunchSplash />}
  </>;
}

function BoxingTrackerApp({ initialDate = new Date() }: AppProps) {
  const [view, setView] = useState<View>("today");
  const [selectedDate, setSelectedDate] = useState(() => new Date(initialDate));
  const [displayMonth, setDisplayMonth] = useState(() => new Date(initialDate));
  const [historyMode, setHistoryMode] = useState<HistoryMode>("history");
  const [state, setState] = useState<AppState>(() => loadState());
  const [drillToAdd, setDrillToAdd] = useState<Drill | null>(null);
  const [timer, setTimer] = useState<BoxingTimerState | null>(() => loadTimer());
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerNow, setTimerNow] = useState(() => Date.now());
  const timerCueKeysRef = useRef(new Set<string>());
  const [timerSoundEnabled, setTimerSoundEnabled] = useState(true);
  const [timerVoiceEnabled, setTimerVoiceEnabled] = useState(true);
  const [creatingLibraryDrill, setCreatingLibraryDrill] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const stateRef = useRef(state);
  const cloudRevisionRef = useRef<number | null>(null);
  const suppressNextGuestSaveRef = useRef(false);
  const syncGenerationRef = useRef(0);
  const language = state.language;

  const clearGuestStorage = () => {
    localStorage.removeItem(getStorageKey());
    localStorage.removeItem(getStorageUpdatedAtKey());
  };
  const resetGuestState = () => {
    syncGenerationRef.current += 1;
    clearGuestStorage();
    const empty = createEmptyState();
    stateRef.current = empty;
    setState(empty);
  };
  const userId = session?.user.id;

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => {
    if (!userId || cloudReady) {
      if (!userId && suppressNextGuestSaveRef.current) {
        suppressNextGuestSaveRef.current = false;
        return;
      }
      saveState(state, userId);
    }
  }, [cloudReady, state, userId]);
  useEffect(() => {
    if (timer?.status !== "running") return;
    const tick = () => {
      const now = Date.now();
      setTimerNow(now);
      setTimer((current) => {
        if (!current || current.status !== "running") return current;
        const next = advanceTimer(current, now);
        if (next !== current) saveTimer(next);
        return next;
      });
    };
    tick();
    const interval = window.setInterval(tick, 250);
    const onVisibilityChange = () => tick();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [timer?.status]);

  useEffect(() => {
    if (!timer) {
      timerCueKeysRef.current.clear();
      return;
    }
    const remaining = getRemainingSeconds(timer, timerNow);
    for (const cue of getTimerCues(timer, remaining)) {
      if (timerCueKeysRef.current.has(cue.key)) continue;
      timerCueKeysRef.current.add(cue.key);
      if (cue.type === "phase") announceTimerPhase(cue.phase, cue.round, language, timerSoundEnabled, timerVoiceEnabled);
      if (cue.type === "countdown" && timerSoundEnabled) playTimerChime();
      if (cue.type === "complete") announceTimerComplete(language, timerSoundEnabled, timerVoiceEnabled);
    }
  }, [language, timer, timerNow, timerSoundEnabled, timerVoiceEnabled]);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        suppressNextGuestSaveRef.current = true;
        resetGuestState();
        setCloudReady(false);
        setSyncStatus("local");
      }
      setSession(nextSession);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !userId || !supabase) {
      setCloudReady(false);
      setSyncStatus("local");
      return;
    }
    let active = true;
    setCloudReady(false);
    setSyncStatus("syncing");
    void (async () => {
      const { data, error } = await supabase
        .from("user_app_states")
        .select("state, updated_at, revision")
        .eq("user_id", userId)
        .maybeSingle();
      if (!active) return;
      if (error) {
        if (hasStoredState(userId)) setState(loadState(userId));
        setSyncStatus("error");
        return;
      }
      const cloudState = data ? decodeState(data.state) : null;
      cloudRevisionRef.current = data?.revision ?? null;
      const accountState = hasStoredState(userId) ? loadState(userId) : null;
      const resolution = resolveInitialState({
        guestState: stateRef.current,
        accountState,
        accountSavedAt: getStateSavedAt(userId),
        cloudState,
        cloudUpdatedAt: data?.updated_at ?? null,
      });
      if (resolution.shouldUpload) {
        const { data: savedRows, error: uploadError } = await supabase
          .rpc("save_user_app_state", { next_state: resolution.state, expected_revision: cloudRevisionRef.current });
        if (!active) return;
        const saved = savedRows?.[0];
        if (uploadError || !saved) {
          setState(resolution.state);
          setSyncStatus("error");
          return;
        }
        cloudRevisionRef.current = saved.revision;
        saveState(resolution.state, userId, saved.updated_at);
      } else {
        saveState(resolution.state, userId, data?.updated_at ?? undefined);
      }
      clearGuestStorage();
      setState(resolution.state);
      setCloudReady(true);
      setSyncStatus("synced");
    })();
    return () => { active = false; };
  }, [authReady, userId]);


  useEffect(() => {
    const client = supabase;
    if (!cloudReady || !userId || !client) return;
    const channel = client
      .channel("user-app-state-" + userId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_app_states", filter: "user_id=eq." + userId },
        (payload) => {
          const incomingRow = payload.new as { state?: unknown; revision?: number };
          const incoming = decodeState(incomingRow.state);
          if (!incoming) return;
          cloudRevisionRef.current = incomingRow.revision ?? cloudRevisionRef.current;
          setState((current) => {
            const merged = mergeStateWithCloud(current, incoming).state;
            return JSON.stringify(merged) === JSON.stringify(current) ? current : merged;
          });
          setSyncStatus("synced");
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setSyncStatus("error");
      });
    return () => { void client.removeChannel(channel); };
  }, [cloudReady, userId]);
  useEffect(() => {
    const client = supabase;
    if (!cloudReady || !userId || !client) return;
    const generation = ++syncGenerationRef.current;
    setSyncStatus("syncing");
    const timer = window.setTimeout(() => {
      void (async () => {
        const { data: latestData, error: latestError } = await client
          .from("user_app_states")
          .select("state, updated_at, revision")
          .eq("user_id", userId)
          .maybeSingle();
        if (latestError) {
          setSyncStatus("error");
          return;
        }
        const latestCloudState = latestData ? decodeState(latestData.state) : null;
        const firstWrite = mergeForRevisionedSave(stateRef.current, latestCloudState ? { state: latestCloudState, revision: latestData?.revision ?? null } : null);
        let mergedState = firstWrite.state;
        let { data: savedRows, error } = await client.rpc("save_user_app_state", { next_state: mergedState, expected_revision: firstWrite.expectedRevision });
        let saved = savedRows?.[0];
        if (!error && !saved) {
          const { data: retryData, error: retryReadError } = await client.from("user_app_states").select("state, updated_at, revision").eq("user_id", userId).maybeSingle();
          if (retryReadError) { setSyncStatus("error"); return; }
          const retryCloudState = retryData ? decodeState(retryData.state) : null;
          const retryWrite = mergeForRevisionedSave(stateRef.current, retryCloudState ? { state: retryCloudState, revision: retryData?.revision ?? null } : null);
          mergedState = retryWrite.state;
          ({ data: savedRows, error } = await client.rpc("save_user_app_state", { next_state: mergedState, expected_revision: retryWrite.expectedRevision }));
          saved = savedRows?.[0];
        }
        if (error || !saved) { setSyncStatus("error"); return; }
        if (generation !== syncGenerationRef.current) return;
        cloudRevisionRef.current = saved.revision;
        const previousState = stateRef.current;
        const latestState = mergeStateWithCloud(previousState, mergedState).state;
        saveState(latestState, userId, saved.updated_at);
        stateRef.current = latestState;
        if (JSON.stringify(latestState) !== JSON.stringify(previousState)) setState(latestState);
        setSyncStatus("synced");
      })();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [cloudReady, state, userId]);

  const startBoxingTimer = (settings: BoxingTimerSettings) => {
    timerCueKeysRef.current.clear();
    unlockTimerAudio();
    const next = startTimer(settings);
    saveTimer(next);
    setTimer(next);
    setTimerNow(Date.now());
    setTimerOpen(true);
  };
  const pauseBoxingTimer = () => setTimer((current) => {
    if (!current) return current;
    const next = pauseTimer(current);
    saveTimer(next);
    return next;
  });
  const resumeBoxingTimer = () => setTimer((current) => {
    if (!current) return current;
    const next = resumeTimer(current);
    saveTimer(next);
    return next;
  });
  const skipBoxingTimerPhase = () => setTimer((current) => {
    if (!current) return current;
    const next = skipTimerPhase(current);
    saveTimer(next);
    setTimerNow(Date.now());
    return next;
  });
  const resetBoxingTimer = () => {
    timerCueKeysRef.current.clear();
    saveTimer(null);
    setTimer(null);
    setTimerOpen(false);
  };

  const selectedKey = toDateKey(selectedDate);
  const plan = getPlanForWeekday(getWeekday(selectedDate), state.weeklyPlan);
  const record = state.records[selectedKey] ?? initialRecord();

  const updateRecord = (patch: Partial<TrainingRecord>) => {
    setState((current) => ({
      ...current,
      records: {
        ...current.records,
        [selectedKey]: {
          ...(current.records[selectedKey] ?? initialRecord()),
          planSnapshot: current.records[selectedKey]?.planSnapshot ?? structuredClone(getPlanForWeekday(getWeekday(selectedDate), current.weeklyPlan)),
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      },
      deletedRecordUpdatedAt: Object.fromEntries(Object.entries(current.deletedRecordUpdatedAt ?? {}).filter(([dateKey]) => dateKey !== selectedKey)),
    }));
  };

  const setLanguage = (nextLanguage: Language) => {
    setState((current) => ({ ...current, language: nextLanguage }));
    document.documentElement.lang = nextLanguage === "zh-TW" ? "zh-Hant" : "en";
  };

  const openDate = (date: Date) => {
    setSelectedDate(date);
    setDisplayMonth(date);
    setView("today");
  };

  const toggleFavorite = (drillId: string) => setState((current) => ({
    ...current,
    favoriteDrillIds: current.favoriteDrillIds.includes(drillId)
      ? current.favoriteDrillIds.filter((id) => id !== drillId)
      : [...current.favoriteDrillIds, drillId],
    favoriteDrillUpdatedAt: { ...(current.favoriteDrillUpdatedAt ?? {}), [drillId]: new Date().toISOString() },
  }));

  const addCustomDrill = (item: CustomTrainingItem) => setState((current) => ({
    ...current,
    records: {
      ...current.records,
      [selectedKey]: {
        ...(current.records[selectedKey] ?? initialRecord()),
        planSnapshot: current.records[selectedKey]?.planSnapshot ?? structuredClone(getPlanForWeekday(getWeekday(selectedDate), current.weeklyPlan)),
        customItems: [...(current.records[selectedKey]?.customItems ?? []), item],
        updatedAt: new Date().toISOString(),
      },
    },
    deletedRecordUpdatedAt: Object.fromEntries(Object.entries(current.deletedRecordUpdatedAt ?? {}).filter(([dateKey]) => dateKey !== selectedKey)),
  }));

  const addLibraryDrill = (drill: Drill) => setState((current) => ({
    ...current,
    customDrills: [...(current.customDrills ?? []), drill],
    customDrillUpdatedAt: { ...(current.customDrillUpdatedAt ?? {}), [drill.id]: new Date().toISOString() },
  }));

  const clearRecord = (dateKey = selectedKey) => {
    setState((current) => {
      const { [dateKey]: _removed, ...remainingRecords } = current.records;
      return { ...current, records: remainingRecords, deletedRecordUpdatedAt: { ...(current.deletedRecordUpdatedAt ?? {}), [dateKey]: new Date().toISOString() } };
    });
  };
  const reorderTodayItems = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const selectedWeekday = getWeekday(selectedDate);
    setState((current) => {
      const day = getPlanForWeekday(selectedWeekday, current.weeklyPlan);
      const currentRecord = current.records[selectedKey] ?? initialRecord();
      const visiblePlanIds = day.items.filter((item) => !currentRecord.removedItemIds?.includes(item.id)).map((item) => item.id);
      const customIds = (currentRecord.customItems ?? []).map((item) => item.id);
      const availableIds = [...visiblePlanIds, ...customIds];
      const orderedIds = [
        ...(currentRecord.itemOrder ?? []).filter((id) => availableIds.includes(id)),
        ...availableIds.filter((id) => !currentRecord.itemOrder?.includes(id)),
      ];
      const fromIndex = orderedIds.indexOf(fromId);
      const toIndex = orderedIds.indexOf(toId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const [moved] = orderedIds.splice(fromIndex, 1);
      orderedIds.splice(toIndex, 0, moved);
      const orderedPlanIds = orderedIds.filter((id) => day.items.some((item) => item.id === id));
      const sortedPlanItems = orderedPlanIds.map((id) => day.items.find((item) => item.id === id)!).concat(day.items.filter((item) => !orderedPlanIds.includes(item.id)));

      return {
        ...current,
        records: {
          ...current.records,
          [selectedKey]: { ...currentRecord, itemOrder: orderedIds, updatedAt: new Date().toISOString() },
        },
        deletedRecordUpdatedAt: Object.fromEntries(Object.entries(current.deletedRecordUpdatedAt ?? {}).filter(([dateKey]) => dateKey !== selectedKey)),
        weeklyPlan: current.weeklyPlan.map((candidate) => candidate.day === selectedWeekday ? { ...candidate, items: sortedPlanItems } : candidate),
        weeklyPlanUpdatedAt: new Date().toISOString(),
      };
    });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView("today")} aria-label="Corner home">
          <CornerMark className="brand-mark" />
          <span>
            <strong>CORNER</strong>
            <small>{t(language, "app.kicker")}</small>
          </span>
        </button>
        <button className="timer-trigger" onClick={() => setTimerOpen(true)} aria-label={language === "zh-TW" ? "拳擊回合計時器" : "Boxing round timer"}>
          <TimerIcon size={18} />
          <span><strong>{timer && timer.status !== "complete" ? formatTimerClock(getRemainingSeconds(timer, timerNow)) : language === "zh-TW" ? "計時" : "Timer"}</strong><small>{timer?.status === "running" ? (timer.phase === "work" ? (language === "zh-TW" ? "回合" : "Round") : (language === "zh-TW" ? "休息" : "Rest")) + " " + timer.round : language === "zh-TW" ? "拳擊回合" : "Boxing rounds"}</small></span>
        </button>
        <button className="account-trigger" onClick={() => setAuthOpen(true)} aria-label={session ? (language === "zh-TW" ? "帳號與同步" : "Account and sync") : (language === "zh-TW" ? "登入" : "Sign in")}>
          {session ? (syncStatus === "error" ? <CloudOff size={18} /> : <Cloud size={18} />) : <UserRound size={18} />}
          <span>
            <strong>{session?.user.email?.split("@")[0] ?? (language === "zh-TW" ? "登入" : "Sign in")}</strong>
            <small>{syncStatusLabel(syncStatus, language, Boolean(session))}</small>
          </span>
        </button>
      </header>

      <main>
        {view === "today" && (
          <TodayView
            date={selectedDate}
            language={language}
            plan={plan}
            record={record}
            updateRecord={updateRecord}
            onReorder={reorderTodayItems}
            addDrill={() => setView("library")}
            clearRecord={() => clearRecord()}
          />
        )}
        {view === "schedule" && (
          <ScheduleView
            language={language}
            initialDay={getWeekday(selectedDate)}
            weeklyPlan={state.weeklyPlan}
            customDrills={state.customDrills ?? []}
            onUpdateDay={(nextDay) => setState((current) => ({ ...current, weeklyPlan: current.weeklyPlan.map((day) => day.day === nextDay.day ? nextDay : day), weeklyPlanUpdatedAt: new Date().toISOString() }))}
            onReplaceSchedule={(weeklyPlan) => setState((current) => ({ ...current, weeklyPlan, weeklyPlanUpdatedAt: new Date().toISOString() }))}
          />
        )}
        {view === "history" && (
          <HistoryCalendarView
            monthDate={displayMonth}
            selectedDate={selectedDate}
            language={language}
            records={state.records}
            weeklyPlan={state.weeklyPlan}
            openDate={openDate}
            changeMonth={(offset) => setDisplayMonth((current) => addMonths(current, offset))}
            clearRecord={clearRecord}
            mode={historyMode}
            onModeChange={setHistoryMode}
            customDrills={state.customDrills ?? []}
          />
        )}
        {view === "library" && (
          <DrillLibraryView
            language={language}
            favorites={state.favoriteDrillIds}
            customDrills={state.customDrills ?? []}
            onFavorite={toggleFavorite}
            onAdd={setDrillToAdd}
            onCreate={() => setCreatingLibraryDrill(true)}
          />
        )}
        {view === "backup" && (
          <BackupView
            state={state}
            language={language}
            userId={userId}
            syncStatus={syncStatus}
            setLanguage={setLanguage}
            replaceState={setState}
          />
        )}
      </main>
      {timerOpen && <BoxingTimerPanel language={language} timer={timer} now={timerNow} soundEnabled={timerSoundEnabled} voiceEnabled={timerVoiceEnabled} onSoundChange={setTimerSoundEnabled} onVoiceChange={setTimerVoiceEnabled} onClose={() => setTimerOpen(false)} onStart={startBoxingTimer} onPause={pauseBoxingTimer} onResume={resumeBoxingTimer} onSkip={skipBoxingTimerPhase} onReset={resetBoxingTimer} />}
      {drillToAdd && <AddDrillPanel drill={drillToAdd} language={language} onClose={() => setDrillToAdd(null)} onConfirm={(item) => { addCustomDrill(item); setDrillToAdd(null); setView("today"); }} />}
      {creatingLibraryDrill && <CreateLibraryDrillPanel language={language} onClose={() => setCreatingLibraryDrill(false)} onConfirm={(drill) => { addLibraryDrill(drill); setCreatingLibraryDrill(false); setView("library"); }} />}
      {authOpen && (
        <AuthPanel
          language={language}
          session={session}
          syncStatus={syncStatus}
          configured={isSupabaseConfigured}
          onClose={() => setAuthOpen(false)}
          onSignedOut={() => {
            resetGuestState();
            setCloudReady(false);
            setSyncStatus("local");
            setAuthOpen(false);
          }}
        />
      )}

      <nav
        className="bottom-nav"
        aria-label="Primary"
        style={{ "--active-nav-index": navItems.findIndex(({ id }) => id === view) } as CSSProperties}
      >
        <span className="bottom-nav-indicator" aria-hidden="true" />
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={view === id ? "active" : ""}
            onClick={() => setView(id)}
            aria-current={view === id ? "page" : undefined}
          >
            <Icon size={20} strokeWidth={1.8} />
            <span>{t(language, label)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}



function formatTimerClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
}

let timerAudioContext: AudioContext | null = null;

function getTimerAudioContext(): AudioContext | null {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!timerAudioContext || timerAudioContext.state === "closed") timerAudioContext = new AudioContextClass();
  return timerAudioContext;
}

function unlockTimerAudio(): void {
  const context = getTimerAudioContext();
  if (context?.state === "suspended") void context.resume();
}

function playTimerChime(): void {
  const context = getTimerAudioContext();
  if (!context) return;
  for (const index of [0, 1]) {
    const start = context.currentTime + index * 0.22;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 784;
    oscillator.type = "triangle";
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.2);
  }
}

function announceTimerPhase(phase: "work" | "rest", round: number, language: Language, soundEnabled: boolean, voiceEnabled: boolean): void {
  if (soundEnabled) playTimerBell(phase);
  if (!voiceEnabled || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(
    phase === "work"
      ? language === "zh-TW" ? "第 " + round + " 回合" : "Round " + round
      : language === "zh-TW" ? "休息" : "Rest",
  );
  speech.lang = language === "zh-TW" ? "zh-TW" : "en-US";
  window.speechSynthesis.speak(speech);
}

function announceTimerComplete(language: Language, soundEnabled: boolean, voiceEnabled: boolean): void {
  if (soundEnabled) playTimerBell("work");
  if (!voiceEnabled || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(language === "zh-TW" ? "訓練結束" : "Workout complete");
  speech.lang = language === "zh-TW" ? "zh-TW" : "en-US";
  window.speechSynthesis.speak(speech);
}

function playTimerBell(phase: "work" | "rest"): void {
  const context = getTimerAudioContext();
  if (!context) return;
  const notes = phase === "work" ? [660, 880] : [440, 440];
  notes.forEach((frequency, index) => {
    const start = context.currentTime + index * 0.18;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = "triangle";
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.34);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.36);
  });
}

function BoxingTimerPanel({
  language,
  timer,
  now,
  soundEnabled,
  voiceEnabled,
  onSoundChange,
  onVoiceChange,
  onClose,
  onStart,
  onPause,
  onResume,
  onSkip,
  onReset,
}: {
  language: Language;
  timer: BoxingTimerState | null;
  now: number;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  onSoundChange: (value: boolean) => void;
  onVoiceChange: (value: boolean) => void;
  onClose: () => void;
  onStart: (settings: BoxingTimerSettings) => void;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onReset: () => void;
}) {
  const [rounds, setRounds] = useState(timer?.settings.rounds ?? 6);
  const [workMinutes, setWorkMinutes] = useState(Math.max(1, Math.round((timer?.settings.workSeconds ?? 180) / 60)));
  const [restSeconds, setRestSeconds] = useState(timer?.settings.restSeconds ?? 60);
  const active = timer?.status === "running" || timer?.status === "paused";
  const remaining = timer ? getRemainingSeconds(timer, now) : 0;
  const phaseSeconds = timer ? timer.phase === "work" ? timer.settings.workSeconds : timer.settings.restSeconds : 180;
  const progress = timer && phaseSeconds > 0 ? Math.min(100, Math.max(0, (remaining / phaseSeconds) * 100)) : 0;
  const start = () => onStart({
    rounds: Math.max(1, rounds ?? 1),
    workSeconds: Math.max(1, workMinutes ?? 1) * 60,
    restSeconds: Math.max(0, restSeconds ?? 0),
  });

  return <div className="dialog-backdrop timer-backdrop" role="presentation">
    <section className="timer-sheet" role="dialog" aria-modal="true" aria-label={language === "zh-TW" ? "拳擊回合計時器" : "Boxing round timer"}>
      <header className="timer-sheet-header">
        <div><p className="eyebrow">BOXING TIMER</p><h2>{language === "zh-TW" ? "拳擊回合計時器" : "Boxing round timer"}</h2></div>
        <button className="icon-button" onClick={onClose} aria-label={language === "zh-TW" ? "關閉計時器" : "Close timer"}><X size={20} /></button>
      </header>
      {active ? <div className="timer-active">
        <div className="timer-ring" style={{ background: "conic-gradient(var(--strava) " + progress + "%, var(--surface-soft) 0)" }}>
          <div><span>{timer?.phase === "work" ? (language === "zh-TW" ? "回合" : "ROUND") : (language === "zh-TW" ? "休息" : "REST")}</span><strong>{formatTimerClock(remaining)}</strong><small>{timer?.round} / {timer?.settings.rounds}</small></div>
        </div>
        <div className="timer-stat-row"><span>{language === "zh-TW" ? "工作" : "WORK"}<strong>{formatTimerClock(timer?.settings.workSeconds ?? 0)}</strong></span><span>{language === "zh-TW" ? "休息" : "REST"}<strong>{formatTimerClock(timer?.settings.restSeconds ?? 0)}</strong></span></div>
        <div className="timer-controls">
          <button onClick={onSkip} aria-label={language === "zh-TW" ? "跳過階段" : "Skip phase"}><SkipForward size={19} /><span>{language === "zh-TW" ? "跳過" : "Skip"}</span></button>
          <button className="timer-primary-control" onClick={timer?.status === "paused" ? onResume : onPause} aria-label={timer?.status === "paused" ? (language === "zh-TW" ? "繼續" : "Resume") : (language === "zh-TW" ? "暫停" : "Pause")}>{timer?.status === "paused" ? <Play size={25} /> : <Pause size={25} />}</button>
          <button onClick={onReset} aria-label={language === "zh-TW" ? "重設計時器" : "Reset timer"}><RotateCcw size={19} /><span>{language === "zh-TW" ? "重設" : "Reset"}</span></button>
        </div>
      </div> : <div className="timer-setup">
        {timer?.status === "complete" && <p className="timer-complete">{language === "zh-TW" ? "訓練完成" : "Workout complete"}</p>}
        <div className="timer-presets">
          {([["標準", 6, 3, 60], ["技術", 3, 2, 60], ["HIIT", 8, 1, 30]] as const).map(([label, presetRounds, minutes, rest]) => <button key={String(label)} onClick={() => { setRounds(presetRounds); setWorkMinutes(minutes); setRestSeconds(rest); }}><strong>{language === "zh-TW" ? label : label === "標準" ? "Standard" : label === "技術" ? "Technique" : "HIIT"}</strong><span>{presetRounds} × {minutes}:00</span></button>)}
        </div>
        <div className="timer-fields"><label>{language === "zh-TW" ? "回合數" : "Rounds"}<NumericDraftInput min={1} max={99} value={rounds} onCommit={(value) => setRounds(value ?? 1)} /></label><label>{language === "zh-TW" ? "每回合分鐘" : "Work minutes"}<NumericDraftInput min={1} max={20} value={workMinutes} onCommit={(value) => setWorkMinutes(value ?? 1)} /></label><label>{language === "zh-TW" ? "休息秒數" : "Rest seconds"}<NumericDraftInput min={0} max={600} value={restSeconds} onCommit={(value) => setRestSeconds(value ?? 0)} /></label></div>
        <div className="timer-preferences"><button className={soundEnabled ? "selected" : ""} onClick={() => onSoundChange(!soundEnabled)}>{soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}{language === "zh-TW" ? "提示音" : "Sounds"}</button><button className={voiceEnabled ? "selected" : ""} onClick={() => onVoiceChange(!voiceEnabled)}><Settings2 size={17} />{language === "zh-TW" ? "回合語音" : "Round voice"}</button></div>
        <button className="timer-start-button" onClick={start}><Play size={19} />{language === "zh-TW" ? "開始計時" : "Start timer"}</button>
      </div>}
    </section>
  </div>;
}

function syncStatusLabel(status: SyncStatus, language: Language, signedIn: boolean) {
  if (!signedIn) return language === "zh-TW" ? "僅此裝置" : "On this device";
  const labels = {
    local: { zhTW: "僅此裝置", en: "On this device" },
    syncing: { zhTW: "同步中", en: "Syncing" },
    synced: { zhTW: "已同步", en: "Synced" },
    error: { zhTW: "同步失敗", en: "Sync failed" },
  } as const;
  return language === "zh-TW" ? labels[status].zhTW : labels[status].en;
}

function AuthPanel({
  language,
  session,
  syncStatus,
  configured,
  onClose,
  onSignedOut,
}: {
  language: Language;
  session: Session | null;
  syncStatus: SyncStatus;
  configured: boolean;
  onClose: () => void;
  onSignedOut: () => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setSubmitting(true);
    setMessage("");
    const result = mode === "signup"
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: getAuthRedirectUrl() } })
      : await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (mode === "signup" && !result.data.session) {
      setMessage(language === "zh-TW" ? "確認信已寄出，請到信箱完成驗證。" : "Check your inbox to confirm your account.");
      return;
    }
    onClose();
  };

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setSubmitting(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getAuthRedirectUrl() },
    });
    if (error) {
      setSubmitting(false);
      setMessage(error.message);
    }
  };

  const resetPassword = async () => {
    if (!supabase || !email.trim()) {
      setMessage(language === "zh-TW" ? "請先輸入 Email。" : "Enter your email first.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: getAuthRedirectUrl() });
    setSubmitting(false);
    setMessage(error ? (language === "zh-TW" ? "暫時無法寄送復原信，請稍後再試。" : "We could not send a recovery email. Please try again.") : (language === "zh-TW" ? "若帳號存在，復原信已寄出。" : "If that account exists, a recovery email is on its way."));
  };

  const deleteAccount = async () => {
    if (!supabase || deletePhrase !== "DELETE") return;
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("delete-account", { method: "DELETE" });
    setSubmitting(false);
    if (error) {
      setMessage(language === "zh-TW" ? "帳號刪除失敗，資料仍保留。請稍後再試。" : "Account deletion failed. Your data is still available. Please try again.");
      return;
    }
    localStorage.removeItem(getStorageKey(session?.user.id));
    localStorage.removeItem(getStorageUpdatedAtKey(session?.user.id));
    await supabase.auth.signOut();
    onSignedOut();
  };

  const signOut = async () => {
    if (!supabase) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signOut();
    setSubmitting(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    onSignedOut();
  };

  return <div className="dialog-backdrop auth-backdrop" role="presentation">
    <section className="auth-panel" role="dialog" aria-modal="true" aria-label={language === "zh-TW" ? "Corner 帳號" : "Corner account"}>
      <button className="auth-close" onClick={onClose} aria-label={language === "zh-TW" ? "關閉" : "Close"}><X size={19} /></button>
      <div className="auth-brand"><CornerMark className="brand-mark" /><div><p className="eyebrow">CORNER CLOUD</p><h2>{session ? (language === "zh-TW" ? "帳號與同步" : "Account and sync") : (language === "zh-TW" ? "讓紀錄跟著你" : "Take your records with you")}</h2></div></div>
      {!configured ? <div className="auth-message error">Supabase is not configured.</div> : session ? <>
        <div className="account-summary">
          <UserRound size={22} />
          <div><small>{language === "zh-TW" ? "登入帳號" : "Signed in as"}</small><strong>{session.user.email}</strong></div>
        </div>
        <div className={`cloud-status ${syncStatus}`}>
          {syncStatus === "error" ? <CloudOff size={20} /> : <Cloud size={20} />}
          <div><strong>{syncStatusLabel(syncStatus, language, true)}</strong><small>{syncStatus === "error" ? (language === "zh-TW" ? "請確認資料表與網路設定" : "Check the database setup and connection") : (language === "zh-TW" ? "課表與訓練紀錄會自動保存" : "Schedules and records save automatically")}</small></div>
        </div>
        {message && <div className="auth-message error">{message}</div>}
        {confirmingDelete ? <div className="account-delete-confirm"><p>{language === "zh-TW" ? "輸入 DELETE 以永久刪除帳號與雲端資料。" : "Type DELETE to permanently remove your account and cloud data."}</p><input aria-label="Delete account confirmation" value={deletePhrase} onChange={(event) => setDeletePhrase(event.target.value)} /><div><button onClick={() => { setConfirmingDelete(false); setDeletePhrase(""); }}>{language === "zh-TW" ? "取消" : "Cancel"}</button><button className="danger" onClick={() => void deleteAccount()} disabled={submitting || deletePhrase !== "DELETE"}>{language === "zh-TW" ? "永久刪除" : "Delete permanently"}</button></div></div> : <button className="account-delete" onClick={() => setConfirmingDelete(true)} disabled={submitting}><Trash2 size={17} />{language === "zh-TW" ? "刪除帳號" : "Delete account"}</button>}
        <button className="auth-signout" onClick={() => void signOut()} disabled={submitting}><LogOut size={17} />{language === "zh-TW" ? "登出" : "Sign out"}</button>
      </> : <>
        <button className="auth-google" type="button" onClick={() => void signInWithGoogle()} disabled={submitting}>
          <img className="google-mark" src={`${import.meta.env.BASE_URL}google-g.png`} alt="" />
          {submitting
            ? (language === "zh-TW" ? "正在前往 Google" : "Connecting to Google")
            : (language === "zh-TW" ? "使用 Google 登入" : "Continue with Google")}
        </button>
        <div className="auth-divider"><span>{language === "zh-TW" ? "或使用 Email" : "or use email"}</span></div>
        <div className="auth-mode-switch">
          <button className={mode === "signin" ? "selected" : ""} onClick={() => { setMode("signin"); setMessage(""); }}>{language === "zh-TW" ? "登入" : "Sign in"}</button>
          <button className={mode === "signup" ? "selected" : ""} onClick={() => { setMode("signup"); setMessage(""); }}>{language === "zh-TW" ? "建立帳號" : "Create account"}</button>
        </div>
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <label><span>Email</span><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label><span>{language === "zh-TW" ? "密碼" : "Password"}</span><input type="password" minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {mode === "signin" && <button className="auth-recovery" type="button" onClick={() => void resetPassword()} disabled={submitting}>{language === "zh-TW" ? "忘記密碼" : "Forgot password"}</button>}
          {message && <div className={`auth-message ${message.includes("寄出") || message.includes("inbox") || message.includes("exists") ? "success" : "error"}`}>{message}</div>}
          <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? (language === "zh-TW" ? "處理中" : "Working") : mode === "signin" ? (language === "zh-TW" ? "登入並同步" : "Sign in and sync") : (language === "zh-TW" ? "建立帳號" : "Create account")}</button>
        </form>
        <p className="auth-privacy">{language === "zh-TW" ? "未登入時仍可離線使用。登入後，只有你能讀取自己的資料。" : "Corner still works offline without an account. Once signed in, only you can access your data."}</p>
      </>}
    </section>
  </div>;
}

interface TodayViewProps {
  date: Date;
  language: Language;
  plan: ReturnType<typeof getPlanForWeekday>;
  record: TrainingRecord;
  updateRecord: (patch: Partial<TrainingRecord>) => void;
  onReorder: (fromId: string, toId: string) => void;
  addDrill: () => void;
  clearRecord: () => void;
}

const planDrillAliases: Record<string, string> = {
  "coach-class": "padwork",
  cooldown: "mobility",
  footwork: "step-forward",
  rope: "skipping",
  squat: "back-squat",
  hinge: "romanian-deadlift",
  "push-pull": "bench-press",
  run: "cardio-run",
};

function getPlanDrill(itemId: string) {
  const drillId = planDrillAliases[itemId] ?? itemId;
  return drillLibrary.find((drill) => drill.id === drillId);
}

function TodayView({ date, language, plan, record, updateRecord, addDrill, clearRecord, onReorder }: TodayViewProps) {
  const completion = getRecordCompletion(plan, record);
  const percentage = completion.total
    ? Math.round((completion.completed / completion.total) * 100)
    : 0;
  const savedRecord = hasRecordContent(record);
  const itemSetLogs = record.itemSetLogs ?? {};
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const handleDragStart = (event: React.DragEvent<HTMLElement>, itemId: string) => {
    if ((event.target as HTMLElement).closest("button, input, label")) {
      event.preventDefault();
      return;
    }
    setDraggedItemId(itemId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", itemId);
  };
  const handleDrop = (event: React.DragEvent<HTMLElement>, targetId: string) => {
    event.preventDefault();
    const fromId = event.dataTransfer.getData("text/plain") || draggedItemId;
    if (fromId) onReorder(fromId, targetId);
    setDraggedItemId(null);
  };
  const visiblePlanItems = plan.items.filter((item) => !record.removedItemIds?.includes(item.id));
  const todayItems = [
    ...visiblePlanItems.map((item) => {
      const override = record.itemTargetOverrides?.[item.id];
      return {
        id: item.id,
        kind: "planned" as const,
        title: formatPlanLabel(item.label, language),
        detail: formatPlanLabel(item.detail, language),
        target: override ?? parseTrainingTarget(item.detail),
        overrideLabel: override
          ? `${language === "zh-TW" ? "今日" : "Today"} ${formatTrainingTarget(override, language)}`
          : null,
        drill: getPlanDrill(item.id),
        checked: isTrainingItemComplete(record, item.id),
      };
    }),
    ...(record.customItems ?? []).flatMap((item) => {
      const drill = drillLibrary.find((candidate) => candidate.id === item.drillId);
      if (!drill) return [];
      return [{
        id: item.id,
        kind: "custom" as const,
        title: formatPlanLabel(drill.name, language),
        detail: formatTrainingTarget({ quantity: item.quantity, unit: item.unit }, language),
        target: { quantity: item.quantity, unit: item.unit } as TrainingTarget,
        overrideLabel: null,
        drill,
        checked: item.completed || isTrainingItemComplete(record, item.id),
      }];
    }),
  ];
  const todayItemById = new Map(todayItems.map((item) => [item.id, item]));
  const orderedTodayItems = [
    ...(record.itemOrder ?? []).filter((id) => todayItemById.has(id)),
    ...todayItems.map((item) => item.id).filter((id) => !record.itemOrder?.includes(id)),
  ].map((id) => todayItemById.get(id)!);

  const updateItemSets = (itemId: string, sets: TrainingSet[]) => {
    updateRecord({ itemSetLogs: { ...itemSetLogs, [itemId]: sets } });
  };

  const addSet = (itemId: string) => {
    const currentSets = itemSetLogs[itemId] ?? [];
    const previous = currentSets[currentSets.length - 1];
    updateItemSets(itemId, [
      ...currentSets,
      {
        id: `${itemId}-set-${Date.now()}`,
        weight: previous?.weight,
        weightUnit: previous?.weightUnit ?? "kg",
        reps: previous?.reps ?? 10,
        durationSeconds: previous?.durationSeconds,
        durationText: previous?.durationText,
        completed: false,
      },
    ]);
  };

  const updateSet = (itemId: string, setId: string, patch: Partial<TrainingSet>) => {
    const nextSets = (itemSetLogs[itemId] ?? []).map((set) => set.id === setId ? { ...set, ...patch } : set);
    const completed = nextSets.some((set) => set.completed);
    const isPlannedItem = plan.items.some((item) => item.id === itemId);
    updateRecord({
      itemSetLogs: { ...itemSetLogs, [itemId]: nextSets },
      completedItemIds: isPlannedItem
        ? completed
          ? Array.from(new Set([...record.completedItemIds, itemId]))
          : record.completedItemIds.filter((id) => id !== itemId)
        : record.completedItemIds,
      customItems: isPlannedItem
        ? record.customItems
        : (record.customItems ?? []).map((item) => item.id === itemId ? { ...item, completed } : item),
    });
  };

  const removeSet = (itemId: string, setId: string) => {
    updateItemSets(itemId, (itemSetLogs[itemId] ?? []).filter((set) => set.id !== setId));
  };

  const updateTarget = (itemId: string, kind: "planned" | "custom", target: TrainingTarget) => {
    if (kind === "planned") {
      updateRecord({ itemTargetOverrides: { ...(record.itemTargetOverrides ?? {}), [itemId]: target } });
      return;
    }
    updateRecord({
      customItems: (record.customItems ?? []).map((item) => item.id === itemId ? { ...item, ...target } : item),
    });
  };

  const removePlannedItem = (id: string) => {
    updateRecord({
      removedItemIds: Array.from(new Set([...(record.removedItemIds ?? []), id])),
      completedItemIds: record.completedItemIds.filter((candidate) => candidate !== id),
      itemSetLogs: Object.fromEntries(Object.entries(itemSetLogs).filter(([itemId]) => itemId !== id)),
      itemTargetOverrides: Object.fromEntries(Object.entries(record.itemTargetOverrides ?? {}).filter(([itemId]) => itemId !== id)),
    });
  };

  const removeCustomItem = (id: string) => {
    updateRecord({
      customItems: (record.customItems ?? []).filter((candidate) => candidate.id !== id),
      itemOrder: record.itemOrder?.filter((itemId) => itemId !== id),
      itemSetLogs: Object.fromEntries(Object.entries(itemSetLogs).filter(([itemId]) => itemId !== id)),
    });
  };

  const toggleCustomItem = (id: string, isDone: boolean) => {
    updateRecord({
      customItems: (record.customItems ?? []).map((item) => item.id === id ? { ...item, completed: !isDone } : item),
      itemSetLogs: isDone ? { ...itemSetLogs, [id]: (itemSetLogs[id] ?? []).map((set) => ({ ...set, completed: false })) } : itemSetLogs,
    });
  };

  const toggleItem = (id: string) => {
    const isDone = isTrainingItemComplete(record, id);
    updateRecord({
      completedItemIds: isDone
        ? record.completedItemIds.filter((candidate) => candidate !== id)
        : [...record.completedItemIds, id],
      itemSetLogs: isDone
        ? { ...itemSetLogs, [id]: (itemSetLogs[id] ?? []).map((set) => ({ ...set, completed: false })) }
        : itemSetLogs,
    });
  };

  return (
    <div className="page today-page">
      <section className="today-workbench">
        <div className="today-hero">
        <div>
          <p className="eyebrow">{formatDate(date, language)}</p>
          <h1>{formatPlanLabel(plan.session, language)}</h1>
          <div className="session-meta">
            <span className={`intensity intensity-${plan.intensity}`}>
              {plan.intensity === "rest"
                ? t(language, "common.rest")
                : plan.startTime ?? plan.time ?? `${plan.duration} ${t(language, "common.minutes")}`}
            </span>
            {plan.intensity !== "rest" && (plan.startTime || plan.time) && (
              <span>{plan.duration} {t(language, "common.minutes")}</span>
            )}
          </div>
        </div>
        {completion.total > 0 && (
          <div
            className="progress-ring"
            style={{ "--progress": `${percentage * 3.6}deg` } as React.CSSProperties}
            aria-label={`${percentage}% ${t(language, "today.complete")}`}
          >
            <strong>{percentage}%</strong>
            <small>{t(language, "today.complete")}</small>
          </div>
        )}
        </div>
        <div className="workbench-actions">
          <div className="workbench-count"><strong>{completion.completed}/{completion.total}</strong><span>{t(language, "today.progress")}</span></div>
          <button className="add-training" onClick={addDrill}><Plus size={18} />{language === "zh-TW" ? "新增動作" : "Add drill"}</button>
          {savedRecord && <button className="cancel-record" onClick={() => { if (window.confirm(language === "zh-TW" ? "取消今天的全部訓練紀錄？" : "Cancel all records for today?")) clearRecord(); }}><Trash2 size={16} />{language === "zh-TW" ? "取消紀錄" : "Cancel record"}</button>}
        </div>
      </section>

      <section className="focus-strip">
        <Dumbbell size={18} />
        <div>
          <small>{t(language, "today.focus")}</small>
          <strong>{formatPlanLabel(plan.focus, language)}</strong>
        </div>
      </section>

      {completion.total === 0 ? (
        <section className="rest-card">
          <span className="rest-orbit" />
          <h2>{formatPlanLabel(plan.session, language)}</h2>
          <p>{t(language, "today.rest")}</p>
          <button className="add-training rest-add-training" onClick={addDrill}><Plus size={18} />{language === "zh-TW" ? "今天想動一下" : "Add a workout"}</button>
        </section>
      ) : (
        <>
          <section className="training-list" aria-labelledby="training-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t(language, "today.progress")}</p>
                <h2 id="training-heading">
                  {completion.completed} / {completion.total}
                </h2>
              </div>
              <span className="rule-number">01</span>
            </div>
            <div className="checklist">
              {orderedTodayItems.map((item, index) => (
                <details className={`training-entry ${item.kind === "custom" ? "custom-training-entry " : ""}${item.checked ? "checked" : ""}`} key={item.id}>
                  <summary className={`training-item ${item.kind === "planned" ? "removable-training-item" : "custom-training-item"} draggable-item ${draggedItemId === item.id ? "dragging" : ""}`} draggable onDragStart={(event) => handleDragStart(event, item.id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, item.id)} onDragEnd={() => setDraggedItemId(null)}>
                    <label className="completion-toggle" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => item.kind === "planned" ? toggleItem(item.id) : toggleCustomItem(item.id, item.checked)}
                        aria-label={`${item.title} — ${item.detail}`}
                      />
                      <span className="custom-check">{item.checked && <Check size={17} />}</span>
                    </label>
                    <span className="item-order">{String(index + 1).padStart(2, "0")}</span>
                    <span className={`training-drill-icon${item.drill?.imageUrl ? " has-image" : ""}${item.drill?.imagePosition ? " sprite-image" : ""}`} style={item.drill?.imagePosition ? { backgroundImage: `url(${item.drill.imageUrl})`, backgroundPosition: item.drill.imagePosition } : undefined} aria-hidden="true">
                      {item.drill?.imageUrl && !item.drill.imagePosition ? <img src={item.drill.imageUrl} alt="" /> : !item.drill?.imageUrl ? <span>{item.title.slice(0, 1)}</span> : null}
                    </span>
                    <span className="item-copy"><strong>{item.title}</strong><small>{item.overrideLabel ?? item.detail}</small></span>
                    <span className="set-count">{itemSetLogs[item.id]?.length ?? 0} {language === "zh-TW" ? "組" : "sets"}</span>
                    <GripVertical className="drag-handle" size={17} aria-hidden="true" />
                    <button className="remove-training-item" onClick={(event) => { event.preventDefault(); event.stopPropagation(); item.kind === "planned" ? removePlannedItem(item.id) : removeCustomItem(item.id); }} aria-label={`${language === "zh-TW" ? "移除" : "Remove"} ${item.title}`} title={language === "zh-TW" ? "移除動作" : "Remove drill"}><Minus size={17} /></button>
                  </summary>
                  {item.target && (
                    <TodayTargetEditor
                      itemTitle={item.title}
                      target={item.target}
                      language={language}
                      onChange={(target) => updateTarget(item.id, item.kind, target)}
                    />
                  )}
                  <TrainingSetLogger
                    itemId={item.id}
                    itemTitle={item.title}
                    language={language}
                    sets={itemSetLogs[item.id] ?? []}
                    onAddSet={addSet}
                    onUpdateSet={updateSet}
                    onRemoveSet={removeSet}
                  />
                </details>
              ))}
            </div>
          </section>

          <section className="journal-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">SESSION NOTES</p>
                <h2>{language === "zh-TW" ? "訓練筆記" : "Training notes"}</h2>
              </div>
              <span className="rule-number">02</span>
            </div>

            <div className="rpe-field">
              <label htmlFor="rpe">{t(language, "field.rpe")}</label>
              <div className="rpe-control">
                <input
                  id="rpe"
                  type="range"
                  min="1"
                  max="10"
                  value={record.rpe ?? 5}
                  onChange={(event) => updateRecord({ rpe: Number(event.target.value) })}
                />
                <output>{record.rpe ?? 5}</output>
              </div>
              <div className="range-labels"><span>1</span><span>10</span></div>
            </div>

            <div className="notes-grid">
              <TextField
                label={t(language, "field.technical")}
                placeholder={t(language, "field.technicalPlaceholder")}
                value={record.technicalNotes ?? ""}
                onChange={(technicalNotes) => updateRecord({ technicalNotes })}
              />
              <TextField
                label={t(language, "field.body")}
                placeholder={t(language, "field.bodyPlaceholder")}
                value={record.bodyCheck ?? ""}
                onChange={(bodyCheck) => updateRecord({ bodyCheck })}
              />
              <TextField
                label={t(language, "field.next")}
                placeholder={t(language, "field.nextPlaceholder")}
                value={record.nextFocus ?? ""}
                onChange={(nextFocus) => updateRecord({ nextFocus })}
              />
            </div>
            <p className="autosave"><span />{t(language, "today.autosave")}</p>
          </section>
        </>
      )}
    </div>
  );
}


function formatDurationInput(seconds?: number) {
  if (seconds === undefined) return "";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getDurationParts(seconds?: number) {
  return {
    minutes: seconds === undefined ? 0 : Math.floor(seconds / 60),
    seconds: seconds === undefined ? 0 : seconds % 60,
  };
}

function combineDuration(minutes: number, seconds: number) {
  const normalizedSeconds = Math.min(Math.max(seconds, 0), 59);
  return minutes * 60 + normalizedSeconds;
}

function DurationPicker({ value, language, label, onChange }: { value?: number; language: Language; label: string; onChange: (seconds: number) => void }) {
  const [open, setOpen] = useState(false);
  const [draftSeconds, setDraftSeconds] = useState(value ?? 0);
  const parts = getDurationParts(draftSeconds);
  const openPicker = () => { setDraftSeconds(value ?? 0); setOpen(true); };
  const updatePart = (minutes: number, seconds: number) => setDraftSeconds(combineDuration(minutes, seconds));
  const display = formatDurationInput(value ?? 0);

  return <>
    <button type="button" className="duration-picker-trigger" onClick={openPicker} aria-label={label}>{display}<span aria-hidden="true">⌄</span></button>
    {open && <div className="dialog-backdrop duration-picker-backdrop" role="presentation">
      <section className="duration-picker-sheet" role="dialog" aria-modal="true" aria-label={language === "zh-TW" ? "選擇時間" : "Choose duration"}>
        <div className="duration-picker-actions">
          <button type="button" onClick={() => setOpen(false)}>{language === "zh-TW" ? "取消" : "Cancel"}</button>
          <strong>{language === "zh-TW" ? "選擇時間" : "Duration"}</strong>
          <button type="button" onClick={() => { onChange(draftSeconds); setOpen(false); }} aria-label={language === "zh-TW" ? "確認時間" : "Confirm duration"}>{language === "zh-TW" ? "完成" : "Done"}</button>
        </div>
        <div className="duration-wheels">
          <div className="wheel-column">
            <select value={parts.minutes} onChange={(event) => updatePart(Number(event.target.value), parts.seconds)} aria-label={`${label} ${language === "zh-TW" ? "分鐘" : "minutes"}`}>
              {Array.from({ length: 31 }, (_, minute) => <option value={minute} key={minute}>{String(minute).padStart(2, "0")}</option>)}
            </select>
            <span>{language === "zh-TW" ? "分" : "min"}</span>
          </div>
          <b>:</b>
          <div className="wheel-column">
            <select value={parts.seconds} onChange={(event) => updatePart(parts.minutes, Number(event.target.value))} aria-label={`${label} ${language === "zh-TW" ? "秒數" : "seconds"}`}>
              {Array.from({ length: 60 }, (_, second) => <option value={second} key={second}>{String(second).padStart(2, "0")}</option>)}
            </select>
            <span>{language === "zh-TW" ? "秒" : "sec"}</span>
          </div>
        </div>
      </section>
    </div>}
  </>;
}

function TodayTargetEditor({
  itemTitle,
  target,
  language,
  onChange,
}: {
  itemTitle: string;
  target: TrainingTarget;
  language: Language;
  onChange: (target: TrainingTarget) => void;
}) {
  const unitLabel = target.unit === "rounds"
    ? (language === "zh-TW" ? "回合" : "rounds")
    : (language === "zh-TW" ? "分鐘" : "min");
  const label = language === "zh-TW" ? `${itemTitle}今日目標` : `${itemTitle} today target`;
  const step = (delta: number) => onChange({ ...target, quantity: Math.max(1, target.quantity + delta) });
  return (
    <div className="today-target-editor">
      <small>{language === "zh-TW" ? "今日目標" : "Today target"}</small>
      <div className="target-stepper">
        <button
          onClick={() => step(-1)}
          disabled={target.quantity <= 1}
          aria-label={`${language === "zh-TW" ? "減少" : "Decrease "}${label}`}
        >
          <Minus size={13} />
        </button>
        <NumericDraftInput
          min={1}
          inputMode="numeric"
          value={target.quantity}
          onCommit={(quantity) => onChange({ ...target, quantity: quantity ?? 1 })}
          aria-label={label}
        />
        <button
          onClick={() => step(1)}
          aria-label={`${language === "zh-TW" ? "增加" : "Increase "}${label}`}
        >
          <Plus size={13} />
        </button>
        <span className="target-unit">{unitLabel}</span>
      </div>
    </div>
  );
}

function TrainingSetLogger({
  itemId,
  itemTitle,
  language,
  sets,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
}: {
  itemId: string;
  itemTitle: string;
  language: Language;
  sets: TrainingSet[];
  onAddSet: (itemId: string) => void;
  onUpdateSet: (itemId: string, setId: string, patch: Partial<TrainingSet>) => void;
  onRemoveSet: (itemId: string, setId: string) => void;
}) {
  return (
    <div className="set-logger" aria-label={language === "zh-TW" ? "組數紀錄" : "Set log"}>
      {sets.length === 0 ? (
        <p className="set-empty">{language === "zh-TW" ? "展開後可新增每一組的重量、單位、次數、時間與完成狀態。" : "Add sets to log weight, unit, reps, time, and completion."}</p>
      ) : (
        <div className="set-table">
          {sets.map((set, index) => (
            <div className={`set-row ${set.completed ? "completed" : ""}`} key={set.id}>
              <span className="set-index">{index + 1}</span>
              <label className="weight-field">
                <small>{language === "zh-TW" ? "重量" : "Weight"}</small>
                <span>
                  <NumericDraftInput
                    min={0}
                    inputMode="decimal"
                    value={set.weight}
                    allowEmpty
                    onCommit={(weight) => onUpdateSet(itemId, set.id, { weight })}
                    aria-label={`${language === "zh-TW" ? "第" : "Set "}${index + 1}${language === "zh-TW" ? "組重量" : " weight"}`}
                  />
                  <select
                    value={set.weightUnit ?? "kg"}
                    onChange={(event) => onUpdateSet(itemId, set.id, { weightUnit: event.target.value as TrainingSet["weightUnit"] })}
                    aria-label={`${language === "zh-TW" ? "第" : "Set "}${index + 1}${language === "zh-TW" ? "組重量單位" : " weight unit"}`}
                  >
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                  </select>
                </span>
              </label>
              <label>
                <small>{language === "zh-TW" ? "次數" : "Reps"}</small>
                <NumericDraftInput
                  min={0}
                  inputMode="numeric"
                  value={set.reps}
                  allowEmpty
                  onCommit={(reps) => onUpdateSet(itemId, set.id, { reps })}
                  aria-label={`${language === "zh-TW" ? "第" : "Set "}${index + 1}${language === "zh-TW" ? "組次數" : " reps"}`}
                />
              </label>
              <div className="duration-field">
                <small>{language === "zh-TW" ? "時間" : "Time"}</small>
                <DurationPicker
                  value={set.durationSeconds}
                  language={language}
                  label={`${language === "zh-TW" ? "第" : "Set "}${index + 1}${language === "zh-TW" ? "組時間" : " time"}`}
                  onChange={(durationSeconds) => onUpdateSet(itemId, set.id, { durationSeconds, durationText: formatDurationInput(durationSeconds) })}
                />
              </div>
              <button
                className={set.completed ? "set-done active" : "set-done"}
                onClick={() => onUpdateSet(itemId, set.id, { completed: !set.completed })}
                aria-label={`${language === "zh-TW" ? "完成第" : "Complete set "}${index + 1}${language === "zh-TW" ? "組" : ""}`}
              >
                <Check size={19} />
              </button>
              <button
                className="set-remove"
                onClick={() => onRemoveSet(itemId, set.id)}
                aria-label={`${language === "zh-TW" ? "刪除第" : "Remove set "}${index + 1}${language === "zh-TW" ? "組" : ""}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        className="add-set"
        onClick={() => onAddSet(itemId)}
        aria-label={language === "zh-TW" ? `新增${itemTitle}一組` : `Add set for ${itemTitle}`}
      >
        <Plus size={17} />{language === "zh-TW" ? "新增一組" : "Add set"}
      </button>
    </div>
  );
}

function DrillLibraryView({
  language,
  favorites,
  customDrills,
  onFavorite,
  onAdd,
  onCreate,
}: {
  language: Language;
  favorites: string[];
  customDrills: Drill[];
  onFavorite: (id: string) => void;
  onAdd: (drill: Drill) => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Drill["category"] | "all">("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [domain, setDomain] = useState<TrainingDomain>("boxing");
  const [equipment, setEquipment] = useState<EquipmentType | "all">("all");
  const drills = filterDrills([...customDrills, ...drillLibrary], { query, domain, category, equipment, favoriteIds: favorites, favoritesOnly: onlyFavorites });
  const categories: Array<[Drill["category"] | "all", string]> = domain === "boxing"
    ? [
        ["all", language === "zh-TW" ? "全部" : "All"],
        ["fundamentals", language === "zh-TW" ? "基礎" : "Basics"],
        ["footwork", language === "zh-TW" ? "步法" : "Footwork"],
        ["offense", language === "zh-TW" ? "進攻" : "Offense"],
        ["defense", language === "zh-TW" ? "防守" : "Defense"],
        ["equipment", language === "zh-TW" ? "器材" : "Equipment"],
        ["conditioning", language === "zh-TW" ? "體能" : "Conditioning"],
      ]
    : [
        ["all", language === "zh-TW" ? "全部" : "All"],
        ["chest", language === "zh-TW" ? "胸" : "Chest"],
        ["back", language === "zh-TW" ? "背" : "Back"],
        ["legs", language === "zh-TW" ? "腿" : "Legs"],
        ["shoulders", language === "zh-TW" ? "肩" : "Shoulders"],
        ["arms", language === "zh-TW" ? "手臂" : "Arms"],
        ["core", language === "zh-TW" ? "核心" : "Core"],
        ["calves", language === "zh-TW" ? "小腿" : "Calves"],
        ["cardio", language === "zh-TW" ? "有氧" : "Cardio"],
      ];
  const equipmentOptions: Array<[EquipmentType | "all", string]> = [
    ["all", language === "zh-TW" ? "全部器材" : "All equipment"],
    ["barbell", language === "zh-TW" ? "槓鈴" : "Barbell"],
    ["dumbbell", language === "zh-TW" ? "啞鈴" : "Dumbbell"],
    ["kettlebell", language === "zh-TW" ? "壺鈴" : "Kettlebell"],
    ["cable", language === "zh-TW" ? "繩索" : "Cable"],
    ["hammer", language === "zh-TW" ? "悍馬" : "Hammer"],
    ["machine", language === "zh-TW" ? "器材" : "Machine"],
    ["bodyweight", language === "zh-TW" ? "自重" : "Bodyweight"],
  ];
  const changeDomain = (nextDomain: TrainingDomain) => { setDomain(nextDomain); setCategory("all"); setEquipment("all"); };
  const changeCategory = (nextCategory: Drill["category"] | "all") => { setCategory(nextCategory); if (nextCategory === "cardio") setEquipment("all"); };

  return (
    <div className="page library-page">
      <div className="library-type-switch" aria-label={language === "zh-TW" ? "訓練類型" : "Training type"}>
        <button className={domain === "boxing" ? "selected" : ""} onClick={() => changeDomain("boxing")}>{language === "zh-TW" ? "拳擊" : "Boxing"}</button>
        <button className={domain === "strength" ? "selected" : ""} onClick={() => changeDomain("strength")}>{language === "zh-TW" ? "重訓" : "Strength"}</button>
      </div>
      {domain === "strength" && <p className="library-attribution">{language === "zh-TW" ? "重訓示意圖部分來源：wger，採 CC BY-SA 授權；有氧圖示為 Corner 原創。" : "Strength visuals are partly from wger under CC BY-SA; cardio visuals are original Corner illustrations."} <a href="https://wger.de" target="_blank" rel="noreferrer">wger.de</a></p>}
      <section className="library-toolbar">
        <label className="library-search">
          <Search size={21} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={language === "zh-TW" ? "搜尋動作" : "Search drills"}
            aria-label={language === "zh-TW" ? "搜尋動作" : "Search drills"}
          />
        </label>
        <button className="library-add-button" onClick={onCreate} aria-label={language === "zh-TW" ? "新增動作" : "Add drill"}>
          <Plus size={29} />
        </button>
      </section>

      <section className="library-layout">
        <aside className="category-rail" aria-label={language === "zh-TW" ? "動作分類" : "Drill categories"}>
          {categories.map(([id, label]) => (
            <button className={category === id ? "selected" : ""} onClick={() => changeCategory(id)} key={id}>
              {label}
            </button>
          ))}
          <button className={onlyFavorites ? "selected favorite-filter" : "favorite-filter"} onClick={() => setOnlyFavorites(!onlyFavorites)} aria-pressed={onlyFavorites}>
            <Heart size={15} fill={onlyFavorites ? "currentColor" : "none"} />
            {language === "zh-TW" ? "收藏" : "Favorites"}
          </button>
        </aside>

        <div className="library-content">
          <div className="library-heading">
            <p className="eyebrow">{domain === "boxing" ? "BOXING DATABASE" : "STRENGTH DATABASE"}</p>
            <h1>{domain === "boxing" ? (language === "zh-TW" ? "拳擊資料庫" : "Boxing database") : (language === "zh-TW" ? "重訓資料庫" : "Strength database")}</h1>
            <p>{domain === "boxing" ? (language === "zh-TW" ? "搜尋技術、步法、沙包與體能動作，直接加入今天訓練。" : "Search boxing skills, footwork, bag work, and conditioning. Add any drill to today.") : (language === "zh-TW" ? "依部位挑選重訓動作，記錄重量、次數與組數。" : "Browse strength exercises by body part and log load, reps, and sets.")}</p>
          </div>
          <div className="category-chips">
            {categories.map(([id, label]) => (
              <button className={category === id ? "selected" : ""} onClick={() => changeCategory(id)} key={id}>{label}</button>
            ))}
            <button className={onlyFavorites ? "selected favorite-chip" : "favorite-chip"} onClick={() => setOnlyFavorites(!onlyFavorites)} aria-pressed={onlyFavorites}>
              <Heart size={15} fill={onlyFavorites ? "currentColor" : "none"} />
              {language === "zh-TW" ? "收藏" : "Favorites"}
            </button>
          </div>
          {domain === "strength" && <div className="equipment-chips" aria-label={language === "zh-TW" ? "器材篩選" : "Equipment filter"}>
            {equipmentOptions.map(([id, label]) => <button className={equipment === id ? "selected" : ""} onClick={() => setEquipment(id)} key={id}>{label}</button>)}
          </div>}
          <div className="drill-grid">
            {drills.map((drill) => {
              const favorite = favorites.includes(drill.id);
              const title = formatPlanLabel(drill.name, language);
              const unit = drill.defaultUnit === "rounds" ? (language === "zh-TW" ? "回合" : "rounds") : (language === "zh-TW" ? "分鐘" : "min");
              return (
                <article className="drill-card" key={drill.id}>
                  <div className="drill-card-top">
                    <span className="explain-pill">{language === "zh-TW" ? "講解" : "Guide"}</span>
                    <button className={favorite ? "favorite active" : "favorite"} onClick={() => onFavorite(drill.id)} aria-label={`${language === "zh-TW" ? "收藏" : "Favorite"} ${title}`}>
                      <Heart size={16} />
                    </button>
                  </div>
                  <div className={drill.imageUrl ? `drill-visual has-image${drill.imagePosition ? " sprite-image" : ""}` : "drill-visual"} style={drill.imagePosition ? { backgroundImage: `url(${drill.imageUrl})`, backgroundPosition: drill.imagePosition } : undefined} aria-hidden="true">
                    {drill.imageUrl && !drill.imagePosition ? <img src={drill.imageUrl} alt="" loading="lazy" /> : !drill.imageUrl ? <span>{title.slice(0, 1)}</span> : null}
                  </div>
                  <h2>{title}</h2>
                  <p>{formatPlanLabel(drill.cue, language)}</p>
                  <small>{drill.defaultQuantity} {unit}</small>
                  <button className="add-drill" onClick={() => onAdd(drill)} aria-label={`${language === "zh-TW" ? "加入" : "Add"} ${title}`}>
                    <Plus size={16} />{language === "zh-TW" ? "加入" : "Add"}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
function CreateLibraryDrillPanel({ language, onClose, onConfirm }: { language: Language; onClose: () => void; onConfirm: (drill: Drill) => void }) {
  const [name, setName] = useState("");
  const [englishName, setEnglishName] = useState("");
  const [cue, setCue] = useState("");
  const [domain, setDomain] = useState<TrainingDomain>("boxing");
  const [category, setCategory] = useState<DrillCategory>("fundamentals");
  const [unit, setUnit] = useState<"rounds" | "minutes">("rounds");
  const [quantity, setQuantity] = useState(3);
  const categories: Array<[DrillCategory, string]> = domain === "boxing"
    ? [["fundamentals", language === "zh-TW" ? "基礎" : "Basics"], ["footwork", language === "zh-TW" ? "步法" : "Footwork"], ["offense", language === "zh-TW" ? "進攻" : "Offense"], ["defense", language === "zh-TW" ? "防守" : "Defense"], ["equipment", language === "zh-TW" ? "器材" : "Equipment"], ["conditioning", language === "zh-TW" ? "體能" : "Conditioning"]]
    : [["chest", language === "zh-TW" ? "胸" : "Chest"], ["back", language === "zh-TW" ? "背" : "Back"], ["legs", language === "zh-TW" ? "腿" : "Legs"], ["shoulders", language === "zh-TW" ? "肩" : "Shoulders"], ["arms", language === "zh-TW" ? "手臂" : "Arms"], ["core", language === "zh-TW" ? "核心" : "Core"], ["calves", language === "zh-TW" ? "小腿" : "Calves"], ["cardio", language === "zh-TW" ? "有氧" : "Cardio"]];
  const changeDomain = (nextDomain: TrainingDomain) => { setDomain(nextDomain); setCategory(nextDomain === "boxing" ? "fundamentals" : "chest"); };
  const save = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const positiveQuantity = Math.max(1, quantity ?? 1);
    onConfirm({
      id: `custom-${Date.now()}`,
      domain,
      category,
      name: { zhTW: trimmedName, en: englishName.trim() || trimmedName },
      cue: { zhTW: cue.trim() || (language === "zh-TW" ? "自訂訓練動作" : "Custom training drill"), en: cue.trim() || "Custom training drill" },
      defaultUnit: unit,
      defaultQuantity: positiveQuantity,
    });
  };

  return <div className="dialog-backdrop" role="presentation"><section className="add-dialog create-drill-dialog" role="dialog" aria-modal="true" aria-label={language === "zh-TW" ? "新增自訂動作" : "Create custom drill"}>
    <p className="eyebrow">CUSTOM DRILL</p>
    <h2>{language === "zh-TW" ? "新增到動作庫" : "Add to your library"}</h2>
    <label>{language === "zh-TW" ? "動作名稱" : "Drill name"}<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder={language === "zh-TW" ? "例如：閃躲接右直拳" : "e.g. Slip to cross"} /></label>
    <label>{language === "zh-TW" ? "英文名稱（選填）" : "English name (optional)"}<input value={englishName} onChange={(event) => setEnglishName(event.target.value)} /></label>
    <label>{language === "zh-TW" ? "提示（選填）" : "Cue (optional)"}<input value={cue} onChange={(event) => setCue(event.target.value)} placeholder={language === "zh-TW" ? "例如：下潛後立刻回到護手" : "e.g. Return to guard after the slip"} /></label>
    <label>{language === "zh-TW" ? "訓練類型" : "Training type"}<select value={domain} onChange={(event) => changeDomain(event.target.value as TrainingDomain)}><option value="boxing">{language === "zh-TW" ? "拳擊" : "Boxing"}</option><option value="strength">{language === "zh-TW" ? "重訓" : "Strength"}</option></select></label>
    <label>{language === "zh-TW" ? "分類" : "Category"}<select value={category} onChange={(event) => setCategory(event.target.value as DrillCategory)}>{categories.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
    <div className="custom-drill-defaults"><label>{language === "zh-TW" ? "預設數量" : "Default quantity"}<NumericDraftInput min={1} value={quantity} onCommit={(value) => setQuantity(value ?? 1)} /></label><label>{language === "zh-TW" ? "單位" : "Unit"}<select value={unit} onChange={(event) => setUnit(event.target.value as "rounds" | "minutes")}><option value="rounds">{language === "zh-TW" ? "回合" : "Rounds"}</option><option value="minutes">{language === "zh-TW" ? "分鐘" : "Minutes"}</option></select></label></div>
    <div className="dialog-actions"><button onClick={onClose}>{language === "zh-TW" ? "取消" : "Cancel"}</button><button onClick={save} disabled={!name.trim()}>{language === "zh-TW" ? "儲存動作" : "Save drill"}</button></div>
  </section></div>;
}

function AddDrillPanel({ drill, language, onClose, onConfirm }: { drill: Drill; language: Language; onClose: () => void; onConfirm: (item: CustomTrainingItem) => void }) {
  const [quantity, setQuantity] = useState(drill.defaultQuantity); const [unit, setUnit] = useState(drill.defaultUnit);
  const name = formatPlanLabel(drill.name, language); const unitLabel = unit === "rounds" ? (language === "zh-TW" ? "回合數" : "Rounds") : (language === "zh-TW" ? "分鐘數" : "Minutes");
  const positiveQuantity = Math.max(1, quantity ?? 1);
  return <div className="dialog-backdrop" role="presentation"><section className="add-dialog" role="dialog" aria-modal="true" aria-label={`${language === "zh-TW" ? "加入訓練：" : "Add training: "}${name}`}><p className="eyebrow">SCHEDULE DRILL</p><h2>{language === "zh-TW" ? `加入訓練：${name}` : `Add training: ${name}`}</h2><label>{unitLabel}<NumericDraftInput min={1} value={quantity} onCommit={(value) => setQuantity(value ?? 1)} /></label><div className="unit-toggle"><button className={unit === "rounds" ? "selected" : ""} onClick={() => setUnit("rounds")}>{language === "zh-TW" ? "回合" : "Rounds"}</button><button className={unit === "minutes" ? "selected" : ""} onClick={() => setUnit("minutes")}>{language === "zh-TW" ? "分鐘" : "Minutes"}</button></div><div className="dialog-actions"><button onClick={onClose}>{language === "zh-TW" ? "取消" : "Cancel"}</button><button onClick={() => onConfirm({ id: `${drill.id}-${Date.now()}`, drillId: drill.id, quantity: positiveQuantity, unit, completed: false })}>{language === "zh-TW" ? "加入訓練" : "Add training"}</button></div></section></div>;
}

function TextField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-field">
      <span>{label}</span>
      <textarea
        rows={3}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}


const weekdayOrder: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function ScheduleView({
  language,
  initialDay,
  weeklyPlan,
  customDrills,
  onUpdateDay,
  onReplaceSchedule,
}: {
  language: Language;
  initialDay: Weekday;
  weeklyPlan: DayPlan[];
  customDrills: Drill[];
  onUpdateDay: (day: DayPlan) => void;
  onReplaceSchedule: (schedule: DayPlan[]) => void;
}) {
  const [selectedDay, setSelectedDay] = useState<Weekday>(initialDay);
  const [showDrills, setShowDrills] = useState(false);
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<TrainingDomain>("boxing");
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const day = getPlanForWeekday(selectedDay, weeklyPlan);
  const availableDrills = filterDrills([...customDrills, ...drillLibrary], {
    query,
    domain,
    category: "all",
    favoriteIds: [],
    favoritesOnly: false,
  });

  const update = (patch: Partial<DayPlan>) => onUpdateDay({ ...day, ...patch });
  const updateLabel = (field: "session" | "focus", locale: "zhTW" | "en", value: string) => {
    update({ [field]: { ...day[field], [locale]: value } });
  };
  const setTrainingType = (trainingType: TrainingType) => {
    if (trainingType === "rest") {
      update({ trainingType, intensity: "rest", duration: 0, startTime: undefined, time: undefined, items: [] });
      return;
    }
    update({ trainingType, intensity: day.intensity === "rest" ? "moderate" : day.intensity, time: undefined });
  };
  const addPlanItem = (drill: Drill) => {
    const item: PlanItem = {
      id: `plan-${drill.id}-${Date.now()}`,
      label: { ...drill.name },
      detail: {
        zhTW: `${drill.defaultQuantity} ${drill.defaultUnit === "rounds" ? "回合" : "分鐘"}`,
        en: `${drill.defaultQuantity} ${drill.defaultUnit === "rounds" ? "rounds" : "min"}`,
      },
    };
    update({ items: [...day.items, item] });
  };
  const handleScheduleDragStart = (event: React.DragEvent<HTMLElement>, itemId: string) => {
    if ((event.target as HTMLElement).closest("button, input, label")) {
      event.preventDefault();
      return;
    }
    setDraggedItemId(itemId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", itemId);
  };
  const handleScheduleDrop = (event: React.DragEvent<HTMLElement>, targetId: string) => {
    event.preventDefault();
    const fromId = event.dataTransfer.getData("text/plain") || draggedItemId;
    if (fromId && fromId !== targetId) {
      const fromIndex = day.items.findIndex((item) => item.id === fromId);
      const targetIndex = day.items.findIndex((item) => item.id === targetId);
      if (fromIndex >= 0 && targetIndex >= 0) {
        const items = [...day.items];
        const [moved] = items.splice(fromIndex, 1);
        items.splice(targetIndex, 0, moved);
        update({ items });
      }
    }
    setDraggedItemId(null);
  };

  return (
    <div className="page inner-page schedule-page">
      <section className="page-intro schedule-intro">
        <div>
          <p className="eyebrow">WEEKLY SCHEDULE</p>
          <h1>{language === "zh-TW" ? "我的課表" : "My schedule"}</h1>
          <p>{language === "zh-TW" ? "依你的生活調整一週節奏，變更會自動儲存在這台裝置。" : "Shape the week around your life. Changes save on this device."}</p>
        </div>
        <div className="schedule-template-actions">
          <button onClick={() => { if (window.confirm(language === "zh-TW" ? "套用 Gerald 課表範本？目前課表會被取代。" : "Apply Gerald's template? Your current schedule will be replaced.")) onReplaceSchedule(cloneWeeklyPlan()); }}>
            <RotateCcw size={16} />{language === "zh-TW" ? "Gerald 範本" : "Gerald template"}
          </button>
          <button onClick={() => { if (window.confirm(language === "zh-TW" ? "建立空白課表？目前課表會被取代。" : "Create a blank schedule? Your current schedule will be replaced.")) onReplaceSchedule(createBlankWeeklyPlan()); }}>
            {language === "zh-TW" ? "空白課表" : "Blank schedule"}
          </button>
        </div>
      </section>

      <section className="week-schedule-strip" aria-label={language === "zh-TW" ? "選擇星期" : "Choose weekday"}>
        {weekdayOrder.map((weekday) => {
          const candidate = getPlanForWeekday(weekday, weeklyPlan);
          return <button key={weekday} className={weekday === selectedDay ? "selected" : ""} onClick={() => setSelectedDay(weekday)}>
            <small>{formatPlanLabel(candidate.dayLabel, language)}</small>
            <strong>{formatPlanLabel(candidate.session, language)}</strong>
            <span>{candidate.trainingType === "rest" ? (language === "zh-TW" ? "休息" : "Rest") : `${candidate.duration} min`}</span>
          </button>;
        })}
      </section>

      <section className="schedule-editor">
        <div className="schedule-editor-heading">
          <div><p className="eyebrow">{formatPlanLabel(day.dayLabel, language)}</p><h2>{formatPlanLabel(day.session, language)}</h2></div>
          <span className={`intensity intensity-${day.intensity}`}>{day.trainingType.toUpperCase()}</span>
        </div>

        <div className="schedule-type-switch" aria-label={language === "zh-TW" ? "訓練類型" : "Training type"}>
          {(["boxing", "strength", "mixed", "rest"] as TrainingType[]).map((type) => <button key={type} className={day.trainingType === type ? "selected" : ""} onClick={() => setTrainingType(type)}>
            {language === "zh-TW" ? ({ boxing: "拳擊", strength: "重訓", mixed: "混合", rest: "休息" } as const)[type] : ({ boxing: "Boxing", strength: "Strength", mixed: "Mixed", rest: "Rest" } as const)[type]}
          </button>)}
        </div>

        <div className="schedule-fields">
          <label><span>{t(language, "schedule.sessionZh")}</span><input value={day.session.zhTW} onChange={(event) => updateLabel("session", "zhTW", event.target.value)} /></label>
          <label><span>{t(language, "schedule.sessionEn")}</span><input value={day.session.en} onChange={(event) => updateLabel("session", "en", event.target.value)} /></label>
          <label><span>{language === "zh-TW" ? "開始時間" : "Start time"}</span><input type="time" disabled={day.trainingType === "rest"} value={day.startTime ?? ""} onChange={(event) => update({ startTime: event.target.value, time: undefined })} /></label>
          <label><span>{language === "zh-TW" ? "分鐘" : "Minutes"}</span><NumericDraftInput min={0} step="5" disabled={day.trainingType === "rest"} value={day.duration} onCommit={(value) => update({ duration: Math.max(0, value ?? 0) })} /></label>
          <label className="wide"><span>{t(language, "schedule.focusZh")}</span><input value={day.focus.zhTW} onChange={(event) => updateLabel("focus", "zhTW", event.target.value)} /></label>
          <label className="wide"><span>{t(language, "schedule.focusEn")}</span><input value={day.focus.en} onChange={(event) => updateLabel("focus", "en", event.target.value)} /></label>
        </div>

        <div className="schedule-items-heading">
          <div><h3>{language === "zh-TW" ? "預設動作" : "Default drills"}</h3><p>{language === "zh-TW" ? "按住動作列即可拖曳排序" : "Drag a drill to reorder"}</p></div>
          <button className="add-training" onClick={() => setShowDrills((open) => !open)}><Plus size={17} />{language === "zh-TW" ? "加入動作" : "Add drill"}</button>
        </div>

        {showDrills && <div className="schedule-drill-picker">
          <div className="schedule-picker-toolbar">
            <label><Search size={17} /><input placeholder={language === "zh-TW" ? "搜尋動作" : "Search drills"} value={query} onChange={(event) => setQuery(event.target.value)} /></label>
            <div className="schedule-domain-switch"><button className={domain === "boxing" ? "selected" : ""} onClick={() => setDomain("boxing")}>{language === "zh-TW" ? "拳擊" : "Boxing"}</button><button className={domain === "strength" ? "selected" : ""} onClick={() => setDomain("strength")}>{language === "zh-TW" ? "重訓" : "Strength"}</button></div>
          </div>
          <div className="schedule-drill-options">{availableDrills.map((drill) => <button key={drill.id} onClick={() => addPlanItem(drill)}><Plus size={15} /><span><strong>{formatPlanLabel(drill.name, language)}</strong><small>{formatPlanLabel(drill.cue, language)}</small></span></button>)}</div>
        </div>}

        <div className="schedule-item-list">
          {day.items.length === 0 ? <div className="schedule-empty">{language === "zh-TW" ? "尚未安排動作，當天仍可臨時加入。" : "No drills planned. You can still add one that day."}</div> : day.items.map((entry, index) => <div className={`schedule-item-row ${draggedItemId === entry.id ? "dragging" : ""}`} key={entry.id} draggable onDragStart={(event) => handleScheduleDragStart(event, entry.id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleScheduleDrop(event, entry.id)} onDragEnd={() => setDraggedItemId(null)}>
            <span className="item-order">{String(index + 1).padStart(2, "0")}</span>
            <span className="item-copy"><strong>{formatPlanLabel(entry.label, language)}</strong><small>{formatPlanLabel(entry.detail, language)}</small></span>
            <button className="danger" onClick={() => update({ items: day.items.filter((item) => item.id !== entry.id) })} aria-label={`${language === "zh-TW" ? "移除" : "Remove"} ${formatPlanLabel(entry.label, language)}`}><Trash2 size={17} /></button>
            <GripVertical className="drag-handle" size={17} aria-hidden="true" />
          </div>)}
        </div>
        <p className="autosave"><span />{language === "zh-TW" ? "課表變更已自動儲存" : "Schedule changes save automatically"}</p>
      </section>
    </div>
  );
}

function addMonths(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1, 12);
}

function getMonthGridDates(monthDate: Date) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function hasRecordContent(record?: TrainingRecord) {
  return Boolean(
    record?.completedItemIds.length ||
    record?.removedItemIds?.length ||
    record?.customItems?.length ||
    Object.keys(record?.itemTargetOverrides ?? {}).length > 0 ||
    Object.values(record?.itemSetLogs ?? {}).some((sets) => sets.length > 0) ||
    record?.technicalNotes ||
    record?.bodyCheck ||
    record?.nextFocus ||
    record?.rpe
  );
}

function recordPreviewTags(plan: ReturnType<typeof getPlanForWeekday>, record: TrainingRecord | undefined, language: Language) {
  const customTags = (record?.customItems ?? [])
    .map((item) => drillLibrary.find((drill) => drill.id === item.drillId))
    .filter((drill): drill is Drill => Boolean(drill))
    .map((drill) => formatPlanLabel(drill.name, language));
  if (customTags.length) return customTags.slice(0, 3);
  return [formatPlanLabel(plan.session, language), formatPlanLabel(plan.focus, language)].slice(0, 3);
}

type ProgressMetric = "maxWeight" | "volume";

interface ChartPoint {
  dateKey: string;
  label: string;
  value: number;
}

function getStatsDates() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const mondayOffset = (today.getDay() + 6) % 7;
  const end = new Date(today);
  end.setDate(today.getDate() - mondayOffset + 6);
  const start = new Date(end);
  start.setDate(end.getDate() - (26 * 7 - 1));
  return Array.from({ length: 26 * 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function getDrillLogs(record: TrainingRecord, drillId: string) {
  const itemIds = [
    drillId,
    ...(record.customItems ?? []).filter((item) => item.drillId === drillId).map((item) => item.id),
  ];
  return Array.from(new Map(
    itemIds.flatMap((itemId) => (record.itemSetLogs?.[itemId] ?? []).map((set) => [set.id, set] as const))
  ).values());
}

function weightInKg(weight: number, unit: "kg" | "lb" = "kg") {
  return unit === "lb" ? weight * 0.453592 : weight;
}

function getProgressPoints(records: AppState["records"], drillId: string, metric: ProgressMetric): ChartPoint[] {
  return Object.entries(records)
    .map(([dateKey, record]) => {
      const sets = getDrillLogs(record, drillId).filter((set) => set.weight !== undefined);
      if (!sets.length) return null;
      const value = metric === "maxWeight"
        ? Math.max(...sets.map((set) => weightInKg(set.weight ?? 0, set.weightUnit)))
        : sets.reduce((total, set) => total + weightInKg(set.weight ?? 0, set.weightUnit) * (set.reps ?? 0), 0);
      const date = new Date(`${dateKey}T12:00:00`);
      return { dateKey, label: `${date.getMonth() + 1}/${date.getDate()}`, value };
    })
    .filter((point): point is ChartPoint => Boolean(point))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function getRpePoints(records: AppState["records"]): ChartPoint[] {
  return Object.entries(records)
    .filter(([, record]) => typeof record.rpe === "number")
    .map(([dateKey, record]) => {
      const date = new Date(`${dateKey}T12:00:00`);
      return { dateKey, label: `${date.getMonth() + 1}/${date.getDate()}`, value: record.rpe ?? 0 };
    })
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function LineChart({ points, color, emptyLabel, suffix = "" }: { points: ChartPoint[]; color: string; emptyLabel: string; suffix?: string }) {
  if (!points.length) return <div className="stats-empty-chart">{emptyLabel}</div>;
  const width = 720;
  const height = 220;
  const padding = { top: 20, right: 18, bottom: 34, left: 42 };
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const x = (index: number) => padding.left + (points.length === 1 ? (width - padding.left - padding.right) / 2 : index * (width - padding.left - padding.right) / (points.length - 1));
  const y = (value: number) => padding.top + (max - value) * (height - padding.top - padding.bottom) / range;
  const line = points.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const axisLabels = [min, min + range / 2, max];
  return (
    <div className="line-chart-wrap">
      <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={emptyLabel}>
        {axisLabels.map((value, index) => <g key={value}>
          <line x1={padding.left} x2={width - padding.right} y1={y(value)} y2={y(value)} className="chart-grid-line" />
          <text x={padding.left - 9} y={y(value) + 4} textAnchor="end" className="chart-axis-label">{Math.round(value)}{suffix}</text>
          {index === 0 && <text x={padding.left} y={height - 8} className="chart-date-label">{points[0].label}</text>}
          {index === 2 && <text x={width - padding.right} y={height - 8} textAnchor="end" className="chart-date-label">{points[points.length - 1].label}</text>}
        </g>)}
        <polyline points={line} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => <circle key={point.dateKey} cx={x(index)} cy={y(point.value)} r="5" fill={color} stroke="#20211f" strokeWidth="3"><title>{point.label}: {Math.round(point.value)}{suffix}</title></circle>)}
      </svg>
    </div>
  );
}

interface WeeklyLoadPoint {
  weekKey: string;
  label: string;
  hours: number;
  volumeKg: number;
  boxingRounds: number;
  boxingMinutes: number;
  averageRpe: number | null;
}

function getRecordTrainingMinutes(plan: DayPlan, record: TrainingRecord) {
  const loggedSeconds = Object.values(record.itemSetLogs ?? {}).flat().reduce((total, set) => total + (set.durationSeconds ?? 0), 0);
  if (loggedSeconds > 0) return loggedSeconds / 60;
  const minuteDelta = plan.items.reduce((total, item) => {
    const override = record.itemTargetOverrides?.[item.id];
    const fallback = parseTrainingTarget(item.detail);
    return override?.unit === "minutes" && fallback?.unit === "minutes"
      ? total + override.quantity - fallback.quantity
      : total;
  }, 0);
  return Math.max(0, plan.duration + minuteDelta);
}

function getRecordVolumeKg(record: TrainingRecord) {
  return Object.values(record.itemSetLogs ?? {}).flat().reduce((total, set) => {
    if (set.weight === undefined) return total;
    return total + weightInKg(set.weight, set.weightUnit) * (set.reps ?? 0);
  }, 0);
}

function getRecordBoxingLoad(plan: DayPlan, record: TrainingRecord) {
  const load = { rounds: 0, minutes: 0 };
  const parseDetail = (detail: string) => {
    const matches = [...detail.matchAll(/(\d+(?:\.\d+)?)\s*(回合|rounds?|分鐘|minutes?|min)/gi)];
    for (const match of matches) {
      const quantity = Number(match[1]);
      if (/回合|round/i.test(match[2])) load.rounds += quantity;
      else load.minutes += quantity;
    }
  };
  for (const item of plan.items) {
    if (!record.completedItemIds.includes(item.id)) continue;
    const override = record.itemTargetOverrides?.[item.id];
    if (override) {
      if (override.unit === "rounds") load.rounds += override.quantity;
      else load.minutes += override.quantity;
      continue;
    }
    const zhMatches = [...item.detail.zhTW.matchAll(/(\d+(?:\.\d+)?)\s*(回合|分鐘)/g)];
    parseDetail(zhMatches.length ? item.detail.zhTW : item.detail.en);
  }
  for (const item of record.customItems ?? []) {
    if (!item.completed) continue;
    if (item.unit === "rounds") load.rounds += item.quantity;
    else load.minutes += item.quantity;
  }
  load.minutes += Object.values(record.itemSetLogs ?? {}).flat().reduce((total, set) => total + (set.completed ? (set.durationSeconds ?? 0) / 60 : 0), 0);
  return load;
}

function getWeeklyLoad(records: AppState["records"], weeklyPlan: DayPlan[]): WeeklyLoadPoint[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 8 }, (_, index) => {
    const monday = new Date(currentMonday);
    monday.setDate(currentMonday.getDate() - (7 * (7 - index)));
    const days = Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + dayIndex);
      return date;
    });
    const loggedRecords = days
      .map((date) => ({ date, record: records[toDateKey(date)] }))
      .filter((entry): entry is { date: Date; record: TrainingRecord } => Boolean(entry.record && hasRecordContent(entry.record)));
    const rpes = loggedRecords.map(({ record }) => record.rpe).filter((rpe): rpe is number => typeof rpe === "number");
    const startKey = toDateKey(days[0]);
    return {
      weekKey: startKey,
      label: `${days[0].getMonth() + 1}/${days[0].getDate()}`,
      hours: loggedRecords.reduce((total, { date, record }) => total + getRecordTrainingMinutes(record.planSnapshot ?? getPlanForWeekday(getWeekday(date), weeklyPlan), record), 0) / 60,
      volumeKg: loggedRecords.reduce((total, { record }) => total + getRecordVolumeKg(record), 0),
      boxingRounds: loggedRecords.reduce((total, { date, record }) => total + getRecordBoxingLoad(record.planSnapshot ?? getPlanForWeekday(getWeekday(date), weeklyPlan), record).rounds, 0),
      boxingMinutes: loggedRecords.reduce((total, { date, record }) => total + getRecordBoxingLoad(record.planSnapshot ?? getPlanForWeekday(getWeekday(date), weeklyPlan), record).minutes, 0),
      averageRpe: rpes.length ? rpes.reduce((total, rpe) => total + rpe, 0) / rpes.length : null,
    };
  });
}


function getLoadPoint(records: AppState["records"], weeklyPlan: DayPlan[], dates: Date[], key: string, label: string): WeeklyLoadPoint {
  const loggedRecords = dates
    .map((date) => ({ date, record: records[toDateKey(date)] }))
    .filter((entry): entry is { date: Date; record: TrainingRecord } => Boolean(entry.record && hasRecordContent(entry.record)));
  const rpes = loggedRecords.map(({ record }) => record.rpe).filter((rpe): rpe is number => typeof rpe === "number");
  return {
    weekKey: key,
    label,
    hours: loggedRecords.reduce((total, { date, record }) => total + getRecordTrainingMinutes(record.planSnapshot ?? getPlanForWeekday(getWeekday(date), weeklyPlan), record), 0) / 60,
    volumeKg: loggedRecords.reduce((total, { record }) => total + getRecordVolumeKg(record), 0),
    boxingRounds: loggedRecords.reduce((total, { date, record }) => total + getRecordBoxingLoad(record.planSnapshot ?? getPlanForWeekday(getWeekday(date), weeklyPlan), record).rounds, 0),
    boxingMinutes: loggedRecords.reduce((total, { date, record }) => total + getRecordBoxingLoad(record.planSnapshot ?? getPlanForWeekday(getWeekday(date), weeklyPlan), record).minutes, 0),
    averageRpe: rpes.length ? rpes.reduce((total, rpe) => total + rpe, 0) / rpes.length : null,
  };
}

function getMonthlyLoad(records: AppState["records"], weeklyPlan: DayPlan[]) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1, 12);
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const dates = Array.from({ length: daysInMonth }, (_, dayIndex) => new Date(monthDate.getFullYear(), monthDate.getMonth(), dayIndex + 1, 12));
    return getLoadPoint(records, weeklyPlan, dates, `${monthDate.getFullYear()}-${monthDate.getMonth() + 1}`, `${monthDate.getMonth() + 1}月`);
  });
}

function getYearlyLoad(records: AppState["records"], weeklyPlan: DayPlan[]) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Array.from({ length: 5 }, (_, index) => {
    const year = today.getFullYear() - (4 - index);
    const days = new Date(year, 11, 31).getDate() === 31 ? 365 + (year % 4 === 0 ? 1 : 0) : 365;
    const dates = Array.from({ length: days }, (_, dayIndex) => {
      const date = new Date(year, 0, dayIndex + 1, 12);
      return date;
    });
    return getLoadPoint(records, weeklyPlan, dates, String(year), String(year));
  });
}

function formatDelta(value: number, suffix: string, language: Language) {
  if (Math.abs(value) < 0.05) return language === "zh-TW" ? "持平" : "Steady";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}${suffix}`;
}

function WeeklyLoadChart({ points, language }: { points: WeeklyLoadPoint[]; language: Language }) {
  const width = 720;
  const height = 245;
  const padding = { top: 22, right: 22, bottom: 38, left: 46 };
  const maxVolume = Math.max(...points.map((point) => point.volumeKg), 1);
  const maxRpe = 10;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = Math.min(48, chartWidth / points.length * .54);
  const x = (index: number) => padding.left + (index + .5) * chartWidth / points.length;
  const barHeight = (value: number) => value / maxVolume * chartHeight;
  const lineY = (value: number) => padding.top + (maxRpe - value) / maxRpe * chartHeight;
  const rpePoints = points.map((point, index) => `${x(index)},${lineY(point.averageRpe ?? 0)}`).join(" ");
  return <div className="line-chart-wrap">
    <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={language === "zh-TW" ? "每週訓練量與平均 RPE" : "Weekly training volume and average RPE"}>
      {[0, .5, 1].map((ratio) => <line key={ratio} x1={padding.left} x2={width - padding.right} y1={padding.top + chartHeight * ratio} y2={padding.top + chartHeight * ratio} className="chart-grid-line" />)}
      <text x={padding.left - 9} y={padding.top + 4} textAnchor="end" className="chart-axis-label">{Math.round(maxVolume)} kg</text>
      <text x={padding.left - 9} y={padding.top + chartHeight + 4} textAnchor="end" className="chart-axis-label">0 kg</text>
      <text x={width - padding.right + 9} y={padding.top + 4} className="chart-axis-label">10</text>
      <text x={width - padding.right + 9} y={padding.top + chartHeight + 4} className="chart-axis-label">0</text>
      {points.map((point, index) => <g key={point.weekKey}>
        <rect x={x(index) - barWidth / 2} y={padding.top + chartHeight - barHeight(point.volumeKg)} width={barWidth} height={barHeight(point.volumeKg)} rx="5" className="weekly-volume-bar" />
        <text x={x(index)} y={height - 12} textAnchor="middle" className="chart-date-label">{point.label}</text>
      </g>)}
      <polyline points={rpePoints} fill="none" stroke="var(--graph)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => point.averageRpe !== null && <circle key={`${point.weekKey}-rpe`} cx={x(index)} cy={lineY(point.averageRpe)} r="4.5" className="weekly-rpe-point"><title>{point.label}: RPE {point.averageRpe.toFixed(1)}</title></circle>)}
    </svg>
    <div className="chart-legend"><span><i className="legend-volume" />{language === "zh-TW" ? "訓練量" : "Volume"}</span><span><i className="legend-rpe" />{language === "zh-TW" ? "平均 RPE" : "Average RPE"}</span></div>
  </div>;
}

function StatsView({ language, records, weeklyPlan, customDrills, openDate }: {
  language: Language;
  records: AppState["records"];
  weeklyPlan: DayPlan[];
  customDrills: Drill[];
  openDate: (date: Date) => void;
}) {
  const availableDrills = Array.from(new Map([...drillLibrary, ...customDrills].map((drill) => [drill.id, drill])).values());
  const [selectedDrillId, setSelectedDrillId] = useState("back-squat");
  const [progressMetric, setProgressMetric] = useState<ProgressMetric>("maxWeight");
  const [loadPeriod, setLoadPeriod] = useState<"week" | "month" | "year">("week");
  const dates = getStatsDates();
  const selectedDrill = availableDrills.find((drill) => drill.id === selectedDrillId) ?? availableDrills[0];
  const progressPoints = selectedDrill ? getProgressPoints(records, selectedDrill.id, progressMetric) : [];
  const rpePoints = getRpePoints(records);
  const highRpeCount = rpePoints.slice(-3).filter((point) => point.value >= 8).length;
  const loadPoints = loadPeriod === "week" ? getWeeklyLoad(records, weeklyPlan) : loadPeriod === "month" ? getMonthlyLoad(records, weeklyPlan) : getYearlyLoad(records, weeklyPlan);
  const currentWeek = loadPoints[loadPoints.length - 1];
  const previousWeek = loadPoints[loadPoints.length - 2];
  const volumeDelta = currentWeek.volumeKg - previousWeek.volumeKg;
  const boxingLoad = currentWeek.boxingRounds > 0 ? currentWeek.boxingRounds : currentWeek.boxingMinutes;
  const previousBoxingLoad = previousWeek.boxingRounds > 0 ? previousWeek.boxingRounds : previousWeek.boxingMinutes;
  const boxingSuffix = currentWeek.boxingRounds > 0 ? "R" : "m";
  const boxingDelta = boxingLoad - previousBoxingLoad;
  const hoursDelta = currentWeek.hours - previousWeek.hours;
  const rpeDelta = (currentWeek.averageRpe ?? 0) - (previousWeek.averageRpe ?? 0);

  return (
    <div className="stats-view">
      <section className="stats-overview">
        <div><small>{language === "zh-TW" ? "本週訓練時間" : "Training time"}</small><strong>{currentWeek.hours.toFixed(1)}<em>h</em></strong><span>{formatDelta(hoursDelta, "h", language)} {language === "zh-TW" ? "對比上週" : "vs last week"}</span></div>
        {currentWeek.volumeKg > 0 ? (
          <div><small>{language === "zh-TW" ? "本週訓練量" : "Training volume"}</small><strong>{Math.round(currentWeek.volumeKg)}<em>kg</em></strong><span>{formatDelta(volumeDelta, " kg", language)} {language === "zh-TW" ? "對比上週" : "vs last week"}</span></div>
        ) : (
          <div><small>{language === "zh-TW" ? "拳擊負荷" : "Boxing load"}</small><strong>{Math.round(boxingLoad)}<em>{boxingSuffix}</em></strong><span>{formatDelta(boxingDelta, boxingSuffix, language)} {language === "zh-TW" ? "對比上週" : "vs last week"}</span></div>
        )}
        <div><small>{language === "zh-TW" ? "平均 RPE" : "Average RPE"}</small><strong>{currentWeek.averageRpe === null ? "—" : currentWeek.averageRpe.toFixed(1)}</strong><span>{formatDelta(rpeDelta, "", language)} {language === "zh-TW" ? "對比上週" : "vs last week"}</span></div>
        <div><small>{language === "zh-TW" ? "恢復提示" : "Recovery"}</small><strong>{highRpeCount >= 3 ? "!" : "✓"}</strong><span>{highRpeCount >= 3 ? (language === "zh-TW" ? "安排恢復日" : "Recovery suggested") : (language === "zh-TW" ? "狀態穩定" : "Looking steady")}</span></div>
      </section>

      <section className="stats-card consistency-card">
        <div className="stats-card-heading"><div><p className="eyebrow"><Flame size={14} /> CONSISTENCY</p><h2>{language === "zh-TW" ? "訓練一致性" : "Training consistency"}</h2></div><span>{language === "zh-TW" ? "最近 26 週" : "Last 26 weeks"}</span></div>
        <div className="heatmap-scroll"><div className="heatmap-grid" aria-label={language === "zh-TW" ? "訓練一致性熱力圖" : "Training consistency heatmap"}>
          {dates.map((date) => {
            const key = toDateKey(date);
            const record = records[key];
            const plan = record?.planSnapshot ?? getPlanForWeekday(getWeekday(date), weeklyPlan);
            const completion = record ? getRecordCompletion(plan, record) : { completed: 0, total: 0 };
            const ratio = completion.total ? completion.completed / completion.total : record && hasRecordContent(record) ? .25 : 0;
            return <button key={key} className="heat-cell" data-level={ratio === 0 ? 0 : ratio >= 1 ? 4 : ratio >= .75 ? 3 : ratio >= .5 ? 2 : 1} onClick={() => openDate(date)} title={`${key} ${Math.round(ratio * 100)}%`} aria-label={`${key} ${Math.round(ratio * 100)}%`} />;
          })}
        </div></div>
        <div className="heatmap-legend"><span>{language === "zh-TW" ? "少" : "Less"}</span>{[0, 1, 2, 3, 4].map((level) => <i key={level} className="heat-cell" data-level={level} />)}<span>{language === "zh-TW" ? "多" : "More"}</span></div>
      </section>

      <section className="stats-card weekly-load-card">
        <div className="stats-card-heading"><div><p className="eyebrow"><TrendingUp size={14} /> LOAD</p><h2>{loadPeriod === "week" ? (language === "zh-TW" ? "每週訓練負荷" : "Weekly training load") : loadPeriod === "month" ? (language === "zh-TW" ? "每月訓練負荷" : "Monthly training load") : (language === "zh-TW" ? "年度訓練負荷" : "Yearly training load")}</h2></div><div className="load-heading-tools"><span>{language === "zh-TW" ? "訓練量與平均 RPE" : "Volume and average RPE"}</span><div className="load-period-switch" aria-label={language === "zh-TW" ? "訓練負荷期間" : "Load period"}><button className={loadPeriod === "week" ? "selected" : ""} onClick={() => setLoadPeriod("week")}>{language === "zh-TW" ? "週" : "Week"}</button><button className={loadPeriod === "month" ? "selected" : ""} onClick={() => setLoadPeriod("month")}>{language === "zh-TW" ? "月" : "Month"}</button><button className={loadPeriod === "year" ? "selected" : ""} onClick={() => setLoadPeriod("year")}>{language === "zh-TW" ? "年" : "Year"}</button></div></div></div>
        <WeeklyLoadChart points={loadPoints} language={language} />
      </section>

      <section className="stats-card">
        <div className="stats-card-heading"><div><p className="eyebrow"><TrendingUp size={14} /> PROGRESS</p><h2>{language === "zh-TW" ? "動作進度" : "Drill progress"}</h2></div><select className="stats-select" value={selectedDrill?.id ?? ""} onChange={(event) => setSelectedDrillId(event.target.value)} aria-label={language === "zh-TW" ? "選擇動作" : "Choose drill"}>{availableDrills.map((drill) => <option key={drill.id} value={drill.id}>{formatPlanLabel(drill.name, language)}</option>)}</select></div>
        <div className="stats-segment"><button className={progressMetric === "maxWeight" ? "selected" : ""} onClick={() => setProgressMetric("maxWeight")}>{language === "zh-TW" ? "最重重量" : "Max weight"}</button><button className={progressMetric === "volume" ? "selected" : ""} onClick={() => setProgressMetric("volume")}>{language === "zh-TW" ? "總訓練量" : "Total volume"}</button></div>
        <LineChart points={progressPoints} color="var(--strava)" suffix={progressMetric === "maxWeight" ? " kg" : " kg"} emptyLabel={language === "zh-TW" ? "這個動作還沒有重量紀錄" : "No weight records for this drill yet"} />
      </section>

      <section className="stats-card">
        <div className="stats-card-heading"><div><p className="eyebrow"><Activity size={14} /> RPE</p><h2>{language === "zh-TW" ? "疲勞趨勢" : "Effort trend"}</h2></div><span>1—10</span></div>
        <LineChart points={rpePoints} color="var(--graph)" suffix="" emptyLabel={language === "zh-TW" ? "完成訓練並填寫 RPE 後，這裡會顯示趨勢" : "Complete a session and add RPE to see the trend"} />
        {highRpeCount >= 3 && <div className="stats-alert"><strong>{language === "zh-TW" ? "連續高強度" : "Sustained high effort"}</strong><span>{language === "zh-TW" ? "最近三次訓練 RPE 偏高，建議安排恢復日。" : "Your last three sessions were high effort. Consider a recovery day."}</span></div>}
      </section>
    </div>
  );
}

function HistoryCalendarView({
  monthDate,
  selectedDate,
  language,
  records,
  weeklyPlan,
  openDate,
  changeMonth,
  clearRecord,
  mode,
  onModeChange,
  customDrills,
}: {
  monthDate: Date;
  selectedDate: Date;
  language: Language;
  records: AppState["records"];
  weeklyPlan: DayPlan[];
  openDate: (date: Date) => void;
  changeMonth: (offset: number) => void;
  clearRecord: (dateKey: string) => void;
  mode: HistoryMode;
  onModeChange: (mode: HistoryMode) => void;
  customDrills: Drill[];
}) {
  const monthDates = getMonthGridDates(monthDate);
  const month = monthDate.getMonth();
  const monthLabel = new Intl.DateTimeFormat(language, { month: "long" }).format(monthDate);
  const yearLabel = new Intl.DateTimeFormat(language, { year: "numeric" }).format(monthDate).replace("年", "");
  const weekdayLabels = getWeekDates(new Date(2026, 6, 27, 12)).map((date) =>
    new Intl.DateTimeFormat(language, { weekday: "short" }).format(date)
  );
  const monthRecords = monthDates.filter((date) => date.getMonth() === month && hasRecordContent(records[toDateKey(date)]));
  const selectedKey = toDateKey(selectedDate);
  const selectedRecord = records[selectedKey];
  const selectedPlan = selectedRecord?.planSnapshot ?? getPlanForWeekday(getWeekday(selectedDate), weeklyPlan);
  const todayKey = toDateKey(new Date());

  return (
    <div className="page history-page">
      <section className="calendar-top">
        <button className="month-arrow" onClick={() => changeMonth(-1)} aria-label={language === "zh-TW" ? "上一個月" : "Previous month"}>
          <ChevronLeft size={28} />
        </button>
        <div>
          <span>{yearLabel}</span>
          <h1>{monthLabel}</h1>
        </div>
        <button className="month-arrow" onClick={() => changeMonth(1)} aria-label={language === "zh-TW" ? "下一個月" : "Next month"}>
          <ChevronRight size={28} />
        </button>
        <div className="history-segment" aria-label={language === "zh-TW" ? "歷史與統計" : "History and stats"}>
          <button className={mode === "history" ? "selected" : ""} onClick={() => onModeChange("history")}>{language === "zh-TW" ? "歷史" : "History"}</button>
          <button className={mode === "stats" ? "selected" : ""} onClick={() => onModeChange("stats")}>{t(language, "history.stats")}</button>
        </div>
        <div className="calendar-summary">
          <strong>{monthRecords.length}</strong>
          <small>{language === "zh-TW" ? "有紀錄日" : "logged days"}</small>
        </div>
      </section>

      {mode === "stats" ? <StatsView language={language} records={records} weeklyPlan={weeklyPlan} customDrills={customDrills} openDate={openDate} /> : <><section className="calendar-panel" aria-label={t(language, "history.title")}>
        <div className="calendar-caption">
          <div>
            <p className="eyebrow">HISTORY</p>
            <h2>{t(language, "history.title")}</h2>
          </div>
          <p>{t(language, "history.subtitle")}</p>
        </div>
        <div className="weekday-row">
          {weekdayLabels.map((label) => <span key={label}>{label}</span>)}
        </div>
        <div className="month-grid">
          {monthDates.map((date) => {
            const key = toDateKey(date);
            const savedRecord = records[key];
            const dayPlan = savedRecord?.planSnapshot ?? getPlanForWeekday(getWeekday(date), weeklyPlan);
            const completion = getRecordCompletion(dayPlan, savedRecord);
            const logged = hasRecordContent(savedRecord);
            const outside = date.getMonth() !== month;
            const metric = completion.total ? `${completion.completed}/${completion.total}` : savedRecord?.rpe ? `RPE ${savedRecord.rpe}` : "";
            const ariaDate = language === "zh-TW"
              ? `${monthLabel} ${date.getDate()}日 ${formatPlanLabel(dayPlan.session, language)}`
              : `${monthLabel} ${date.getDate()} ${formatPlanLabel(dayPlan.session, language)}`;
            return (
              <button
                className={`calendar-day ${outside ? "outside" : ""} ${key === todayKey ? "today" : ""} ${key === selectedKey ? "selected" : ""}`}
                key={key}
                onClick={() => openDate(date)}
                aria-label={ariaDate}
              >
                <span className="day-number">{date.getDate()}</span>
                {logged && (
                  <span className="day-log">
                    <strong>{metric}</strong>
                    {recordPreviewTags(dayPlan, savedRecord, language).map((tag) => <small key={tag}>{tag}</small>)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>
      {hasRecordContent(selectedRecord) && (
        <section className="history-detail" aria-label={language === "zh-TW" ? "選取日期紀錄" : "Selected day record"}>
          <div>
            <p className="eyebrow">{formatDate(selectedDate, language)}</p>
            <h2>{formatPlanLabel(selectedPlan.session, language)}</h2>
            <p>{selectedRecord?.technicalNotes || selectedRecord?.nextFocus || formatPlanLabel(selectedPlan.focus, language)}</p>
          </div>
          <div className="history-detail-actions">
            <button onClick={() => openDate(selectedDate)}>{language === "zh-TW" ? "查看紀錄" : "View record"}</button>
            <button className="delete-history-record" onClick={() => { if (window.confirm(language === "zh-TW" ? "取消這一天的訓練紀錄？" : "Cancel this training record?")) clearRecord(selectedKey); }}><Trash2 size={16} />{language === "zh-TW" ? "取消紀錄" : "Cancel record"}</button>
          </div>
        </section>
      )}
    </>}
    </div>
  );
}

function WeekView({
  anchorDate,
  language,
  records,
  weeklyPlan,
  openDate,
}: {
  anchorDate: Date;
  language: Language;
  records: AppState["records"];
  weeklyPlan: DayPlan[];
  openDate: (date: Date) => void;
}) {
  const weekDates = getWeekDates(anchorDate);
  const entries = weekDates.map((date) => ({
    date,
    record: records[toDateKey(date)],
    plan: records[toDateKey(date)]?.planSnapshot ?? getPlanForWeekday(getWeekday(date), weeklyPlan),
  }));
  const summary = getWeeklySummary(entries);

  return (
    <div className="page inner-page">
      <section className="page-intro">
        <p className="eyebrow">{formatDate(weekDates[0], language, false)} — {formatDate(weekDates[6], language, false)}</p>
        <h1>{t(language, "week.title")}</h1>
        <p>{t(language, "week.subtitle")}</p>
      </section>
      <div className="summary-grid">
        <div><strong>{summary.completedSessions}</strong><span>{t(language, "week.sessions")}</span></div>
        <div><strong>{summary.estimatedMinutes}</strong><span>{t(language, "week.minutes")}</span></div>
      </div>
      <section className="week-list">
        {entries.map(({ date, plan: dayPlan, record: dayRecord }) => {
          const completion = getRecordCompletion(dayPlan, dayRecord);
          return (
            <button key={toDateKey(date)} onClick={() => openDate(date)}>
              <span className={`day-index intensity-${dayPlan.intensity}`}>
                {new Intl.DateTimeFormat(language, { weekday: "short" }).format(date)}
                <strong>{date.getDate()}</strong>
              </span>
              <span className="week-copy">
                <strong>{formatPlanLabel(dayPlan.session, language)}</strong>
                <small>{formatPlanLabel(dayPlan.focus, language)}</small>
              </span>
              <span className="week-status">
                {completion.isComplete ? <Check size={17} /> : <ChevronRight size={18} />}
                <small>{dayPlan.duration ? `${dayPlan.duration}m` : "—"}</small>
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );
}

function LogView({
  language,
  records,
  weeklyPlan,
  openDate,
}: {
  language: Language;
  records: AppState["records"];
  weeklyPlan: DayPlan[];
  openDate: (date: Date) => void;
}) {
  const entries = Object.entries(records)
    .filter(([, record]) =>
      Boolean(
        record.completedItemIds.length ||
        record.customItems?.length ||
        Object.values(record.itemSetLogs ?? {}).some((sets) => sets.length > 0) ||
        record.technicalNotes ||
        record.bodyCheck ||
        record.nextFocus ||
        record.rpe
      )
    )
    .sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="page inner-page">
      <section className="page-intro">
        <p className="eyebrow">TRAINING ARCHIVE</p>
        <h1>{t(language, "log.title")}</h1>
        <p>{t(language, "log.subtitle")}</p>
      </section>
      {entries.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={28} strokeWidth={1.5} />
          <p>{t(language, "log.empty")}</p>
        </div>
      ) : (
        <section className="log-list">
          {entries.map(([dateKey, savedRecord]) => {
            const date = new Date(`${dateKey}T12:00:00`);
            const dayPlan = savedRecord.planSnapshot ?? getPlanForWeekday(getWeekday(date), weeklyPlan);
            return (
              <button key={dateKey} onClick={() => openDate(date)}>
                <div className="log-date">
                  <strong>{date.getDate()}</strong>
                  <span>{new Intl.DateTimeFormat(language, { month: "short" }).format(date)}</span>
                </div>
                <div className="log-copy">
                  <strong>{formatPlanLabel(dayPlan.session, language)}</strong>
                  <p>{savedRecord.technicalNotes || savedRecord.nextFocus || formatPlanLabel(dayPlan.focus, language)}</p>
                </div>
                {savedRecord.rpe && <span className="rpe-badge">RPE {savedRecord.rpe}</span>}
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}

function BackupView({
  state,
  language,
  userId,
  syncStatus,
  setLanguage,
  replaceState,
}: {
  state: AppState;
  language: Language;
  userId?: string;
  syncStatus: SyncStatus;
  setLanguage: (language: Language) => void;
  replaceState: (state: AppState) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const recordCount = useMemo(() => Object.keys(state.records).length, [state.records]);
  const backupLocation = !userId ? t(language, "backup.local") : syncStatus === "synced" ? t(language, "backup.cloudSynced") : syncStatus === "error" ? t(language, "backup.cloudError") : t(language, "backup.cloudSyncing");

  const downloadBackup = () => {
    const blob = new Blob([exportState(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `corner-boxing-backup-${toDateKey(new Date())}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file?: File) => {
    if (!file) return;
    try {
      const imported = importState(await file.text(), userId);
      replaceState(imported);
      setMessage(t(imported.language, "backup.imported"));
    } catch {
      setMessage(t(language, "backup.invalid"));
    }
  };

  const resetData = () => {
    const confirmed = window.confirm(
      language === "zh-TW"
        ? "確定要清除所有訓練紀錄嗎？此動作無法復原。"
        : "Reset all training records? This cannot be undone."
    );
    if (!confirmed) return;
    replaceState({ ...createEmptyState(), language });
  };

  return (
    <div className="page inner-page">
      <section className="page-intro">
        <p className="eyebrow">{userId ? "PRIVATE SYNC" : "LOCAL FIRST"}</p>
        <h1>{t(language, "backup.title")}</h1>
        <p>{backupLocation}</p>
      </section>

      <section className="settings-card">
        <div className="settings-heading"><Globe2 size={20} /><h2>{t(language, "backup.language")}</h2></div>
        <div className="language-toggle">
          <button className={language === "zh-TW" ? "selected" : ""} onClick={() => setLanguage("zh-TW")}>繁體中文</button>
          <button className={language === "en" ? "selected" : ""} onClick={() => setLanguage("en")}>English</button>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-heading">
          <Archive size={20} />
          <div>
            <h2>{t(language, "backup.data")}</h2>
            <small>{recordCount} {language === "zh-TW" ? "筆日期紀錄" : "saved dates"}</small>
          </div>
        </div>
        <div className="data-actions">
          <button onClick={downloadBackup}><Download size={18} />{t(language, "backup.export")}</button>
          <button onClick={() => inputRef.current?.click()}><Upload size={18} />{t(language, "backup.import")}</button>
          <input
            ref={inputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(event) => void handleImport(event.target.files?.[0])}
          />
        </div>
        {message && <p className="settings-message">{message}</p>}
      </section>

      <button className="danger-action" onClick={resetData}>
        <RotateCcw size={17} />{t(language, "backup.reset")}
      </button>
    </div>
  );
}
