import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Coins, Flag, Minus, Plus, RefreshCw, Search, Shield, Swords, Trophy, UserPlus, Zap } from "lucide-react";
import { supabase } from "../domain/supabase";
import { BaseApiError, baseErrorText, fetchBaseDashboard, fetchBaseOpponents, sendBaseCommand, type BaseAction, type BaseBattle, type BaseDashboard, type BaseOpponent, type BaseRequest } from "../domain/baseApi";
import { squadPower, upgradeCost } from "../domain/basePreview";
import type { Language } from "../domain/types";
import { BaseMap } from "./BasePreview";
import { Leaderboard } from "./Leaderboard";
import "./adventure.css";
import "./base-preview.css";

export function BaseGame({ language = "zh-TW" }: { language?: Language }) {
  const [auth, setAuth] = useState<{ ready: boolean; userId?: string; error?: boolean }>({ready: !supabase});
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let changed = false;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) { changed = true; setAuth({ready: true, userId: session?.user.id}); }
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (active && !changed) setAuth({ready:true,userId:data.session?.user.id,error:Boolean(error)});
    }).catch(() => { if (active && !changed) setAuth({ready:true,error:true}); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  if (auth.userId) return <BaseGameContent key={auth.userId} userId={auth.userId} language={language}/>;
  const zh = language === "zh-TW";
  return <main className="base-preview"><div className="base-shell base-game-gate"><h1>{zh ? "訓練基地" : "Training base"}</h1><p role="status">{!auth.ready ? (zh ? "讀取登入狀態…" : "Checking sign-in…") : auth.error ? (zh ? "無法確認登入狀態，請重新登入。" : "Sign-in could not be checked. Please sign in again.") : (zh ? "登入後即可建立自己的基地。" : "Sign in to create your base.")}</p><a href={import.meta.env.BASE_URL}>{zh ? "回訓練頁登入" : "Return to training to sign in"}</a><a href={`${import.meta.env.BASE_URL}?preview=base`}>{zh ? "先體驗本機原型" : "Try the local demo"}</a></div></main>;
}

function readPending(key: string): BaseRequest | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (saved && typeof saved.id === "string" && typeof saved.action === "string" && saved.args && typeof saved.args === "object") return saved;
  } catch { /* A malformed retry cannot be used as a command. */ }
  return null;
}

export function BaseGameContent({ userId, language }: { userId: string; language: Language }) {
  const zh = language === "zh-TW";
  const t = (cn: string, en: string) => zh ? cn : en;
  const [dashboard, setDashboard] = useState<BaseDashboard | null>(null);
  const [mode, setMode] = useState<"base" | "raid" | "ranking">("base");
  const [board, setBoard] = useState<"training" | "battle">("training");
  const [selected, setSelected] = useState(0);
  const [rows, setRows] = useState<BaseOpponent[]>([]);
  const [target, setTarget] = useState<BaseOpponent | null>(null);
  const [squad, setSquad] = useState([2,1,0]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [friends, setFriends] = useState(false);
  const [name, setName] = useState("");
  const [optIn, setOptIn] = useState(false);
  const profileDirty = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [rankRefresh, setRankRefresh] = useState(0);
  const [battle, setBattle] = useState<BaseBattle | null>(null);
  const [animating, setAnimating] = useState(false);
  const key = `corner-base-pending-${userId}`;
  const [pending, setPending] = useState<BaseRequest | null>(() => readPending(key));
  const locked = useRef(false);
  const active = useRef(true);
  const generation = useRef(0);
  const buildings = zh ? ["拳擊指揮所","重訓兵營","有氧補給站","機槍哨塔","迫擊砲陣地","防禦城牆"] : ["Boxing HQ","Strength barracks","Cardio depot","Sentry tower","Mortar","Barricade"];
  const apply = (next: BaseDashboard) => {
    setDashboard(next);
    if (!profileDirty.current) { setName(next.player.display_name); setOptIn(next.player.opt_in); }
  };

  useEffect(() => {
    active.current = true;
    const refresh = async () => {
      if (locked.current) return;
      const ticket = ++generation.current;
      try {
        const data = await fetchBaseDashboard();
        if (!active.current || ticket !== generation.current) return;
        apply(data); setError(null); setLoading(false); setRankRefresh(value=>value+1);
      } catch (error) {
        if (active.current && ticket === generation.current) { setError(baseErrorText(error,zh)); setLoading(false); }
      }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    const visibility = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange",visibility);
    const channel = supabase?.channel(`base-game-${userId}`).on("postgres_changes",{event:"*",schema:"public",table:"user_app_states",filter:`user_id=eq.${userId}`},()=>{void refresh();}).subscribe();
    return () => {
      active.current = false; generation.current += 1;
      window.removeEventListener("focus",refresh); document.removeEventListener("visibilitychange",visibility);
      if (channel) void supabase?.removeChannel(channel);
    };
  }, [userId, version, zh]);

  useEffect(() => {
    if (!dashboard || mode === "base" || (mode === "ranking" && board === "training")) return;
    let current = true;
    setListLoading(true); setListError(false);
    const timer = window.setTimeout(() => {
      void fetchBaseOpponents(query,page*20,friends,mode==="raid" ? squadPower(squad,dashboard.player.levels) : undefined).then(result => {
        if (current) { setRows(result); setListLoading(false); }
      }).catch(() => { if (current) { setRows([]); setListLoading(false); setListError(true); } });
    },250);
    return () => { current=false; window.clearTimeout(timer); };
  },[mode,board,query,page,friends,rankRefresh,Boolean(dashboard),squad]);

  useEffect(() => {
    if (!animating) return;
    const timer = window.setTimeout(()=>setAnimating(false),2400);
    return () => window.clearTimeout(timer);
  },[animating]);

  const perform = async (action: BaseAction, args: Record<string, unknown> = {}, retry?: BaseRequest) => {
    if (locked.current || (pending && !retry)) return;
    locked.current=true; generation.current+=1; setBusy(true); setError(null);
    const request = retry ?? {action,args,id:crypto.randomUUID()};
    try {
      sessionStorage.setItem(key,JSON.stringify(request));
      setPending(request);
      const result = await sendBaseCommand(request);
      if (!active.current) return;
      sessionStorage.removeItem(key); setPending(null);
      if (action === "profile") profileDirty.current=false;
      apply(result.dashboard);
      if (action === "friend_request" || action === "friend_remove") setTarget(current=>current && current.user_id===args.target ? {...current,requested:action==="friend_request",is_friend:false} : current);
      if (result.battle) { setBattle(result.battle); setAnimating(true); }
      setVersion(value=>value+1);
    } catch (error) {
      if (!active.current) return;
      if (error instanceof BaseApiError && !error.uncertain) {
        sessionStorage.removeItem(key); setPending(null);
      }
      setError(baseErrorText(error,zh));
    } finally { locked.current=false; if (active.current) setBusy(false); }
  };
  const blocked = busy || Boolean(pending) || animating;
  const player = dashboard?.player;
  const power = player ? squadPower(squad,player.levels) : 0;
  const total = squad.reduce((a,b)=>a+b,0);
  const scout = (row: BaseOpponent) => {setTarget(row);setBattle(null);setMode("raid");};

  return <div className="base-preview">
    <header className="base-top"><a href={import.meta.env.BASE_URL} aria-label={t("回到訓練","Back to training")}><ArrowLeft size={20}/></a><div><small>CORNER / OUTPOST</small><h1>{t("訓練基地","Training base")}</h1></div><button aria-label={t("重新整理基地","Refresh base")} disabled={blocked || loading} onClick={()=>setVersion(v=>v+1)}><RefreshCw size={18}/></button></header>
    <main className="base-shell">
      {loading && <p className="base-game-message" role="status">{t("載入基地…","Loading base…")}</p>}
      {error && <div className="base-game-message" role="alert"><p>{error}</p>{!pending && <button onClick={()=>{setLoading(!dashboard);setVersion(v=>v+1);}}>{t("重試","Retry")}</button>}</div>}
      {pending && !busy && <div className="base-game-message"><p>{t("上一筆操作尚待確認，請重試以查明結果。","The previous operation needs confirmation. Retry to retrieve its result.")}</p><button onClick={()=>void perform(pending.action,pending.args,pending)}>{t("確認上一筆操作","Confirm previous operation")}</button></div>}
      {player && dashboard && <>
        <div className="base-wallet"><span><Coins/><strong>{player.credits}</strong><small>{t("補給","SUPPLY")}</small></span><span><Zap/><strong>{player.energy} / 6</strong><small>{t("出征能量","ENERGY")}</small></span><span><Trophy/><strong>{player.trophies}</strong><small>{t("對戰獎盃","TROPHIES")}</small></span></div>
        <nav className="base-modes" aria-label={t("基地模式","Base mode")}>{(["base","raid","ranking"] as const).map((value,i)=><button key={value} disabled={blocked} aria-pressed={mode===value} onClick={()=>{setMode(value);setPage(0);setQuery("");}}>{i===0?<Flag size={17}/>:i===1?<Swords size={17}/>:<Trophy size={17}/>}<span>{[t("我的基地","My base"),t("出征","Raid"),t("排行榜","Rankings")][i]}</span></button>)}</nav>
        {mode === "base" ? <>
          <BaseMap levels={player.levels} selected={selected} onSelect={blocked?undefined:setSelected}/>
          <section className="base-building-detail"><div><h2>{buildings[selected]} · LV.{player.levels[selected]}</h2><p>{selected<3?t("升級增加 8 點小隊戰力。","Upgrade adds 8 squad power."):t("升級增加 15 點基地防禦。","Upgrade adds 15 base defense.")}</p></div><button aria-label={`${t("升級","Upgrade")} ${buildings[selected]}`} disabled={blocked || player.levels[selected]>=5 || player.credits<upgradeCost(player.levels[selected])} onClick={()=>void perform("upgrade",{building:selected})}><ArrowUp size={16}/>{player.levels[selected]>=5?t("滿級","Max"):upgradeCost(player.levels[selected])}</button></section>
          <section className="base-training"><div><div><h2>{t("今日訓練補給","Daily training supply")}</h2><p>{dashboard.today} UTC · +150 <Coins size={12}/> / +2 <Zap size={12}/></p><p>{dashboard.claimed_today?t("今天已領取。","Claimed today."):t("完成並同步至少一個動作後領取。","Complete and sync at least one training item.")}</p></div></div><button disabled={blocked || !dashboard.can_claim} onClick={()=>void perform("claim")}>{dashboard.claimed_today?t("已領取","Claimed"):t("領取補給","Claim supply")}</button></section>
          <form className="base-game-settings" onSubmit={event=>{event.preventDefault();void perform("profile",{name,opt_in:optIn});}}><h2>{t("基地對戰設定","Base battle settings")}</h2><label>{t("公開暱稱","Public nickname")}<input value={name} minLength={2} maxLength={20} required disabled={blocked} onChange={event=>{profileDirty.current=true;setName(event.target.value);}}/></label><label className="base-game-consent"><input type="checkbox" checked={optIn} disabled={blocked} onChange={event=>{profileDirty.current=true;setOptIn(event.target.checked);}}/>{t("開啟基地對戰，讓其他玩家查看並挑戰我的基地","Enable battles so others can view and challenge my base")}</label><button disabled={blocked || !name.trim() || (name.trim()===player.display_name && optIn===player.opt_in)}>{t("儲存設定","Save settings")}</button></form>
          {dashboard.requests.length>0 && <section className="base-game-settings"><h2>{t("好友邀請","Friend invitations")}</h2>{dashboard.requests.map(request=><div className="base-game-invitation" key={request.user_id}><strong>{request.name}</strong><button disabled={blocked} onClick={()=>void perform("friend_accept",{target:request.user_id})}>{t("接受","Accept")}</button><button disabled={blocked} onClick={()=>void perform("friend_remove",{target:request.user_id})}>{t("婉拒","Decline")}</button></div>)}</section>}
          <section className="base-game-settings"><h2>{t("攻防紀錄","Battle history")}</h2>{dashboard.battles.length===0?<p>{t("尚無對戰紀錄。","No battles yet.")}</p>:dashboard.battles.map(item=><div className="base-game-history" key={item.id}><strong>{item.attacking?t("進攻","Attack"):t("防守","Defense")} · {item.attacking?item.result.defender_name:item.result.attacker_name}</strong><span>{item.attacking?(item.result.won?t("勝利","Won"):t("撤退","Retreated")):(item.result.won?t("基地遭突破","Base breached"):t("防守成功","Defended"))}</span><small>{new Date(item.created_at).toLocaleString(language)}</small></div>)}</section>
        </> : mode==="ranking" && board==="training" ? <section className="base-rankings"><div className="base-match-modes"><button aria-pressed="true">{t("訓練週榜","Weekly training")}</button><button onClick={()=>setBoard("battle")}>{t("對戰榜","Battle ranking")}</button></div><Leaderboard key={userId} userId={userId} language={language} syncVersion={rankRefresh}/></section>
        : mode==="raid" && target ? <>
          <div className="base-scout-bar"><button disabled={blocked} onClick={()=>{setTarget(null);setBattle(null);}}><ArrowLeft size={16}/>{t("對手名單","Opponents")}</button><strong>{target.display_name}</strong></div>
          <BaseMap levels={target.levels} selected={-1} enemy battling={animating}/>
          <section className="base-squad"><div className="base-section-heading"><h2>{t("配置小隊","Squad")}</h2><span>{total}/6 · {t("戰力","POWER")} {power}</span></div>{[t("突擊手","Rifleman"),t("重裝兵","Heavy"),t("支援兵","Support")].map((label,i)=><div className="base-unit" key={label}><Shield size={20}/><strong>{label}</strong><button aria-label={`${t("減少","Remove")} ${label}`} disabled={blocked || squad[i]===0} onClick={()=>setSquad(values=>values.map((v,j)=>i===j?v-1:v))}><Minus size={16}/></button><output>{squad[i]}</output><button aria-label={`${t("增加","Add")} ${label}`} disabled={blocked || total>=6 || squad[i]>=4} onClick={()=>setSquad(values=>values.map((v,j)=>i===j?v+1:v))}><Plus size={16}/></button></div>)}
            <p>{t("敵方防禦","Defense")} {target.defense} · {t("勝利補給","Win supply")} {target.reward}</p>
            {!battle && <div className="base-friend-action"><button disabled={blocked || target.requested || !player.opt_in} onClick={()=>void perform(target.is_friend?"friend_remove":"friend_request",{target:target.user_id})}><UserPlus size={16}/>{target.is_friend?t("移除好友","Remove friend"):target.requested?t("邀請已送出","Invitation sent"):t("邀請好友","Add friend")}</button></div>}
          </section>
          {battle ? <section className="base-result" role="status"><h2>{animating?t("交戰中…","In combat…"):battle.won?t("攻佔成功","Victory"):t("撤退整備","Regroup")}</h2>{!animating && <><p>+{battle.supply} {t("補給","supply")} · +{battle.trophies} {t("獎盃","trophies")}</p><button onClick={()=>{setTarget(null);setBattle(null);}}>{t("繼續出征","Continue")}</button></>}</section>:<><p className="base-game-message">{!player.opt_in?t("請先在我的基地開啟對戰。","Enable battles in My base first."):target.raided_today?t("今天已挑戰此基地。","Already raided today."):t("每個對手每日限一次；偵察不消耗能量。","One raid per opponent each day. Scouting is free.")}</p><button className="base-attack-button" disabled={blocked || !player.opt_in || target.raided_today || player.energy<1 || total===0 || power>target.defense*2 || target.defense>power*2} onClick={()=>void perform("raid",{target:target.user_id,squad})}><Swords size={18}/>{t("開始突襲","Launch raid")} · −1 <Zap size={14}/></button></>}
        </> : <section className="base-opponent-picker">
          {mode==="ranking" && <div className="base-match-modes"><button onClick={()=>setBoard("training")}>{t("訓練週榜","Weekly training")}</button><button aria-pressed="true">{t("對戰榜","Battle ranking")}</button></div>}
          <div className="base-pick-heading"><h2>{mode==="ranking"?t("對戰排行榜","Battle rankings"):t("選擇突襲目標","Choose a target")}</h2></div>
          {mode==="ranking" && <div className="base-my-rank"><div><small>{t("我的名次","Your rank")}</small><strong>{dashboard.battle_position ? `#${dashboard.battle_position}` : t("未參加","Not participating")}</strong></div><span><Trophy size={18}/>{player.trophies}</span></div>}
          {mode==="raid" && <p className="base-match-summary">{t("依防禦與小隊戰力接近程度排序。","Sorted by defense closest to your squad power.")}</p>}
          <div className="base-match-modes"><button aria-pressed={!friends} onClick={()=>{setFriends(false);setPage(0);}}>{t("全部","All")}</button><button aria-pressed={friends} onClick={()=>{setFriends(true);setPage(0);}}>{t("好友","Friends")}</button></div>
          <div className="base-opponent-search"><Search size={18}/><input aria-label={t("搜尋玩家暱稱","Search player nickname")} placeholder={t("搜尋玩家暱稱","Search player nickname")} value={query} onChange={event=>{setQuery(event.target.value);setPage(0);}}/></div>
          {listLoading?<p role="status">{t("載入玩家…","Loading players…")}</p>:listError?<div role="alert"><p>{t("無法載入對手。","Could not load opponents.")}</p><button onClick={()=>setVersion(v=>v+1)}>{t("重試","Retry")}</button></div>:rows.length===0?<p>{t("目前沒有符合的玩家。","No matching players yet.")}</p>:<ol className="base-battle-rank-list">{rows.map(row=><li key={row.user_id} className={row.is_me?"is-me":""}><span>#{row.position}</span><div><strong>{row.display_name}{row.is_me?` · ${t("你","You")}`:""}</strong><small>{t("防禦","Defense")} {row.defense}</small></div><span className="base-rank-trophies"><Trophy size={13}/>{row.trophies}</span>{row.is_me?<span/>:<button disabled={blocked} onClick={()=>scout(row)}>{t("查看基地","Scout")}</button>}</li>)}</ol>}
          <div className="base-match-footer"><button disabled={page===0 || listLoading} onClick={()=>setPage(v=>v-1)}>{t("上一頁","Previous")}</button><span>{page+1}</span><button disabled={rows.length<20 || listLoading} onClick={()=>setPage(v=>v+1)}>{t("下一批","Next")}</button></div>
        </section>}
      </>}
    </main>
  </div>;
}
