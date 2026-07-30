import type { DayPlan, LocalizedLabel, PlanItem, Weekday } from "./types";

const label = (zhTW: string, en: string): LocalizedLabel => ({ zhTW, en });

const item = (
  id: string,
  zhTW: string,
  en: string,
  detailZh: string,
  detailEn: string
): PlanItem => ({
  id,
  label: label(zhTW, en),
  detail: label(detailZh, detailEn),
});

const coachingItems = [
  item("coach-class", "一對一教練課", "Coach class", "技術修正 30 分鐘", "30 min technique coaching"),
  item("shadow", "影子拳擊", "Shadow boxing", "慢速 3 回合", "3 controlled rounds"),
  item("heavy-bag", "沙包技術", "Heavy bag", "教練課後 4 回合", "4 post-coaching rounds"),
  item("cooldown", "核心與收操", "Core + cooldown", "核心 10 分鐘與伸展", "10 min core and mobility"),
];

export const weeklyPlan: DayPlan[] = [
  {
    day: "mon",
    dayLabel: label("週一", "Monday"),
    session: label("低強度技術", "Light Technique"),
    duration: 75,
    intensity: "light",
    focus: label("動作預習與節奏", "Movement preview and rhythm"),
    items: [
      item("rope", "跳繩", "Jump rope", "10 分鐘", "10 minutes"),
      item("shadow", "影子拳擊", "Shadow boxing", "超慢速 5 回合", "5 slow rounds"),
      item("footwork", "步法練習", "Footwork", "地板線 10 分鐘", "10 min line drills"),
      item("zone-two", "Zone 2 輕鬆跑", "Zone 2 run", "30 分鐘", "30 minutes"),
    ],
  },
  {
    day: "tue",
    dayLabel: label("週二", "Tuesday"),
    session: label("教練課＋自主訓練", "Coaching + Self Training"),
    duration: 90,
    intensity: "hard",
    time: "17:40–19:10",
    focus: label("本週新技術主題", "New weekly technique"),
    items: coachingItems,
  },
  {
    day: "wed",
    dayLabel: label("週三", "Wednesday"),
    session: label("完全休息", "Rest"),
    duration: 0,
    intensity: "rest",
    focus: label("散步、伸展、完整恢復", "Walk, stretch, recover"),
    items: [],
  },
  {
    day: "thu",
    dayLabel: label("週四", "Thursday"),
    session: label("教練課＋自主訓練", "Coaching + Self Training"),
    duration: 90,
    intensity: "hard",
    time: "17:40–19:10",
    focus: label("修正、移動與加壓", "Correction, movement, pressure"),
    items: coachingItems,
  },
  {
    day: "fri",
    dayLabel: label("週五", "Friday"),
    session: label("可選低強度沙包", "Optional Light Bag"),
    duration: 45,
    intensity: "light",
    focus: label("累的時候優先休息", "Skip first when fatigued"),
    items: [
      item("shadow", "影子拳擊", "Shadow boxing", "3 回合", "3 rounds"),
      item("heavy-bag", "低強度沙包", "Light heavy bag", "50% 力量 4 回合", "4 rounds at 50%"),
      item("cooldown", "收操", "Cooldown", "肩、胸、髖伸展", "Shoulders, chest, hips"),
    ],
  },
  {
    day: "sat",
    dayLabel: label("週六", "Saturday"),
    session: label("肌力＋跑步", "Strength + Run"),
    duration: 90,
    intensity: "moderate",
    focus: label("力量傳遞鏈與有氧底", "Power chain and aerobic base"),
    items: [
      item("squat", "深蹲", "Squat", "4 × 6–8", "4 × 6–8"),
      item("hinge", "硬舉", "Deadlift", "3 × 6", "3 × 6"),
      item("push-pull", "推拉肌力", "Push + pull", "各 3 組", "3 sets each"),
      item("run", "階段跑步", "Phase run", "20–30 分鐘", "20–30 minutes"),
    ],
  },
  {
    day: "sun",
    dayLabel: label("週日", "Sunday"),
    session: label("完全休息", "Rest"),
    duration: 0,
    intensity: "rest",
    focus: label("不補訓練", "No makeup training"),
    items: [],
  },
];

export function getPlanForWeekday(day: Weekday): DayPlan {
  const plan = weeklyPlan.find((candidate) => candidate.day === day);
  if (!plan) {
    throw new Error(`Missing plan for ${day}`);
  }
  return plan;
}

