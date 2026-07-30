import {
  Archive,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Download,
  Dumbbell,
  Globe2,
  Home,
  RotateCcw,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getWeekDates, getWeekday, toDateKey } from "./domain/dates";
import { formatPlanLabel, t } from "./domain/i18n";
import { getPlanForWeekday } from "./domain/plan";
import { getRecordCompletion, getWeeklySummary } from "./domain/progress";
import {
  createEmptyState,
  exportState,
  importState,
  loadState,
  saveState,
  type AppState,
} from "./domain/storage";
import type { Language, TrainingRecord } from "./domain/types";

type View = "today" | "week" | "log" | "backup";

interface AppProps {
  initialDate?: Date;
}

const navItems = [
  { id: "today", icon: Home, label: "nav.today" },
  { id: "week", icon: CalendarDays, label: "nav.week" },
  { id: "log", icon: ClipboardList, label: "nav.log" },
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
  const [state, setState] = useState<AppState>(() => loadState());
  const language = state.language;

  useEffect(() => saveState(state), [state]);

  const selectedKey = toDateKey(selectedDate);
  const plan = getPlanForWeekday(getWeekday(selectedDate));
  const record = state.records[selectedKey] ?? initialRecord();

  const updateRecord = (patch: Partial<TrainingRecord>) => {
    setState((current) => ({
      ...current,
      records: {
        ...current.records,
        [selectedKey]: {
          ...(current.records[selectedKey] ?? initialRecord()),
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
    setView("today");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView("today")} aria-label="Corner home">
          <span className="brand-mark">C</span>
          <span>
            <strong>CORNER</strong>
            <small>{t(language, "app.kicker")}</small>
          </span>
        </button>
        <div className="week-streak" aria-label="training principle">
          <span className="pulse-dot" />
          {language === "zh-TW" ? "技術品質優先" : "Quality over volume"}
        </div>
      </header>

      <main>
        {view === "today" && (
          <TodayView
            date={selectedDate}
            language={language}
            plan={plan}
            record={record}
            updateRecord={updateRecord}
          />
        )}
        {view === "week" && (
          <WeekView
            anchorDate={selectedDate}
            language={language}
            records={state.records}
            openDate={openDate}
          />
        )}
        {view === "log" && (
          <LogView language={language} records={state.records} openDate={openDate} />
        )}
        {view === "backup" && (
          <BackupView
            state={state}
            language={language}
            setLanguage={setLanguage}
            replaceState={setState}
          />
        )}
      </main>

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

interface TodayViewProps {
  date: Date;
  language: Language;
  plan: ReturnType<typeof getPlanForWeekday>;
  record: TrainingRecord;
  updateRecord: (patch: Partial<TrainingRecord>) => void;
}

function TodayView({ date, language, plan, record, updateRecord }: TodayViewProps) {
  const completion = getRecordCompletion(plan, record);
  const percentage = completion.total
    ? Math.round((completion.completed / completion.total) * 100)
    : 0;

  const toggleItem = (id: string) => {
    const isDone = record.completedItemIds.includes(id);
    updateRecord({
      completedItemIds: isDone
        ? record.completedItemIds.filter((candidate) => candidate !== id)
        : [...record.completedItemIds, id],
    });
  };

  return (
    <div className="page today-page">
      <section className="today-hero">
        <div>
          <p className="eyebrow">{formatDate(date, language)}</p>
          <h1>{formatPlanLabel(plan.session, language)}</h1>
          <div className="session-meta">
            <span className={`intensity intensity-${plan.intensity}`}>
              {plan.intensity === "rest"
                ? t(language, "common.rest")
                : plan.time ?? `${plan.duration} ${t(language, "common.minutes")}`}
            </span>
            {plan.intensity !== "rest" && plan.time && (
              <span>{plan.duration} {t(language, "common.minutes")}</span>
            )}
          </div>
        </div>
        {plan.items.length > 0 && (
          <div
            className="progress-ring"
            style={{ "--progress": `${percentage * 3.6}deg` } as React.CSSProperties}
            aria-label={`${percentage}% ${t(language, "today.complete")}`}
          >
            <strong>{percentage}%</strong>
            <small>{t(language, "today.complete")}</small>
          </div>
        )}
      </section>

      <section className="focus-strip">
        <Dumbbell size={18} />
        <div>
          <small>{t(language, "today.focus")}</small>
          <strong>{formatPlanLabel(plan.focus, language)}</strong>
        </div>
      </section>

      {plan.items.length === 0 ? (
        <section className="rest-card">
          <span className="rest-orbit" />
          <h2>{formatPlanLabel(plan.session, language)}</h2>
          <p>{t(language, "today.rest")}</p>
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
              {plan.items.map((planItem, index) => {
                const checked = record.completedItemIds.includes(planItem.id);
                const title = formatPlanLabel(planItem.label, language);
                return (
                  <label className={`training-item ${checked ? "checked" : ""}`} key={planItem.id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItem(planItem.id)}
                      aria-label={`${title} — ${formatPlanLabel(planItem.detail, language)}`}
                    />
                    <span className="custom-check">{checked && <Check size={17} />}</span>
                    <span className="item-order">{String(index + 1).padStart(2, "0")}</span>
                    <span className="item-copy">
                      <strong>{title}</strong>
                      <small>{formatPlanLabel(planItem.detail, language)}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="journal-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">SESSION NOTES</p>
                <h2>{language === "zh-TW" ? "一好，一修正。" : "One win. One correction."}</h2>
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
  setLanguage,
  replaceState,
}: {
  state: AppState;
  language: Language;
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
      const imported = importState(await file.text());
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
