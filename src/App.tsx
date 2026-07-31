import {
  Archive,
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

import { useEffect, useMemo, useRef, useState } from "react";
import { resolveInitialState } from "./domain/cloud";
import { getWeekDates, getWeekday, toDateKey } from "./domain/dates";
import { formatPlanLabel, t } from "./domain/i18n";
import { cloneWeeklyPlan, createBlankWeeklyPlan, getPlanForWeekday } from "./domain/plan";
import { getRecordCompletion, getWeeklySummary, isTrainingItemComplete } from "./domain/progress";
import {
  createEmptyState,
  decodeState,
  exportState,
  getStateSavedAt,
  hasStoredState,
  importState,
  loadState,
  saveState,
  type AppState,
} from "./domain/storage";
import { getAuthRedirectUrl, isSupabaseConfigured, supabase } from "./domain/supabase";
import type { CustomTrainingItem, DayPlan, Language, PlanItem, TrainingRecord, TrainingSet, TrainingType, Weekday } from "./domain/types";
import { drillLibrary, filterDrills, type Drill, type DrillCategory, type TrainingDomain } from "./domain/drills";

type View = "today" | "schedule" | "history" | "library" | "backup";
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

export default function App({ initialDate = new Date() }: AppProps) {
  const [view, setView] = useState<View>("today");
  const [selectedDate, setSelectedDate] = useState(() => new Date(initialDate));
  const [displayMonth, setDisplayMonth] = useState(() => new Date(initialDate));
  const [state, setState] = useState<AppState>(() => loadState());
  const [drillToAdd, setDrillToAdd] = useState<Drill | null>(null);
  const [creatingLibraryDrill, setCreatingLibraryDrill] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const stateRef = useRef(state);
  const language = state.language;
  const userId = session?.user.id;

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => {
    if (!userId || cloudReady) saveState(state, userId);
  }, [cloudReady, state, userId]);

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
        setState(loadState());
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
        .select("state, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (!active) return;
      if (error) {
        if (hasStoredState(userId)) setState(loadState(userId));
        setSyncStatus("error");
        return;
      }
      const cloudState = data ? decodeState(data.state) : null;
      const accountState = hasStoredState(userId) ? loadState(userId) : null;
      const resolution = resolveInitialState({
        guestState: stateRef.current,
        accountState,
        accountSavedAt: getStateSavedAt(userId),
        cloudState,
        cloudUpdatedAt: data?.updated_at ?? null,
      });
      if (resolution.shouldUpload) {
        const updatedAt = new Date().toISOString();
        const { error: uploadError } = await supabase
          .from("user_app_states")
          .upsert({ user_id: userId, state: resolution.state, updated_at: updatedAt }, { onConflict: "user_id" });
        if (!active) return;
        if (uploadError) {
          setState(resolution.state);
          setSyncStatus("error");
          return;
        }
        saveState(resolution.state, userId, updatedAt);
      } else {
        saveState(resolution.state, userId, data?.updated_at ?? undefined);
      }
      setState(resolution.state);
      setCloudReady(true);
      setSyncStatus("synced");
    })();
    return () => { active = false; };
  }, [authReady, userId]);

  useEffect(() => {
    const client = supabase;
    if (!cloudReady || !userId || !client) return;
    setSyncStatus("syncing");
    const timer = window.setTimeout(() => {
      const updatedAt = new Date().toISOString();
      void client
        .from("user_app_states")
        .upsert({ user_id: userId, state, updated_at: updatedAt }, { onConflict: "user_id" })
        .then(({ error }) => {
          if (error) {
            setSyncStatus("error");
            return;
          }
          saveState(state, userId, updatedAt);
          setSyncStatus("synced");
        });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [cloudReady, state, userId]);

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
  }));

  const addLibraryDrill = (drill: Drill) => setState((current) => ({
    ...current,
    customDrills: [...(current.customDrills ?? []), drill],
  }));

  const clearRecord = (dateKey = selectedKey) => {
    setState((current) => {
      const { [dateKey]: _removed, ...remainingRecords } = current.records;
      return { ...current, records: remainingRecords };
    });
  };
  const reorderTodayItems = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const selectedWeekday = getWeekday(selectedDate);
    setState((current) => ({
      ...current,
      weeklyPlan: current.weeklyPlan.map((day) => {
        if (day.day !== selectedWeekday) return day;
        const items = [...day.items];
        const fromIndex = items.findIndex((item) => item.id === fromId);
        const toIndex = items.findIndex((item) => item.id === toId);
        if (fromIndex < 0 || toIndex < 0) return day;
        const [moved] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, moved);
        return { ...day, items };
      }),
      weeklyPlanUpdatedAt: new Date().toISOString(),
    }));
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
            setLanguage={setLanguage}
            replaceState={setState}
          />
        )}
      </main>
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
            setState(loadState());
            setCloudReady(false);
            setSyncStatus("local");
            setAuthOpen(false);
          }}
        />
      )}

      <nav className="bottom-nav" aria-label="Primary">
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
          {message && <div className={`auth-message ${message.includes("寄出") || message.includes("inbox") ? "success" : "error"}`}>{message}</div>}
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

  const removePlannedItem = (id: string) => {
    updateRecord({
      removedItemIds: Array.from(new Set([...(record.removedItemIds ?? []), id])),
      completedItemIds: record.completedItemIds.filter((candidate) => candidate !== id),
      itemSetLogs: Object.fromEntries(Object.entries(itemSetLogs).filter(([itemId]) => itemId !== id)),
    });
  };

  const removeCustomItem = (id: string) => {
    updateRecord({
      customItems: (record.customItems ?? []).filter((candidate) => candidate.id !== id),
      itemSetLogs: Object.fromEntries(Object.entries(itemSetLogs).filter(([itemId]) => itemId !== id)),
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
              {visiblePlanItems.map((planItem, index) => {
                const checked = isTrainingItemComplete(record, planItem.id);
                const title = formatPlanLabel(planItem.label, language);
                const detail = formatPlanLabel(planItem.detail, language);
                return (
                  <details className={`training-entry ${checked ? "checked" : ""}`} key={planItem.id}>
                    <summary className={`training-item removable-training-item draggable-item ${draggedItemId === planItem.id ? "dragging" : ""}`} draggable onDragStart={(event) => handleDragStart(event, planItem.id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, planItem.id)} onDragEnd={() => setDraggedItemId(null)}>
                      <label className="completion-toggle" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleItem(planItem.id)}
                          aria-label={`${title} — ${detail}`}
                        />
                        <span className="custom-check">{checked && <Check size={17} />}</span>
                      </label>
                      <span className="item-order">{String(index + 1).padStart(2, "0")}</span>
                      <span className="item-copy">
                        <strong>{title}</strong>
                        <small>{detail}</small>
                      </span>
                      <span className="set-count">{itemSetLogs[planItem.id]?.length ?? 0} {language === "zh-TW" ? "組" : "sets"}</span>
                      <GripVertical className="drag-handle" size={17} aria-hidden="true" />
                      <button className="remove-training-item" onClick={(event) => { event.preventDefault(); event.stopPropagation(); removePlannedItem(planItem.id); }} aria-label={`${language === "zh-TW" ? "移除" : "Remove"} ${title}`} title={language === "zh-TW" ? "移除動作" : "Remove drill"}><Minus size={17} /></button>
                    </summary>
                    <TrainingSetLogger
                      itemId={planItem.id}
                      itemTitle={title}
                      language={language}
                      sets={itemSetLogs[planItem.id] ?? []}
                      onAddSet={addSet}
                      onUpdateSet={updateSet}
                      onRemoveSet={removeSet}
                    />
                  </details>
                );
              })}
              {(record.customItems ?? []).map((item, index) => {
                const drill = drillLibrary.find((candidate) => candidate.id === item.drillId);
                if (!drill) return null;
                const title = formatPlanLabel(drill.name, language);
                const unit = item.unit === "rounds" ? (language === "zh-TW" ? "回合" : "rounds") : (language === "zh-TW" ? "分鐘" : "min");
                const checked = item.completed || isTrainingItemComplete(record, item.id);
                return <details className={`training-entry custom-training-entry ${checked ? "checked" : ""}`} key={item.id}>
                  <summary className="training-item custom-training-item">
                    <label className="completion-toggle" onClick={(event) => event.stopPropagation()}>
                      <input type="checkbox" checked={checked} onChange={() => { updateRecord({ customItems: (record.customItems ?? []).map((candidate) => candidate.id === item.id ? { ...candidate, completed: !checked } : candidate), itemSetLogs: checked ? { ...itemSetLogs, [item.id]: (itemSetLogs[item.id] ?? []).map((set) => ({ ...set, completed: false })) } : itemSetLogs }); }} aria-label={`${title} — ${item.quantity} ${unit}`} />
                      <span className="custom-check">{checked && <Check size={17} />}</span>
                    </label><span className="item-order">{String(visiblePlanItems.length + index + 1).padStart(2, "0")}</span><span className="item-copy"><strong>{title}</strong><small>{item.quantity} {unit}</small></span>
                    <span className="set-count">{itemSetLogs[item.id]?.length ?? 0} {language === "zh-TW" ? "組" : "sets"}</span>
                    <button className="remove-training-item" onClick={(event) => { event.preventDefault(); event.stopPropagation(); removeCustomItem(item.id); }} aria-label={`${language === "zh-TW" ? "移除" : "Remove"} ${title}`} title={language === "zh-TW" ? "移除動作" : "Remove drill"}><Minus size={17} /></button>
                  </summary>
                  <TrainingSetLogger
                    itemId={item.id}
                    itemTitle={title}
                    language={language}
                    sets={itemSetLogs[item.id] ?? []}
                    onAddSet={addSet}
                    onUpdateSet={updateSet}
                    onRemoveSet={removeSet}
                  />
                </details>;
              })}
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
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={set.weight ?? ""}
                    onChange={(event) => onUpdateSet(itemId, set.id, { weight: event.target.value === "" ? undefined : Number(event.target.value) })}
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
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={set.reps ?? ""}
                  onChange={(event) => onUpdateSet(itemId, set.id, { reps: event.target.value === "" ? undefined : Number(event.target.value) })}
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
  const drills = filterDrills([...customDrills, ...drillLibrary], { query, domain, category, favoriteIds: favorites, favoritesOnly: onlyFavorites });
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
        ["core", language === "zh-TW" ? "核心" : "Core"],
      ];
  const changeDomain = (nextDomain: TrainingDomain) => { setDomain(nextDomain); setCategory("all"); };

  return (
    <div className="page library-page">
      <div className="library-type-switch" aria-label={language === "zh-TW" ? "訓練類型" : "Training type"}>
        <button className={domain === "boxing" ? "selected" : ""} onClick={() => changeDomain("boxing")}>{language === "zh-TW" ? "拳擊" : "Boxing"}</button>
        <button className={domain === "strength" ? "selected" : ""} onClick={() => changeDomain("strength")}>{language === "zh-TW" ? "重訓" : "Strength"}</button>
      </div>
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
            <button className={category === id ? "selected" : ""} onClick={() => setCategory(id)} key={id}>
              {label}
            </button>
          ))}
          <button className={onlyFavorites ? "selected favorite-filter" : "favorite-filter"} onClick={() => setOnlyFavorites(!onlyFavorites)}>
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
              <button className={category === id ? "selected" : ""} onClick={() => setCategory(id)} key={id}>{label}</button>
            ))}
          </div>
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
                  <div className="drill-visual" aria-hidden="true">
                    <span>{title.slice(0, 1)}</span>
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
    : [["chest", language === "zh-TW" ? "胸" : "Chest"], ["back", language === "zh-TW" ? "背" : "Back"], ["legs", language === "zh-TW" ? "腿" : "Legs"], ["shoulders", language === "zh-TW" ? "肩" : "Shoulders"], ["core", language === "zh-TW" ? "核心" : "Core"]];
  const changeDomain = (nextDomain: TrainingDomain) => { setDomain(nextDomain); setCategory(nextDomain === "boxing" ? "fundamentals" : "chest"); };
  const save = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onConfirm({
      id: `custom-${Date.now()}`,
      domain,
      category,
      name: { zhTW: trimmedName, en: englishName.trim() || trimmedName },
      cue: { zhTW: cue.trim() || (language === "zh-TW" ? "自訂訓練動作" : "Custom training drill"), en: cue.trim() || "Custom training drill" },
      defaultUnit: unit,
      defaultQuantity: Math.max(1, quantity),
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
    <div className="custom-drill-defaults"><label>{language === "zh-TW" ? "預設數量" : "Default quantity"}<input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} /></label><label>{language === "zh-TW" ? "單位" : "Unit"}<select value={unit} onChange={(event) => setUnit(event.target.value as "rounds" | "minutes")}><option value="rounds">{language === "zh-TW" ? "回合" : "Rounds"}</option><option value="minutes">{language === "zh-TW" ? "分鐘" : "Minutes"}</option></select></label></div>
    <div className="dialog-actions"><button onClick={onClose}>{language === "zh-TW" ? "取消" : "Cancel"}</button><button onClick={save} disabled={!name.trim()}>{language === "zh-TW" ? "儲存動作" : "Save drill"}</button></div>
  </section></div>;
}

function AddDrillPanel({ drill, language, onClose, onConfirm }: { drill: Drill; language: Language; onClose: () => void; onConfirm: (item: CustomTrainingItem) => void }) {
  const [quantity, setQuantity] = useState(drill.defaultQuantity); const [unit, setUnit] = useState(drill.defaultUnit);
  const name = formatPlanLabel(drill.name, language); const unitLabel = unit === "rounds" ? (language === "zh-TW" ? "回合數" : "Rounds") : (language === "zh-TW" ? "分鐘數" : "Minutes");
  return <div className="dialog-backdrop" role="presentation"><section className="add-dialog" role="dialog" aria-modal="true" aria-label={`${language === "zh-TW" ? "加入訓練：" : "Add training: "}${name}`}><p className="eyebrow">SCHEDULE DRILL</p><h2>{language === "zh-TW" ? `加入訓練：${name}` : `Add training: ${name}`}</h2><label>{unitLabel}<input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} /></label><div className="unit-toggle"><button className={unit === "rounds" ? "selected" : ""} onClick={() => setUnit("rounds")}>{language === "zh-TW" ? "回合" : "Rounds"}</button><button className={unit === "minutes" ? "selected" : ""} onClick={() => setUnit("minutes")}>{language === "zh-TW" ? "分鐘" : "Minutes"}</button></div><div className="dialog-actions"><button onClick={onClose}>{language === "zh-TW" ? "取消" : "Cancel"}</button><button onClick={() => onConfirm({ id: `${drill.id}-${Date.now()}`, drillId: drill.id, quantity, unit, completed: false })}>{language === "zh-TW" ? "加入訓練" : "Add training"}</button></div></section></div>;
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
          <label><span>課程名稱</span><input value={day.session.zhTW} onChange={(event) => updateLabel("session", "zhTW", event.target.value)} /></label>
          <label><span>Session name</span><input value={day.session.en} onChange={(event) => updateLabel("session", "en", event.target.value)} /></label>
          <label><span>{language === "zh-TW" ? "開始時間" : "Start time"}</span><input type="time" disabled={day.trainingType === "rest"} value={day.startTime ?? ""} onChange={(event) => update({ startTime: event.target.value, time: undefined })} /></label>
          <label><span>{language === "zh-TW" ? "分鐘" : "Minutes"}</span><input type="number" min="0" step="5" disabled={day.trainingType === "rest"} value={day.duration} onChange={(event) => update({ duration: Math.max(0, Number(event.target.value)) })} /></label>
          <label className="wide"><span>訓練重點</span><input value={day.focus.zhTW} onChange={(event) => updateLabel("focus", "zhTW", event.target.value)} /></label>
          <label className="wide"><span>Training focus</span><input value={day.focus.en} onChange={(event) => updateLabel("focus", "en", event.target.value)} /></label>
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

function HistoryCalendarView({
  monthDate,
  selectedDate,
  language,
  records,
  weeklyPlan,
  openDate,
  changeMonth,
  clearRecord,
}: {
  monthDate: Date;
  selectedDate: Date;
  language: Language;
  records: AppState["records"];
  weeklyPlan: DayPlan[];
  openDate: (date: Date) => void;
  changeMonth: (offset: number) => void;
  clearRecord: (dateKey: string) => void;
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
          <button className="selected">{language === "zh-TW" ? "歷史" : "History"}</button>
          <button>{t(language, "history.stats")}</button>
        </div>
        <div className="calendar-summary">
          <strong>{monthRecords.length}</strong>
          <small>{language === "zh-TW" ? "有紀錄日" : "logged days"}</small>
        </div>
      </section>

      <section className="calendar-panel" aria-label={t(language, "history.title")}>
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
    </div>
  );
}

function WeekView({
  anchorDate,
  language,
  records,
  openDate,
}: {
  anchorDate: Date;
  language: Language;
  records: AppState["records"];
  openDate: (date: Date) => void;
}) {
  const weekDates = getWeekDates(anchorDate);
  const entries = weekDates.map((date) => ({
    date,
    plan: getPlanForWeekday(getWeekday(date)),
    record: records[toDateKey(date)],
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
  openDate,
}: {
  language: Language;
  records: AppState["records"];
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
            const dayPlan = getPlanForWeekday(getWeekday(date));
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
  setLanguage,
  replaceState,
}: {
  state: AppState;
  language: Language;
  userId?: string;
  setLanguage: (language: Language) => void;
  replaceState: (state: AppState) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const recordCount = useMemo(() => Object.keys(state.records).length, [state.records]);

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
        <p className="eyebrow">LOCAL FIRST</p>
        <h1>{t(language, "backup.title")}</h1>
        <p>{t(language, "backup.local")}</p>
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
