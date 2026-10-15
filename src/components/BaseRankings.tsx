import { useEffect, useState } from "react";
import { Coins, Eye, Medal, Shield, Trophy } from "lucide-react";
import { opponents, type BaseState } from "../domain/basePreview";
import { supabase } from "../domain/supabase";
import type { Language } from "../domain/types";
import { Leaderboard } from "./Leaderboard";
import "./adventure.css";

export function BaseRankings({ language, state, power, onScout }: {
  language: Language; state: BaseState; power: number; onScout: (index: number) => void;
}) {
  const [board, setBoard] = useState<"training" | "battle">("training");
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [userId, setUserId] = useState<string>();
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [authError, setAuthError] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const zh = language === "zh-TW";
  const t = (cn: string, en: string) => zh ? cn : en;

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    let authChanged = false;
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      authChanged = true;
      setUserId(session?.user.id);
      setAuthLoading(false);
      setAuthError(false);
    });
    void client.auth.getSession().then(({ data, error }) => {
      if (!active || authChanged) return;
      setUserId(data.session?.user.id);
      setAuthError(Boolean(error));
      setAuthLoading(false);
    }).catch(() => { if (active && !authChanged) { setAuthLoading(false); setAuthError(true); } });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!userId || !supabase) return;
    const refresh = () => setRefreshVersion(value => value + 1);
    const channel = supabase.channel(`base-rank-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_app_states", filter: `user_id=eq.${userId}` }, refresh)
      .subscribe();
    window.addEventListener("focus", refresh);
    return () => { window.removeEventListener("focus", refresh); void supabase?.removeChannel(channel); };
  }, [userId]);

  const ranked = [
    ...opponents.flatMap((item, index) => item.optIn ? [{ name: item.nickname as string, base: item.name as string, trophies: item.trophies as number, index, friend: item.friend as boolean, me: false, defense: item.defense as number }] : []),
    { name: t("你的基地", "Your base"), base: "CORNER OUTPOST", trophies: state.trophies, index: -1, friend: true, me: true, defense: 0 },
  ].sort((a, b) => b.trophies - a.trophies || a.index - b.index);
  let position = 0;
  const rows = ranked.map((row, index) => {
    if (index === 0 || row.trophies !== ranked[index - 1].trophies) position += 1;
    return { ...row, position };
  });
  const mine = rows.find(row => row.me)!;

  return <section className="base-rankings" aria-labelledby="base-rankings-title">
    <div className="base-pick-heading"><div><small>RANK / CORNER</small><h2 id="base-rankings-title">{t("排行榜", "Leaderboards")}</h2></div><Medal size={25}/></div>
    <div className="base-match-modes" aria-label={t("排行類型", "Ranking type")}>
      <button aria-pressed={board === "training"} onClick={() => setBoard("training")}><Medal size={16}/>{t("訓練週榜", "Weekly training")}</button>
      <button aria-pressed={board === "battle"} onClick={() => setBoard("battle")}><Trophy size={16}/>{t("對戰榜", "Battle ranking")}</button>
    </div>
    {board === "training" ? <>
      {authLoading ? <p role="status">{t("讀取登入狀態…", "Checking sign-in…")}</p> : authError ? <p role="alert">{t("無法讀取登入狀態，請回訓練頁重新登入。", "Sign-in could not be checked. Return to training to sign in.")}</p> : <Leaderboard key={userId ?? "guest"} language={language} userId={userId} syncVersion={refreshVersion}/>}
      {!authLoading && !userId && <a className="base-rank-signin" href={import.meta.env.BASE_URL}>{t("回訓練頁登入", "Return to training to sign in")}</a>}
    </> : <>
      <div className="base-battle-rank-note">{t("本機模擬榜 · 獎盃獨立計算，不影響訓練積分", "Local demo ranking · Trophies are separate from training points")}</div>
      <div className="base-my-rank" aria-label={t("我的對戰排名", "My battle rank")}><div><small>{t("我的名次", "YOUR RANK")}</small><strong>#{mine.position}</strong></div><span><Trophy size={18}/>{state.trophies}</span><span><Coins size={18}/>{state.credits}</span></div>
      <div className="base-rank-scope" aria-label={t("對戰榜範圍", "Battle ranking scope")}><button aria-pressed={!friendsOnly} onClick={()=>setFriendsOnly(false)}>{t("全部", "All")}</button><button aria-pressed={friendsOnly} onClick={()=>setFriendsOnly(true)}>{t("示範好友", "Demo friends")}</button></div>
      <ol className="base-battle-rank-list" aria-label={t("模擬對戰排行", "Demo battle leaderboard")}>
        {rows.filter(row => !friendsOnly || row.friend).map(row => {
          const eligible = !row.me && row.defense >= power / 2 && row.defense <= power * 2;
          return <li key={row.index} className={row.me ? "is-me" : ""} aria-current={row.me ? "true" : undefined}>
            <span className="base-rank-place">{String(row.position).padStart(2, "0")}</span><div><strong>{row.name}{row.me && <em>{t("你", "You")}</em>}</strong><small>{row.base}</small>{!row.me && <span className="base-rank-defense"><Shield size={11}/>{row.defense}</span>}</div>
            <span className="base-rank-trophies"><Trophy size={13}/>{row.trophies}</span>
            {!row.me ? <button aria-label={`${t("查看基地", "Scout")} ${row.base}`} title={eligible ? t("查看基地", "Scout base") : t("實力差距過大", "Outside your strength range")} disabled={!eligible} onClick={()=>onScout(row.index)}><Eye size={15}/><span>{t("查看", "Scout")}</span></button> : <span className="base-rank-self">{t("我的基地", "My base")}</span>}
          </li>;
        })}
      </ol>
    </>}
  </section>;
}
