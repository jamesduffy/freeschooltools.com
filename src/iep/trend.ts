import { toDayNumber } from "./dates";

export type XY = { x: number; y: number };
export type Line = { slope: number; intercept: number };

/** THE trend calculation. Ordinary least squares today.
 *  Some teams use a split-middle line instead; to swap, replace this one function
 *  (keep the signature) and everything that draws or describes the trend follows. */
export function computeTrend(points: XY[]): Line | null {
  const n = points.length;
  if (n < 2) return null;
  const mx = points.reduce((a, p) => a + p.x, 0) / n;
  const my = points.reduce((a, p) => a + p.y, 0) / n;
  let sxx = 0, sxy = 0;
  for (const p of points) { sxx += (p.x - mx) ** 2; sxy += (p.x - mx) * (p.y - my); }
  if (sxx === 0) return null; // all on the same day
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

export const MIN_TREND_POINTS = 4;

/** Trend over dated points. x is days since 1970-01-01, so slope is "per day". */
export function trendForData(data: { date: string; value: number }[]): Line | null {
  if (data.length < MIN_TREND_POINTS) return null;
  return computeTrend(data.map((p) => ({ x: toDayNumber(p.date), y: p.value })));
}

/** Aim line from baseline to target. Null if it cannot be drawn. */
export function aimLine(b?: { value: number; date: string }, t?: { value: number; date: string }): Line | null {
  if (!b || !t) return null;
  const x1 = toDayNumber(b.date), x2 = toDayNumber(t.date);
  if (x1 === x2) return null;
  const slope = (t.value - b.value) / (x2 - x1);
  return { slope, intercept: b.value - slope * x1 };
}

export const valueAt = (l: Line, date: string) => l.slope * toDayNumber(date) + l.intercept;

export type SlopeVerdict = "above" | "near" | "below";
/** "near" means within 10% of the aim slope (or, if the aim is flat, within 0.01 per week). */
export function compareSlopes(trendPerDay: number, aimPerDay: number): SlopeVerdict {
  const tol = Math.max(Math.abs(aimPerDay) * 0.1, 0.01 / 7);
  const diff = trendPerDay - aimPerDay;
  if (Math.abs(diff) <= tol) return "near";
  return diff > 0 ? "above" : "below";
}
