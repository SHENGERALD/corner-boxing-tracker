import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Coins, Crosshair, Dumbbell, Eye, Flag, Flame, HeartPulse, Minus, Plus, RotateCcw, Search, Shield, Swords, Trophy, Users, X, Zap } from "lucide-react";
import { BASE_PREVIEW_KEY, battleBase, claimDemoTraining, createBase, findBaseOpponents, loadBase, opponents, squadPower, upgradeBase, upgradeCost, type BaseState } from "../domain/basePreview";
import type { Language } from "../domain/types";
import { BaseRankings } from "./BaseRankings";
import "./base-preview.css";

const buildings = [
  { zh: "拳擊指揮所", en: "Boxing HQ", x: 48, y: 29, kind: "hq", color: "#dc7146" },
  { zh: "重訓兵營", en: "Strength barracks", x: 25, y: 48, kind: "gym", color: "#8ba990" },
  { zh: "有氧補給站", en: "Cardio depot", x: 71, y: 48, kind: "depot", color: "#73aba8" },
  { zh: "機槍哨塔", en: "Sentry tower", x: 18, y: 77, kind: "tower", color: "#b2b898" },
  { zh: "迫擊砲陣地", en: "Mortar", x: 50, y: 77, kind: "mortar", color: "#9aab87" },
  { zh: "防禦城牆", en: "Barricade", x: 81, y: 77, kind: "wall", color: "#aaa694" },
];

function Building({ kind, color }: { kind: string; color: string }) {
  return <svg viewBox="0 0 100 100" aria-hidden="true" className="base-building-art" shapeRendering="crispEdges">
    <ellipse cx="50" cy="85" rx="43" ry="10" fill="#101b17" opacity=".45" />
    {kind === "tower" ? <g stroke="#26382d" strokeWidth="3"><path d="M29 81L35 33H66L72 81H60L57 49H43L40 81Z" fill="#737d62" /><path d="M23 28L50 16L78 28V46L50 58L23 46Z" fill={color} /><path d="M50 35V58L78 46V28Z" fill="#60745d" /><path d="M50 29L85 18L89 24L54 37Z" fill="#303e35" /><path d="M23 28L50 40L78 28" fill="none" /></g>
    : kind === "mortar" ? <g stroke="#293b30" strokeWidth="3"><path d="M10 72L48 53L90 72L50 93Z" fill="#6b795f" /><path d="M32 70L45 52L61 65L67 80L48 86Z" fill={color} /><path d="M42 60L61 25L75 33L56 71Z" fill="#566c56" /><path d="M61 25L72 20L83 27L75 33Z" fill="#c0c6a8" /><path d="M67 25L73 23L77 27L72 29Z" fill="#1a2c22" /></g>
    : kind === "wall" ? <g stroke="#374436" strokeWidth="3"><path d="M10 52L29 42L91 67V83L72 94L10 69Z" fill={color} /><path d="M10 52L72 78L91 67M72 78V94M30 61V77M50 70V85" fill="none" /><path d="M13 48V35L25 40V53M40 59V46L52 51V64M69 71V58L81 63V76" fill="#7c856d" /></g>
    : <g stroke="#2d3b30" strokeWidth="2"><path d="M12 48L49 28L89 48V79L50 97L12 78Z" fill={color} /><path d="M50 66V97L89 79V48Z" fill="#596e59" /><path d="M7 45L49 19L95 44L51 68Z" fill="#c4bea0" /><path d="M13 43L49 23L89 44L51 61Z" fill={color} /><path d="M51 61L89 44L95 44L51 68Z" fill="#4f624f" /><path d="M24 60V76L36 81V65Z" fill="#213c32" /><path d="M62 71L78 64V78L62 85Z" fill="#253e32" />
      {kind === "hq" ? <><path d="M48 21V3" stroke="#ebd8af" /><path d="M49 3L72 8L49 14Z" fill="#ef814b" /><path d="M41 39H59M50 31V48" stroke="#fff1cf" strokeWidth="5" /></> : kind === "gym" ? <path d="M33 36L62 48M31 31L27 42M37 34L33 45M63 42L59 54M69 45L65 57" stroke="#e5ebcd" strokeWidth="4" /> : <path d="M54 28L40 41H51L44 54L64 38H53Z" fill="#f5df8c" stroke="none" />}
    </g>}
  </svg>;
}

export function BaseMap({ levels, selected, onSelect, enemy = false, battling = false }: { levels: readonly number[]; selected: number; onSelect?: (index: number) => void; enemy?: boolean; battling?: boolean }) {
  return <div className={`base-map ${enemy ? "is-enemy" : ""} ${battling ? "is-fighting" : ""}`} aria-label={enemy ? "Opponent base" : "Training base"}>
    <svg className="base-terrain" viewBox="0 0 600 470" aria-hidden="true" shapeRendering="crispEdges">
      <path d="M0 0H600V470H0Z" fill="#273f32" />
      <path d="M0 67L164 0H415L600 93V380L402 470H160L0 374Z" fill="#476749" />
      <path d="M0 328L600 50V115L0 394ZM0 148L600 418V470L0 212Z" fill="#9c9976" opacity=".65" />
      <path d="M51 239L302 114L548 239L300 367Z" fill="#53754b" stroke="#7e9263" strokeWidth="3" />
      {[0, 1, 2, 3, 4].map(i => <g key={i} stroke="#73925c" opacity=".35"><path d={`M${90 + i * 48} ${219 - i * 24}l248 124`} /><path d={`M${92 + i * 48} ${260 + i * 24}l248 -124`} /></g>)}
      {[ [28, 70], [544, 90], [13, 402], [548, 398], [501, 25], [71, 17] ].map(([x,y], i) => <g key={i} transform={`translate(${x} ${y})`}><path d="M14 0V37" stroke="#293a28" strokeWidth="8" /><path d="M14 -21L-5 9H5L-10 25H38L24 9H33Z" fill="#193d2c" /><path d="M14 -21V25H38L24 9H33Z" fill="#285137" /></g>)}
    </svg>
    {buildings.map((b,i) => onSelect ? <button key={b.kind} className={`base-building ${selected === i ? "is-selected" : ""}`} style={{left:`${b.x}%`,top:`${b.y}%`}} onClick={() => onSelect(i)} aria-label={`${b.zh} Lv.${levels[i]}`} aria-pressed={selected === i}><Building kind={b.kind} color={b.color} /><span>LV.{levels[i]}</span></button> : <div key={b.kind} className="base-building" style={{left:`${b.x}%`,top:`${b.y}%`}}><Building kind={b.kind} color={b.color} /><span>LV.{levels[i]}</span></div>)}
    {battling && <div className="base-battle-effects" aria-hidden="true"><i /><i /><i /><b>✦</b><b>✦</b><b>✦</b></div>}
    <span className="base-map-label">{enemy ? "ENEMY TERRITORY" : "CORNER OUTPOST · 01"}</span>
  </div>;
}

function OpponentPicker({ language, power, onPick }: { language: Language; power: number; onPick: (index: number) => void }) {
  const [scope, setScope] = useState<"recommended" | "friends">("recommended");
  const [query, setQuery] = useState("");
  const [batch, setBatch] = useState(0);
  const zh = language === "zh-TW";
  const t = (cn: string, en: string) => zh ? cn : en;
  const candidates = findBaseOpponents(power, scope === "friends", query);
  const pageCount = Math.max(1, Math.ceil(candidates.length / 3));
  const page = batch % pageCount;
  const visible = candidates.slice(page * 3, page * 3 + 3);
  return <section className="base-opponent-picker" aria-labelledby="base-pick-title">
    <div className="base-pick-heading"><div><small>{t("模擬配對", "DEMO MATCHMAKING")}</small><h2 id="base-pick-title">{t("選擇突襲目標", "Choose your target")}</h2></div><span><Crosshair size={16}/>{power}</span></div>
    <div className="base-match-modes" aria-label={t("對手來源", "Opponent source")}>
      <button aria-pressed={scope === "recommended"} onClick={()=>{setScope("recommended");setBatch(0);}}><Crosshair size={16}/>{t("推薦對手", "Recommended")}</button>
      <button aria-pressed={scope === "friends"} onClick={()=>{setScope("friends");setBatch(0);}}><Users size={16}/>{t("好友挑戰", "Friends")}</button>
    </div>
    <div className="base-opponent-search"><Search size={18}/><input aria-label={t("搜尋暱稱或基地", "Search nickname or base")} placeholder={t("搜尋暱稱或基地", "Search nickname or base")} value={query} onChange={event=>{setQuery(event.target.value);setBatch(0);}}/>{query && <button aria-label={t("清除搜尋", "Clear search")} title={t("清除搜尋", "Clear search")} onClick={()=>{setQuery("");setBatch(0);}}><X size={16}/></button>}</div>
    <div className="base-match-summary"><span>{scope === "friends" ? t("示範好友 · 已開啟對戰", "Demo friends · Battles enabled") : t("依防禦與你的戰力接近程度排序", "Sorted by defense closest to your power")}</span><small>{candidates.length} {t("座基地", "bases")}</small></div>
    {visible.length ? <ul className="base-opponent-list">{visible.map(item=><li key={item.name}>
      <div className="base-opponent-identity"><div className="base-opponent-avatar"><Building kind="hq" color={item.defense > 130 ? "#b18c7e" : "#8ba990"}/></div><div><h3>{item.nickname}</h3><small>{item.name}</small><span className="base-demo-label">{t("模擬對手", "Demo opponent")}</span></div></div>
      <div className="base-opponent-stats"><span><Shield size={14}/>{item.defense}<small>{t("防禦", "DEF")}</small></span><span><Trophy size={14}/>{item.trophies}<small>{t("獎盃", "TROPHIES")}</small></span><span><Coins size={14}/>{item.reward}<small>{t("勝利補給", "SUPPLY")}</small></span></div>
      <button className="base-scout" aria-label={`${t("查看基地", "Scout")} ${item.name}`} onClick={()=>onPick(item.index)}><Eye size={17}/>{t("查看基地", "Scout base")}</button>
    </li>)}</ul> : <div className="base-no-opponents" role="status"><Search size={26}/><h3>{t("找不到符合的基地", "No matching bases")}</h3><p>{t("試試其他暱稱，或清除搜尋。", "Try another nickname or clear your search.")}</p></div>}
    <div className="base-match-footer"><span>{page + 1} / {pageCount}</span><button disabled={pageCount < 2} onClick={()=>setBatch(value=>value+1)}><RotateCcw size={16}/>{t("換一批", "Next opponents")}</button></div>
  </section>;
}

export function BasePreview({ language = "zh-TW" }: { language?: Language }) {
  const [state, setState] = useState(loadBase);
  const [mode, setMode] = useState<"base" | "raid" | "ranking">("base");
  const [selected, setSelected] = useState(0);
  const [opponent, setOpponent] = useState<number | null>(null);
  const [squad, setSquad] = useState([2, 1, 0]);
  const [phase, setPhase] = useState<"ready" | "fighting" | "result">("ready");
  const [result, setResult] = useState<ReturnType<typeof battleBase>>(null);
  const [storageError, setStorageError] = useState(false);
  const lock = useRef(false);
  const zh = language === "zh-TW";
  const t = (cn: string, en: string) => zh ? cn : en;
  const today = new Date().toISOString().slice(0,10);
  const selectedBuilding = buildings[selected];
  const power = squadPower(squad, state.levels);
  const total = squad.reduce((a,b)=>a+b,0);
  const target = opponent === null ? null : opponents[opponent];
  const write = (next: BaseState) => { setState(next); try { localStorage.setItem(BASE_PREVIEW_KEY, JSON.stringify(next)); setStorageError(false); } catch { setStorageError(true); } };
  useEffect(() => {
    if (phase !== "fighting") return;
    const timer = window.setTimeout(() => { setPhase("result"); lock.current = false; }, 2400);
    return () => window.clearTimeout(timer);
  }, [phase]);
  const attack = () => {
    if (lock.current || opponent === null) return;
    const next = battleBase(state, squad, opponent);
    if (!next) return;
    lock.current = true; setResult(next); write(next.state); setPhase("fighting");
  };

  return <div className="base-preview">
    <header className="base-top"><a href={import.meta.env.BASE_URL} aria-label={t("回到訓練", "Back to training")}><ArrowLeft size={20}/></a><div><small>CORNER / OUTPOST</small><h1>{t("訓練基地", "Training outpost")}</h1></div><span className="base-preview-badge">{t("本機原型", "LOCAL DEMO")}</span></header>
    <main className="base-shell">
      <div className="base-wallet" aria-label={t("基地資源", "Base resources")}><span><Coins/><strong>{state.credits}</strong><small>{t("補給", "SUPPLY")}</small></span><span><Zap/><strong>{state.energy} / 6</strong><small>{t("出征能量", "ENERGY")}</small></span><span><Trophy/><strong>{state.trophies}</strong><small>{t("模擬獎盃", "DEMO TROPHIES")}</small></span></div>
      <nav className="base-modes" aria-label={t("基地模式", "Base mode")}><button aria-pressed={mode === "base"} disabled={phase === "fighting"} onClick={()=>setMode("base")}><Flag size={17}/>{t("我的基地", "My base")}</button><button aria-pressed={mode === "raid"} disabled={phase === "fighting"} onClick={()=>setMode("raid")}><Swords size={17}/>{t("出征", "Raid")}</button><button aria-pressed={mode === "ranking"} disabled={phase === "fighting"} onClick={()=>setMode("ranking")}><Trophy size={17}/>{t("排行榜", "Rankings")}</button></nav>
      {mode === "base" ? <>
        <div className="base-map-heading"><span><i/>{t("基地運作中", "OUTPOST ONLINE")}</span><small>{t("防禦等級", "DEFENSE LV")} {state.levels.slice(3).reduce((a,b)=>a+b,0)}</small></div>
        <BaseMap levels={state.levels} selected={selected} onSelect={setSelected}/>
        <section className="base-building-detail"><div><small>{selected < 3 ? t("訓練設施", "TRAINING FACILITY") : t("防禦設施", "DEFENSE")}</small><h2>{t(selectedBuilding.zh, selectedBuilding.en)} <span>LV.{state.levels[selected]}</span></h2><p>{selected < 3 ? t("每次升級增加 8 點出征戰力。", "Each upgrade adds 8 raid power.") : t("升級提高基地防禦等級。", "Upgrades increase your base defense level.")}</p></div><button disabled={state.levels[selected]>=5 || state.credits<upgradeCost(state.levels[selected])} onClick={()=>write(upgradeBase(state, selected))}><ArrowUp size={18}/>{state.levels[selected]>=5 ? t("已滿級", "Max level") : <><Coins size={15}/>{upgradeCost(state.levels[selected])}</>}</button></section>
        <section className="base-training"><div><Dumbbell size={22}/><div><h2>{t("今日訓練補給", "Daily training supply")}</h2><p>{t("模擬獎勵 · 每日一次（UTC）", "Demo reward · once daily (UTC)")}</p></div></div><button disabled={state.claimedOn===today} onClick={()=>write(claimDemoTraining(state,today))}>{state.claimedOn===today ? t("已領取", "Claimed") : t("模擬領取 +150", "Demo claim +150")}</button></section>
      </> : mode === "ranking" ? <BaseRankings language={language} state={state} power={power} onScout={index=>{setOpponent(index);setPhase("ready");setResult(null);setMode("raid");}}/> : !target ? <OpponentPicker language={language} power={power} onPick={index=>{setOpponent(index);setPhase("ready");setResult(null);}}/> : <>
        <div className="base-scout-bar"><button disabled={phase !== "ready"} onClick={()=>setOpponent(null)}><ArrowLeft size={16}/>{t("對手名單", "Opponents")}</button><span>{t("偵察基地 · 不消耗能量", "Scouting · No energy cost")}</span></div>
        <div className="base-target-heading"><div><small>{t("模擬對手", "SIMULATED OPPONENT")} · {target.nickname}</small><h2>{target.name}</h2></div><span><Shield size={16}/>{target.defense}</span></div>
        <BaseMap levels={target.levels} selected={-1} enemy battling={phase === "fighting"}/>
        <section className="base-squad"><div className="base-section-heading"><h2>{t("出征小隊", "Raid squad")}</h2><span>{total} / 6</span></div>{[ [t("突擊手", "Rifleman"),Crosshair,24], [t("重裝兵", "Heavy"),Shield,32], [t("支援兵", "Support"),HeartPulse,40] ].map(([name, Icon, strength],i)=>{ const UnitIcon = Icon as typeof Shield; return <div className="base-unit" key={i}><UnitIcon size={22}/><div><strong>{String(name)}</strong><small>{t("戰力", "POWER")} {String(strength)}</small></div><button aria-label={`${t("減少", "Remove")} ${name}`} disabled={phase!=="ready" || squad[i]===0} onClick={()=>setSquad(squad.map((n,j)=>i===j?n-1:n))}><Minus size={17}/></button><output>{squad[i]}</output><button aria-label={`${t("增加", "Add")} ${name}`} disabled={phase!=="ready" || total>=6 || squad[i]>=4} onClick={()=>setSquad(squad.map((n,j)=>i===j?n+1:n))}><Plus size={17}/></button></div>;})}</section>
        <div className="base-battle-summary"><span>{t("總戰力", "Squad power")} <strong>{power}</strong></span><span>{t("敵方防禦", "Defense")} <strong>{target.defense}</strong></span></div>
        {phase==="result" && result ? <section className="base-result" role="status"><Flame/><h2>{result.won?t("攻佔成功", "Victory"):t("撤退整備", "Regroup")}</h2><p>{t("補給", "Supply")} +{result.won?target.reward:20} · {t("獎盃", "Trophies")} +{result.won?15:0}</p><button onClick={()=>{setPhase("ready");setResult(null);setOpponent(null);}}>{t("繼續出征", "Continue")}</button></section> : <button className="base-attack-button" onClick={attack} disabled={phase==="fighting" || state.energy===0 || total===0}><Swords size={19}/>{phase==="fighting"?t("交戰中…", "In combat…"):state.energy===0?t("能量不足", "No energy"):t("開始突襲", "Launch raid")}<small>−1 <Zap size={13}/></small></button>}
      </>}
      {storageError && <p role="alert">{t("無法儲存本機進度，關閉後可能遺失。", "Progress could not be saved on this device.")}</p>}
      <footer className="base-footer"><span>{t("休息不扣資源 · 模擬對戰不列入排行榜", "Rest keeps your resources · Demo raids do not affect rankings")}</span><button onClick={()=>{write(createBase());setPhase("ready");lock.current=false;setResult(null);setOpponent(null);}} disabled={phase==="fighting"}><RotateCcw size={14}/>{t("重設原型", "Reset demo")}</button></footer>
    </main>
  </div>;
}
