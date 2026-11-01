import { describe, expect, it } from "vitest";
import {
  announcement, clockIndex, clockProblem, defaultSettings, exportPlan, firstThenStage, isSingleEmoji, newCard, newSchedule, parseImport,
  progressFor, resolveIndex, stepBack, stepNext, type Card, type Schedule,
} from "../src/schedule/model";
import { dayLayout, totalHeight } from "../src/schedule/layout";

const day = (times: (string | undefined)[]): Schedule =>
  newSchedule("Day", "day", times.map((t, i) => newCard(`Card ${i + 1}`, t ? { startTime: t } : {})));
const at = (h: number, m: number, y = 2026, mo = 10, d = 5) => new Date(y, mo, d, h, m, 0);
const clockSettings = { ...defaultSettings(), mode: "clock" as const };

describe("by clock", () => {
  const s = day(["08:30", "09:15", "10:30"]);
  it("picks the right card at the exact start time, one minute before, and after the last card", () => {
    expect(clockProblem(s)).toBeNull();
    expect(clockIndex(s.activities, 9 * 60 + 15)).toBe(1); // exact
    expect(clockIndex(s.activities, 9 * 60 + 14)).toBe(0); // one minute before
    expect(clockIndex(s.activities, 10 * 60 + 29)).toBe(1);
    expect(clockIndex(s.activities, 23 * 60 + 59)).toBe(2); // after the last card
    expect(clockIndex(s.activities, 6 * 60)).toBe(0); // before the first card
  });
  it("resolves through the settings and the local time", () => {
    expect(resolveIndex(s, undefined, clockSettings, at(9, 15))).toEqual({ index: 1, following: true, problem: null });
    expect(resolveIndex(s, undefined, clockSettings, at(9, 14)).index).toBe(0);
  });
  it("refuses cards without times and stays in manual", () => {
    const bad = day(["08:30", undefined, "10:30"]);
    expect(clockProblem(bad)).toBe("Add a time to every card to follow the clock");
    const r = resolveIndex(bad, { date: "2026-11-05", index: 2 }, clockSettings, at(8, 31));
    expect(r.following).toBe(false);
    expect(r.problem).toBe("Add a time to every card to follow the clock");
    expect(r.index).toBe(2); // the manual progress, not the clock
  });
  it("refuses times out of order, or equal", () => {
    expect(clockProblem(day(["09:00", "08:00"]))).toMatch(/later/);
    expect(clockProblem(day(["09:00", "09:00"]))).toMatch(/later/);
  });
  it("refuses an empty list and First and Then", () => {
    expect(clockProblem(day([]))).not.toBeNull();
    const ft = newSchedule("x", "firstThen", [newCard("a", { startTime: "08:00" }), newCard("b", { startTime: "09:00" })]);
    expect(clockProblem(ft)).not.toBeNull();
  });
});

describe("progress", () => {
  const s = day([undefined, undefined, undefined]);
  it("counts only for the date it was saved", () => {
    expect(progressFor({ date: "2026-11-04", index: 2 }, "2026-11-05", s)).toEqual({ date: "2026-11-05", index: 0 });
    expect(progressFor({ date: "2026-11-05", index: 2 }, "2026-11-05", s)).toEqual({ date: "2026-11-05", index: 2 });
    expect(progressFor(undefined, "2026-11-05", s).index).toBe(0);
  });
  it("Back and Next never go out of range", () => {
    let p = progressFor(undefined, "2026-11-05", s);
    expect(stepBack(p, s).index).toBe(0);
    p = stepNext(stepNext(p, s), s);
    expect(p.index).toBe(2);
    expect(stepNext(p, s).index).toBe(2);
    expect(progressFor({ date: "2026-11-05", index: 99 }, "2026-11-05", s).index).toBe(2);
    expect(progressFor({ date: "2026-11-05", index: -4 }, "2026-11-05", s).index).toBe(0);
    expect(stepNext({ date: "d", index: 0 }, day([]) ).index).toBe(0);
  });
  it("resolveIndex resets on a new date", () => {
    expect(resolveIndex(s, { date: "2026-11-04", index: 2 }, defaultSettings(), at(9, 0)).index).toBe(0);
  });
});

describe("First and Then", () => {
  const ft = newSchedule("ft", "firstThen", [newCard("Writing"), newCard("Break")]);
  it("goes First, Then, Done, and back again", () => {
    let p = progressFor(undefined, "2026-11-05", ft);
    const stages = [firstThenStage(p.index)];
    p = stepNext(p, ft); stages.push(firstThenStage(p.index));
    p = stepNext(p, ft); stages.push(firstThenStage(p.index));
    p = stepNext(p, ft); stages.push(firstThenStage(p.index)); // cannot go past done
    expect(stages).toEqual(["first", "then", "done", "done"]);
    p = stepBack(p, ft); expect(firstThenStage(p.index)).toBe("then");
    p = stepBack(p, ft); expect(firstThenStage(p.index)).toBe("first");
    expect(stepBack(p, ft).index).toBe(0);
  });
  it("announces", () => {
    expect(announcement(ft, 0)).toBe("First: Writing. Then: Break");
    expect(announcement(ft, 1)).toBe("Now: Break");
    expect(announcement(ft, 2)).toBe("All done");
    const d = newSchedule("d", "day", [newCard("Recess"), newCard("Lunch")]);
    expect(announcement(d, 0)).toBe("Now: Recess. Next: Lunch");
    expect(announcement(d, 1)).toBe("Now: Lunch");
  });
});

describe("import and export", () => {
  const timerPlan = {
    id: "p1", name: "Reading block", totalSeconds: 1800,
    activities: [
      { id: "a1", name: "Read aloud", seconds: 600, color: "sky", icon: "📚" },
      { id: "a2", name: "Partner read", seconds: 900, color: "mint", icon: "reading" },
      { id: "a3", name: "Share", seconds: 300, color: "nope", icon: "not-an-icon" },
    ],
  };
  it("accepts a valid timer plan, drops unknown icons, ignores totalSeconds", () => {
    const r = parseImport(JSON.stringify(timerPlan));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.schedule.mode).toBe("day");
    expect(r.schedule.activities.map((c) => c.icon)).toEqual(["📚", "reading", undefined]);
    expect(r.schedule.activities[2]!.color).toBeUndefined();
    expect(r.schedule.activities.map((c) => c.seconds)).toEqual([600, 900, 300]);
    expect(JSON.stringify(r.schedule)).not.toContain("totalSeconds");
    expect(r.notes.join(" ")).toMatch(/not recognized/);
  });
  it("rejects malformed files", () => {
    const bad = (v: unknown) => parseImport(typeof v === "string" ? v : JSON.stringify(v)).ok;
    expect(bad("not json")).toBe(false);
    expect(bad([])).toBe(false);
    expect(bad(null)).toBe(false);
    expect(bad({ name: "x" })).toBe(false);
    expect(bad({ name: "x", activities: [] })).toBe(false);
    expect(bad({ name: 4, activities: [{ name: "a" }] })).toBe(false);
    expect(bad({ name: "x", activities: [{ id: "1" }] })).toBe(false);
    expect(bad({ name: "x", activities: [{ name: "  " }] })).toBe(false);
    expect(bad({ name: "x", activities: ["a"] })).toBe(false);
    expect(bad({ name: "x", activities: Array.from({ length: 13 }, (_, i) => ({ name: `c${i}` })) })).toBe(false);
    expect(bad({ name: "x", activities: [{ name: "ok" }] })).toBe(true);
  });
  it("shortens long labels, drops bad times and bad seconds", () => {
    const r = parseImport(JSON.stringify({ name: "x", activities: [{ name: "a".repeat(45), startTime: "25:00", seconds: -5 }] }));
    expect(r.ok && r.schedule.activities[0]!.name.length).toBe(30);
    expect(r.ok && r.schedule.activities[0]!.startTime).toBeUndefined();
    expect(r.ok && r.schedule.activities[0]!.seconds).toBeUndefined();
  });
  it("export includes seconds and totalSeconds only when every card has seconds", () => {
    const all = newSchedule("a", "day", [newCard("A", { seconds: 60 }), newCard("B", { seconds: 120 })]);
    expect(exportPlan(all).totalSeconds).toBe(180);
    const some = newSchedule("a", "day", [newCard("A", { seconds: 60 }), newCard("B")]);
    const p = exportPlan(some);
    expect("totalSeconds" in p).toBe(false);
    expect(p.activities[0]!.seconds).toBe(60);
    expect("seconds" in p.activities[1]!).toBe(false);
  });
  it("round trips between the timer's plan shape and this tool", () => {
    // timer plan -> schedule -> timer plan keeps the timer's fields
    const first = parseImport(JSON.stringify({ id: "p1", name: "Lesson", totalSeconds: 900, activities: [
      { id: "a", name: "Warm up", seconds: 300, color: "coral", icon: "🔥" }, { id: "b", name: "Practice", seconds: 600, color: "blue" }] }));
    if (!first.ok) throw new Error("import failed");
    const out = JSON.parse(JSON.stringify(exportPlan(first.schedule)));
    expect(out).toMatchObject({ id: "p1", name: "Lesson", totalSeconds: 900 });
    expect(out.activities).toEqual([
      { id: "a", name: "Warm up", seconds: 300, color: "coral", icon: "🔥" },
      { id: "b", name: "Practice", seconds: 600, color: "blue" }]);
    // schedule -> file -> schedule keeps built-in icons, times and mode
    const mine = newSchedule("Mine", "firstThen", [newCard("Writing", { icon: "writing", startTime: "09:00", color: "sky" }), newCard("Break", { icon: "😀", seconds: 60 })]);
    const file = JSON.parse(JSON.stringify(exportPlan(mine)));
    // the timer-facing icon field only ever holds an emoji
    for (const a of file.activities) if (a.icon !== undefined) expect(isSingleEmoji(a.icon)).toBe(true);
    for (const a of file.activities) expect(typeof a.color).toBe("string");
    const back = parseImport(JSON.stringify(file));
    // a card with no color gets a palette color on export, because the timer needs one
    expect(back.ok && back.schedule).toEqual({ ...mine, activities: [mine.activities[0], { ...mine.activities[1], color: "orange" }] });
  });
  it("accepts only single emoji", () => {
    expect(isSingleEmoji("📚")).toBe(true);
    expect(isSingleEmoji("✏️")).toBe(true);
    expect(isSingleEmoji("👩‍🏫")).toBe(true);
    expect(isSingleEmoji("🇺🇸")).toBe(true);
    expect(isSingleEmoji("a")).toBe(false);
    expect(isSingleEmoji("7")).toBe(false);
    expect(isSingleEmoji("📚📚")).toBe(false);
    expect(isSingleEmoji("")).toBe(false);
  });
});

describe("day layout", () => {
  it("shrinks spacing before size, and only scrolls at the minimum", () => {
    const big = dayLayout(4, 700);
    expect(big.fits).toBe(true);
    const mid = dayLayout(9, 640);
    const small = dayLayout(12, 640);
    expect(mid.icon).toBeGreaterThanOrEqual(96);
    expect(small.fits).toBe(false);
    expect(small.label).toBe(28);
    expect(small.nowLabel).toBe(44);
    expect(small.icon).toBe(96);
    expect(dayLayout(9, 680).gap).toBeLessThanOrEqual(big.gap);
    const l = dayLayout(9, 5000);
    expect(totalHeight(9, l)).toBeLessThanOrEqual(5000);
  });
  it("always keeps label sizes at or above the minimums", () => {
    for (let n = 1; n <= 12; n++) for (const h of [300, 500, 600, 700, 900]) {
      const l = dayLayout(n, h);
      expect(l.label).toBeGreaterThanOrEqual(28);
      expect(l.nowLabel).toBeGreaterThanOrEqual(44);
      expect(l.icon).toBeGreaterThanOrEqual(96);
    }
  });
});

export type { Card };
