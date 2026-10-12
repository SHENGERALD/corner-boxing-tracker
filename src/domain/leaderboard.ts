export function getUtcWeekStart(date = new Date()): string {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
  return monday.toISOString().slice(0, 10);
}

export function normalizeLeaderboardName(value: string): string | null {
  const name = value.trim();
  return name.length >= 2 && name.length <= 20 && !/[\u0000-\u001f\u007f]/.test(name) ? name : null;
}

export function getLeaderboardPeriod(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * 86400000);
  const reset = new Date(start.getTime() + 7 * 86400000);
  return { end: end.toISOString().slice(0, 10), reset };
}
