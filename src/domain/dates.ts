import type { Weekday } from "./types";

const weekdayByIndex: Weekday[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekday(date: Date): Weekday {
  return weekdayByIndex[date.getDay()];
}

export function getWeekDates(date: Date): Date[] {
  const start = new Date(date);
  const offset = (date.getDay() + 6) % 7;
  start.setDate(date.getDate() - offset);
  start.setHours(12, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    return next;
  });
}

