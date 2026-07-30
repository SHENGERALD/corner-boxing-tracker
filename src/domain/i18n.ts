import type { Language, LocalizedLabel } from "./types";

const translations = {
  "nav.today": { zhTW: "今天", en: "Today" },
  "nav.week": { zhTW: "本週", en: "Week" },
  "nav.log": { zhTW: "紀錄", en: "Log" },
  "nav.backup": { zhTW: "備份", en: "Backup" },
  "app.kicker": { zhTW: "私人拳擊日誌", en: "Private boxing journal" },
  "today.focus": { zhTW: "今日重點", en: "Today’s focus" },
  "today.progress": { zhTW: "訓練進度", en: "Session progress" },
  "today.rest": { zhTW: "今天的任務是完整恢復。", en: "Today’s assignment is full recovery." },
  "today.complete": { zhTW: "已完成", en: "complete" },
  "today.autosave": { zhTW: "所有變更會自動儲存", en: "All changes save automatically" },
  "field.rpe": { zhTW: "自覺強度 RPE", en: "Effort RPE" },
  "field.technical": { zhTW: "技術筆記", en: "Technical notes" },
  "field.technicalPlaceholder": { zhTW: "今天哪個動作最順？哪裡需要修正？", en: "What felt sharp? What needs correction?" },
  "field.body": { zhTW: "身體狀態", en: "Body check" },
  "field.bodyPlaceholder": { zhTW: "肩、腕、膝、疲勞程度…", en: "Shoulders, wrists, knees, fatigue…" },
  "field.next": { zhTW: "下次重點", en: "Next focus" },
  "field.nextPlaceholder": { zhTW: "只留一個最重要的提醒", en: "Keep one essential cue" },
  "week.title": { zhTW: "這一週，穩定累積。", en: "Build the week, steadily." },
  "week.subtitle": { zhTW: "保護教練課，也保護恢復日。", en: "Protect coaching days and recovery days." },
  "week.sessions": { zhTW: "完成課次", en: "sessions done" },
  "week.minutes": { zhTW: "預估分鐘", en: "estimated minutes" },
  "week.open": { zhTW: "查看訓練", en: "Open session" },
  "log.title": { zhTW: "訓練紀錄", en: "Training log" },
  "log.subtitle": { zhTW: "每次只留下一個真正有用的線索。", en: "Keep one useful signal from every session." },
  "log.empty": { zhTW: "完成第一次訓練後，紀錄會出現在這裡。", en: "Your first saved session will appear here." },
  "backup.title": { zhTW: "你的資料，由你保管。", en: "Your data, in your hands." },
  "backup.local": { zhTW: "所有資料只存在這台裝置。", en: "Your data stays on this device." },
  "backup.language": { zhTW: "介面語言", en: "Interface language" },
  "backup.data": { zhTW: "資料備份", en: "Data backup" },
  "backup.export": { zhTW: "匯出 JSON", en: "Export JSON" },
  "backup.import": { zhTW: "匯入 JSON", en: "Import JSON" },
  "backup.reset": { zhTW: "清除所有紀錄", en: "Reset all records" },
  "backup.imported": { zhTW: "備份已匯入。", en: "Backup imported." },
  "backup.invalid": { zhTW: "這不是有效的 Corner 備份檔。", en: "This is not a valid Corner backup." },
  "common.minutes": { zhTW: "分鐘", en: "min" },
  "common.rest": { zhTW: "恢復", en: "Recovery" },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(language: Language, key: TranslationKey): string {
  return language === "zh-TW"
    ? translations[key].zhTW
    : translations[key].en;
}

export function formatPlanLabel(
  label: LocalizedLabel,
  language: Language
): string {
  return language === "zh-TW" ? label.zhTW : label.en;
}
