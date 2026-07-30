export type Language = "zh-TW" | "en";

export type Weekday =
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat"
  | "sun";

export interface LocalizedLabel {
  zhTW: string;
  en: string;
}

export interface PlanItem {
  id: string;
  label: LocalizedLabel;
  detail: LocalizedLabel;
}

export interface DayPlan {
  day: Weekday;
  dayLabel: LocalizedLabel;
  session: LocalizedLabel;
  duration: number;
  intensity: "light" | "moderate" | "hard" | "rest";
  time?: string;
  focus: LocalizedLabel;
  items: PlanItem[];
}

export interface TrainingRecord {
  completedItemIds: string[];
  rpe?: number;
  technicalNotes?: string;
  bodyCheck?: string;
  nextFocus?: string;
  updatedAt?: string;
}

