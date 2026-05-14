import { Color } from "@raycast/api";

/** Format a duration in minutes as "Xh Ym". Returns "—" for null/undefined/0. */
export function formatDuration(minutes: number | undefined | null): string {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/** Pick a traffic-light color for a 0–100 score. */
export function scoreColor(score: number | undefined | null): Color {
  if (score == null) return Color.SecondaryText;
  if (score >= 85) return Color.Green;
  if (score >= 70) return Color.Yellow;
  return Color.Red;
}

/** Emoji equivalent of scoreColor — for menu-bar titles. */
export function scoreEmoji(score: number | undefined | null): string {
  if (score == null) return "⚪";
  if (score >= 85) return "🟢";
  if (score >= 70) return "🟡";
  return "🔴";
}

/** Number → 1-dp string, or "—" if missing. */
export function fmt(n: number | undefined | null, suffix = ""): string {
  if (n == null) return "—";
  const v = Number.isInteger(n) ? n.toString() : n.toFixed(1);
  return suffix ? `${v} ${suffix}` : v;
}

/** Today's date as YYYY-MM-DD in the user's local timezone. */
export function today(): string {
  return formatDate(new Date());
}

/** Format a Date as YYYY-MM-DD (local time). */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Return [startEpochSeconds, endEpochSeconds] covering the last N days inclusive of today. */
export function lastNDaysEpoch(n: number): { start: number; end: number } {
  const end = new Date();
  end.setHours(23, 59, 59, 0);
  const start = new Date();
  start.setDate(start.getDate() - (n - 1));
  start.setHours(0, 0, 0, 0);
  return {
    start: Math.floor(start.getTime() / 1000),
    end: Math.floor(end.getTime() / 1000),
  };
}

/** ASCII sparkline for a series of numbers (last N values). Missing values render as space. */
export function sparkline(values: Array<number | undefined | null>): string {
  const ticks = "▁▂▃▄▅▆▇█";
  const present = values.filter((v): v is number => typeof v === "number");
  if (present.length === 0) return "";
  const min = Math.min(...present);
  const max = Math.max(...present);
  const range = max - min || 1;
  return values
    .map((v) =>
      typeof v === "number"
        ? ticks[Math.min(7, Math.floor(((v - min) / range) * 7))]
        : " ",
    )
    .join("");
}
