/** Plain calendar-date helpers. Dates are "YYYY-MM-DD" strings. No times, no time zones:
 *  everything goes through Date.UTC so the local zone and DST can never shift a day. */

const RE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type Ymd = { y: number; m: number; d: number };

export function parseYmd(s: string): Ymd | null {
  const mt = RE.exec(s);
  if (!mt) return null;
  const y = +mt[1]!, m = +mt[2]!, d = +mt[3]!;
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

export function isValidYmd(s: unknown): s is string {
  return typeof s === "string" && parseYmd(s) !== null;
}

export function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!;
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
export function formatYmd({ y, m, d }: Ymd): string {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

/** Whole days since 1970-01-01 for a calendar date. */
export function toDayNumber(s: string): number {
  const p = parseYmd(s);
  if (!p) throw new Error(`Not a date: ${s}`);
  return Math.round(Date.UTC(p.y, p.m - 1, p.d) / 86400000);
}

export function fromDayNumber(n: number): string {
  const dt = new Date(n * 86400000);
  return formatYmd({ y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() });
}

export function addDays(s: string, n: number): string {
  return fromDayNumber(toDayNumber(s) + n);
}

/** b minus a, in whole days. */
export function diffDays(a: string, b: string): number {
  return toDayNumber(b) - toDayNumber(a);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekday(s: string): number {
  return (((toDayNumber(s) + 4) % 7) + 7) % 7;
}

export function isWeekend(s: string): boolean {
  const w = weekday(s);
  return w === 0 || w === 6;
}

/** Add whole years. If the day does not exist in the target month (Feb 29), use the month's last day. */
export function addYears(s: string, n: number): { date: string; clamped: boolean } {
  const p = parseYmd(s);
  if (!p) throw new Error(`Not a date: ${s}`);
  const y = p.y + n;
  const dim = daysInMonth(y, p.m);
  const clamped = p.d > dim;
  return { date: formatYmd({ y, m: p.m, d: clamped ? dim : p.d }), clamped };
}

/** Number of Monday-to-Friday days from start to end, inclusive. */
export function countWeekdays(start: string, end: string): number {
  let n = 0;
  for (let d = toDayNumber(start), e = toDayNumber(end); d <= e; d++) {
    const w = (((d + 4) % 7) + 7) % 7;
    if (w !== 0 && w !== 6) n++;
  }
  return n;
}

/** Today's date as the user's local calendar date. */
export function todayYmd(now: Date = new Date()): string {
  return formatYmd({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
}

/** "Oct 27, 2026" */
export function prettyDate(s: string): string {
  const p = parseYmd(s);
  return p ? `${MONTHS[p.m - 1]} ${p.d}, ${p.y}` : s;
}
/** "Oct 27" */
export function shortDate(s: string): string {
  const p = parseYmd(s);
  return p ? `${MONTHS[p.m - 1]} ${p.d}` : s;
}
