import { addDays, addYears, countWeekdays, diffDays, isWeekend, prettyDate, toDayNumber, weekday } from "./dates";
import type { NonInstructionalRange, Student } from "./model";
import { LONG_BREAK_WEEKDAYS, RULES, type Rule } from "./rules";

/** Pure date math. No DOM. */

export type DeadlineResult = {
  date: string;
  skipped: NonInstructionalRange[]; // long breaks that actually pushed the date later
  notes: string[]; // e.g. Feb 29 adjustment, weekend landing
};

/** Day counts are calendar days; day 1 is the day after the start date.
 *  When skipLongBreaks is true, a day inside a long break (more than 5 weekdays) is not counted. */
export function addCountedDays(start: string, n: number, breaks: NonInstructionalRange[], skipLongBreaks: boolean): { date: string; skipped: NonInstructionalRange[] } {
  const long = skipLongBreaks ? breaks.filter((b) => countWeekdays(b.start, b.end) > LONG_BREAK_WEEKDAYS) : [];
  const ranges = long.map((b) => ({ b, s: toDayNumber(b.start), e: toDayNumber(b.end) }));
  const used = new Set<NonInstructionalRange>();
  let cur = toDayNumber(start);
  let counted = 0;
  while (counted < n) {
    cur++;
    const hit = ranges.find((r) => cur >= r.s && cur <= r.e);
    if (hit) used.add(hit.b);
    else counted++;
  }
  const skipped = [...used].sort((a, b) => a.start.localeCompare(b.start));
  return { date: addDays("1970-01-01", cur), skipped };
}

export function computeDeadline(rule: Rule, start: string, breaks: NonInstructionalRange[]): DeadlineResult {
  const notes: string[] = [];
  let date: string;
  let skipped: NonInstructionalRange[] = [];
  if (rule.unit === "days") {
    const r = addCountedDays(start, rule.length, breaks, rule.skipLongBreaks);
    date = r.date;
    skipped = r.skipped;
  } else {
    const r = addYears(start, rule.length);
    date = r.date;
    if (r.clamped) notes.push(`${prettyDate(start)} has no matching day ${rule.length} year${rule.length === 1 ? "" : "s"} later, so the last day of that month (${date}) is used.`);
  }
  if (isWeekend(date)) notes.push(`This date falls on a ${weekday(date) === 6 ? "Saturday" : "Sunday"}. The date has not been moved.`);
  return { date, skipped, notes };
}

/** One sentence that spells out the math, for the expandable line under each date. */
export function explain(rule: Rule, start: string, res: DeadlineResult): string {
  const amount = `${rule.length} ${rule.unit === "days" ? "day" : "year"}${rule.length === 1 ? "" : "s"}`;
  const skip = res.skipped.length
    ? `, not counting ${res.skipped.map((b) => `${b.start} to ${b.end} (${b.label})`).join(" and ")},`
    : "";
  return `${amount} after ${start}${skip} is ${res.date}.`;
}

export type Status = "Overdue" | "Due within 30 days" | "Upcoming";

export type Deadline = {
  studentId: string;
  code: string;
  rule: Rule;
  start: string;
  due: string;
  daysRemaining: number; // negative when overdue
  status: Status;
  math: string;
  notes: string[];
};

export function statusFor(daysRemaining: number): Status {
  if (daysRemaining < 0) return "Overdue";
  if (daysRemaining <= 30) return "Due within 30 days";
  return "Upcoming";
}

/** Every deadline for every student, soonest first. A rule is skipped when its start date is not set. */
export function computeDeadlines(students: Student[], breaks: NonInstructionalRange[], today: string, rules: Rule[] = RULES): Deadline[] {
  const out: Deadline[] = [];
  for (const s of students) {
    for (const rule of rules) {
      const start = s.dates[rule.startsFrom];
      if (!start) continue;
      const res = computeDeadline(rule, start, breaks);
      const daysRemaining = diffDays(today, res.date);
      out.push({
        studentId: s.id, code: s.code, rule, start, due: res.date, daysRemaining,
        status: statusFor(daysRemaining),
        math: `${explain(rule, start, res)} Rule source to verify: ${rule.citation}.`,
        notes: res.notes,
      });
    }
  }
  return out.sort((a, b) => a.due.localeCompare(b.due) || a.code.localeCompare(b.code));
}

export function timeLeftText(days: number): string {
  if (days === 0) return "Due today";
  const n = Math.abs(days);
  const w = `${n} day${n === 1 ? "" : "s"}`;
  return days < 0 ? `${w} overdue` : w;
}
