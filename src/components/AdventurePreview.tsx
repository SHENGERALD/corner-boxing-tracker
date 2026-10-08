import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Check, Crown, Mountain, RotateCcw, Shield, Swords, Trophy, X } from "lucide-react";
import { adventureFloors, attackAdventure, createAdventureState, loadAdventure, saveAdventure, type AdventureState } from "../domain/adventure";
import type { Language } from "../domain/types";
import "./adventure.css";

const asset = (name: string) => `${import.meta.env.BASE_URL}adventure/${name}.svg`;
const nameOf = (floor: number, language: Language) => adventureFloors[floor - 1].name[language === "zh-TW" ? "zhTW" : "en"];

export function AdventureEntry({ language, onOpen }: { language: Language; onOpen: () => void }) {
  const state = loadAdventure();
  const zh = language === "zh-TW";
  return <button className="adventure-entry" onClick={onOpen} aria-label={zh ? "開啟冒險" : "Open adventure"}>
    <img src={asset("tower")} alt="" />
    <span className="adventure-entry-copy">
      <small>{zh ? "暗黑冒險 · 本機預覽" : "DARK ADVENTURE · LOCAL PREVIEW"}</small>
      <strong>{state.completed ? (zh ? "高塔已征服" : "Tower conquered") : nameOf(state.floor, language)}</strong>
      <span>{zh ? `第 ${state.floor} 層` : `Floor ${state.floor}`} / 10 <span aria-hidden="true"> · </span> {state.enemyHp} / {state.enemyMaxHp} HP</span>
    </span>
    <ArrowUpRight size={22} aria-hidden="true" />
  </button>;
}

interface Feedback { before: AdventureState; after: AdventureState }

export function AdventurePreview({ language, onClose }: { language: Language; onClose: () => void }) {
  const [state, setState] = useState(loadAdventure);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const zh = language === "zh-TW";
  const floor = adventureFloors[state.floor - 1];

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const host = panelRef.current?.parentElement;
    const siblings = Array.from(document.body.children).filter((node): node is HTMLElement => node instanceof HTMLElement && node !== host);
    const inertValues = siblings.map(node => node.getAttribute("inert"));
    siblings.forEach(node => node.setAttribute("inert", ""));
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onCloseRef.current(); }
      if (event.key !== "Tab") return;
      const buttons = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panelRef.current?.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panelRef.current?.contains(document.activeElement))) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = overflow;
      siblings.forEach((node, index) => {
        const value = inertValues[index];
        if (value === null) node.removeAttribute("inert"); else node.setAttribute("inert", value);
      });
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, []);

  const attack = () => {
    if (state.completed) return;
    const next = attackAdventure(state);
    setFeedback({ before: state, after: next });
    setState(next);
    setSaveFailed(!saveAdventure(next));
  };
  const reset = () => {
    const next = createAdventureState();
    setState(next);
    setFeedback(null);
    setSaveFailed(!saveAdventure(next));
  };

  const defeated = feedback && feedback.after.lastEvent !== "hit";
  const leveled = feedback && feedback.after.level > feedback.before.level;
  const damage = feedback ? Math.min(45, feedback.before.enemyHp) : 0;
  const reward = feedback && defeated ? adventureFloors[feedback.before.floor - 1].rewardXp : 0;
  const message = feedback
    ? [zh ? `造成 ${damage} 傷害。` : `${damage} damage.`,
      defeated ? (zh ? `${nameOf(feedback.before.floor, language)} 已擊敗！+${reward} XP。` : `${nameOf(feedback.before.floor, language)} defeated! +${reward} XP.`) : "",
      leveled ? (zh ? `升至等級 ${state.level}。` : `Level ${state.level} reached.`) : "",
      defeated ? (state.completed ? (zh ? "高塔已征服！" : "Tower conquered!") : (zh ? `進入第 ${state.floor} 層。` : `Floor ${state.floor} reached.`)) : ""].filter(Boolean).join(" ")
    : (zh ? "不訓練不扣血，休息不掉進度。" : "Rest freely. Your progress stays with you.");
  const enemyAsset = floor.boss ? "sovereign" : state.floor % 2 === 0 ? "revenant" : "sentinel";

  return createPortal(<div className="adventure-backdrop" data-testid="adventure-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="adventure-title" className={`adventure-panel ${floor.boss ? "is-boss" : ""} ${state.completed ? "is-conquered" : ""}`} lang={language}>
      <header className="adventure-header">
        <div><p>{zh ? "CORNER / 暗黑高塔" : "CORNER / THE DARK TOWER"}</p><h2 id="adventure-title">{zh ? "暗黑冒險預覽" : "Dark adventure preview"}</h2></div>
        <button ref={closeRef} onClick={onClose} aria-label={zh ? "關閉冒險" : "Close adventure"} title={zh ? "關閉冒險" : "Close adventure"}><X size={22} /></button>
      </header>

      <div className="adventure-hud">
        <div className="adventure-player"><Shield size={24} /><div><small>{zh ? "挑戰者" : "CHALLENGER"}</small><strong>{zh ? "等級" : "LV"} {state.level}</strong></div></div>
        <div className="adventure-xp"><div><span>{zh ? "經驗值" : "EXPERIENCE"}</span><strong>{state.experience} / {state.experienceToNext} XP</strong></div><progress aria-label={zh ? "經驗值" : "Experience"} value={state.experience} max={state.experienceToNext} /></div>
      </div>

      <div className={`adventure-scene floor-${state.floor}`}>
        <img className="adventure-tower" src={asset("tower")} alt="" />
        <div className="adventure-floor-label"><Mountain size={15} /><span>{zh ? `第 ${state.floor} 層` : `FLOOR ${String(state.floor).padStart(2, "0")}`} / 10</span>{floor.boss && <span className="adventure-boss-label"><Crown size={14} />{zh ? "首領" : "BOSS"}</span>}</div>
        {!state.completed ? <div key={`enemy-${state.floor}`} className="adventure-enemy-arrival"><img className={`adventure-enemy ${enemyAsset}`} src={asset(enemyAsset)} alt={nameOf(state.floor, language)} /></div> : <div className="adventure-victory"><Trophy size={64} /><h3>{zh ? "高塔已征服" : "Tower conquered"}</h3><p>{zh ? "十層登頂，榮耀屬於你。" : "Ten floors. The summit is yours."}</p></div>}
        {feedback && !state.completed && <div key={state.eventId} className="adventure-impact" aria-hidden="true"><span>{defeated ? `+${reward} XP` : `−${damage}`}</span><i /></div>}
        <div className="adventure-enemy-health">
          <div><h3>{state.completed ? (zh ? "永夜已破曉" : "Dawn breaks") : nameOf(state.floor, language)}</h3><span data-testid="enemy-health">{state.enemyHp} / {state.enemyMaxHp} HP</span></div>
          <progress aria-label={zh ? "敵人生命值" : "Enemy health"} max={state.enemyMaxHp} value={state.enemyHp} />
        </div>
      </div>

      <ol className="adventure-route" aria-label={zh ? "高塔進度" : "Tower progress"}>
        {adventureFloors.map(item => <li key={item.floor} aria-current={state.floor === item.floor ? "step" : undefined} className={item.floor < state.floor || state.completed ? "cleared" : ""} aria-label={zh ? `第 ${item.floor} 層${item.boss ? "，首領" : ""}` : `Floor ${item.floor}${item.boss ? ", boss" : ""}`}>
          {item.floor < state.floor || state.completed ? <Check size={15} aria-hidden="true" /> : item.boss ? <Crown size={15} aria-hidden="true" /> : item.floor}
        </li>)}
      </ol>
      <div className="adventure-feedback" role="status" aria-live="polite" aria-atomic="true"><span key={`${state.eventId}-${language}`}>{message}</span></div>
      <footer className="adventure-actions">
        <button className="adventure-attack" onClick={attack} disabled={state.completed}><Swords size={20} /><span>{zh ? "模擬完成訓練" : "Simulate completed workout"}</span><small aria-hidden="true">−45 HP</small></button>
        <div className="adventure-footer-row"><span>{zh ? "本機預覽 · 不影響訓練紀錄" : "Local preview · Training records untouched"}</span><button onClick={reset}><RotateCcw size={15} />{zh ? "重設預覽" : "Reset preview"}</button></div>
        {saveFailed && <p className="adventure-save-error" role="alert">{zh ? "無法儲存進度，關閉後可能遺失。" : "Progress could not be saved and may be lost on close."}</p>}
      </footer>
    </section>
  </div>, document.body);
}
