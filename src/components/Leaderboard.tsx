import { useEffect, useRef, useState } from "react";
import { RefreshCw, Trophy } from "lucide-react";
import type { Language } from "../domain/types";
import { getLeaderboardPeriod, getUtcWeekStart, normalizeLeaderboardName } from "../domain/leaderboard";
import { fetchLeaderboard, saveLeaderboardProfile, type LeaderboardProfile, type LeaderboardRow } from "../domain/leaderboardApi";

export function Leaderboard({ language, userId, syncStatus, syncVersion = 0 }: { language: Language; userId?: string; syncStatus?: "local" | "syncing" | "synced" | "error"; syncVersion?: number }) {
  const zh = language === "zh-TW";
  const [profile, setProfile] = useState<LeaderboardProfile | null>(null);
  const [name, setName] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const draftDirty = useRef(false);
  const [currentWeek, setCurrentWeek] = useState(getUtcWeekStart);

  useEffect(() => {
    const tick = () => setCurrentWeek(getUtcWeekStart());
    const interval = window.setInterval(tick, 60000);
    window.addEventListener("focus", tick);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", tick); };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void fetchLeaderboard(userId).then(result => {
      if (!active) return;
      setProfile(result.profile);
      if (!draftDirty.current) {
        setName(result.profile?.display_name ?? "");
        setOptIn(result.profile?.opt_in ?? false);
      }
      setRows(result.rows);
      setLoading(false);
      setError(false);
    }).catch(() => {
      if (!active) return;
      setLoading(false);
      setError(true);
    });
    return () => { active = false; };
  }, [userId, refreshKey, syncVersion, currentWeek]);

  const normalized = normalizeLeaderboardName(name);
  const changed = profile
    ? normalized !== profile.display_name || optIn !== profile.opt_in
    : Boolean(normalized && optIn);
  const canSave = Boolean(userId && normalized && changed && !saving && !loading && !error);
  const weekStart = rows[0]?.week_start ?? currentWeek;
  const period = getLeaderboardPeriod(weekStart);
  const localReset = new Intl.DateTimeFormat(zh ? "zh-TW" : "en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  }).format(period.reset);

  const save = async () => {
    if (!userId || !normalized || !canSave) return;
    setSaving(true);
    setSaveError(false);
    try {
      await saveLeaderboardProfile(userId, normalized, optIn);
      draftDirty.current = false;
      setProfile({ display_name: normalized, opt_in: optIn });
      setName(normalized);
      setLoading(true);
      setRefreshKey(value => value + 1);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return <section className="adventure-leaderboard" aria-labelledby="adventure-leaderboard-title">
    <div className="adventure-leaderboard-heading">
      <div><small>{zh ? "RANK / 每週" : "RANK / WEEKLY"}</small><h3 id="adventure-leaderboard-title"><Trophy size={18} aria-hidden="true" />{zh ? "訓練排行榜" : "Training leaderboard"}</h3></div>
      {userId && <button type="button" onClick={() => { setLoading(true); setRefreshKey(value => value + 1); }} aria-label={zh ? "重新整理排行榜" : "Refresh leaderboard"} title={zh ? "重新整理排行榜" : "Refresh leaderboard"} disabled={loading || saving || changed}><RefreshCw size={17} /></button>}
    </div>
    {!userId ? <p className="adventure-leaderboard-empty">{zh ? "登入後可查看排行榜" : "Sign in to view the leaderboard"}</p> : <>
      {error ? <p className="adventure-leaderboard-error" role="alert">{zh ? "排行榜暫時無法使用，請稍後重試。" : "Leaderboard unavailable. Please try again later."}</p> : <>
        <div className="adventure-leaderboard-period">{zh ? "本週" : "This week"} · {weekStart} – {period.end} (UTC)</div>
        <div className="adventure-leaderboard-period">{zh ? "下次重置" : "Next reset"} · {period.reset.toISOString().slice(0, 10)} 00:00 UTC<br />{zh ? "你的時區" : "Your timezone"} · {localReset}</div>
        {syncStatus === "error" && <p className="adventure-rank-sync-warning" role="status">{zh ? "訓練紀錄同步失敗，積分可能尚未更新。" : "Training sync failed. Points may be out of date."}</p>}
        {loading ? <p className="adventure-leaderboard-empty">{zh ? "載入中…" : "Loading…"}</p> : rows.length === 0 ? <p className="adventure-leaderboard-empty">{zh ? "本週還沒有人上榜" : "No rankings this week"}</p> : <ol className="adventure-leaderboard-list">
          {rows.map((row, index) => <li key={`${row.position}-${row.display_name}-${index}`} className={row.is_me ? "is-me" : ""}>
            <span className="adventure-rank-number">{String(row.position).padStart(2, "0")}</span>
            <strong>{row.display_name}{row.is_me && <em>{zh ? "你" : "You"}</em>}</strong>
            <span className="adventure-rank-days">{row.training_days}{zh ? " 天" : " d"}</span>
            <span className="adventure-rank-points">{row.points}<small> PT</small></span>
          </li>)}
        </ol>}
        <details className="adventure-rank-rules"><summary>{zh ? "積分規則" : "Points rules"}</summary><p>{zh ? "每個有完成動作的訓練日 20 分，每個完成動作再加 5 分；每天最多計 5 個動作。週一 00:00 UTC 重新排名，休息不扣分。" : "20 points per day with completed activity, plus 5 per completed item (up to 5 items a day). Rankings reset Monday 00:00 UTC. Rest never reduces points."}</p></details>
        <div className="adventure-leaderboard-settings">
          <label htmlFor="adventure-rank-name">{zh ? "公開暱稱" : "Public nickname"}</label>
          <input id="adventure-rank-name" value={name} minLength={2} maxLength={20} disabled={loading || saving} onChange={event => { draftDirty.current = true; setName(event.target.value); }} autoComplete="nickname" />
          <label className="adventure-rank-consent"><input type="checkbox" checked={optIn} disabled={loading || saving} onChange={event => { draftDirty.current = true; setOptIn(event.target.checked); }} /><span>{zh ? "參加本週排行榜" : "Join the weekly leaderboard"}</span></label>
          <button type="button" className="adventure-rank-save" onClick={save} disabled={!canSave}>{saving ? (zh ? "儲存中…" : "Saving…") : (zh ? "儲存排行榜設定" : "Save leaderboard settings")}</button>
        </div>
        {saveError && <p className="adventure-leaderboard-error" role="alert">{zh ? "設定儲存失敗，請重試。" : "Settings could not be saved. Please retry."}</p>}
      </>}
    </>}
  </section>;
}
