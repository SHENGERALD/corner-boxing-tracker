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
  removedItemIds?: string[];
  customItems?: CustomTrainingItem[];
  itemSetLogs?: Record<string, TrainingSet[]>;
  rpe?: number;
  technicalNotes?: string;
  bodyCheck?: string;
  nextFocus?: string;
  updatedAt?: string;
}

export type WeightUnit = "kg" | "lb";

export interface TrainingSet {
  id: string;
  weight?: number;
  weightUnit?: WeightUnit;
  reps?: number;
  durationSeconds?: number;
  durationText?: string;
  completed: boolean;
}

export type TrainingUnit = "rounds" | "minutes";

export interface CustomTrainingItem {
  id: string;
  drillId: string;
  quantity: number;
  unit: TrainingUnit;
  note?: string;
  completed: boolean;
}
