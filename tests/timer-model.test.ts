import { describe, expect, it } from "vitest";
import {
  addActivity, adjustCurrent, clampSlice, finishImport, formatClock, leftover, locate, materializeFree, moveActivity, nextStart, overBy,
  parsePlan, raiseTotal, shrinkToFit, slicesOf, splitEvenly, spokenLength, sumSeconds, type Plan,
} from "../src/timer/model";

const plan = (secs: number[], total = secs.reduce((a, b) => a + b, 0)): Plan => ({
  id: "p", name: "t", totalSeconds: total,
  activities: secs.map((seconds, i) => ({ id: `a${i}`, name: `A${i}`, seconds, color: "coral" })),
});

describe("boundaries", () => {
  const sl = [{ seconds: 300 }, { seconds: 600 }, { seconds: 1200 }];
  it("299 is slice one, 300 is slice two, 2100 is the end", () => {
    expect(locate(sl, 299).index).toBe(0);
    expect(locate(sl, 299).left).toBeCloseTo(1);
    expect(locate(sl, 300).index).toBe(1);
    expect(locate(sl, 899.5).index).toBe(1);
    expect(locate(sl, 900).index).toBe(2);
    expect(locate(sl, 2099).done).toBe(false);
    const end = locate(sl, 2100);
    expect(end.done).toBe(true);
    expect(end.left).toBe(0);
    expect(locate(sl, 99999).done).toBe(true);
    expect(locate(sl, -5).index).toBe(0);
  });
  it("next start is the end of the current slice", () => {
    expect(nextStart(sl, 0)).toBe(300);
    expect(nextStart(sl, 2)).toBe(2100);
  });
});

describe("free time", () => {
  it("appears when activities fall short and is gone when they equal the total", () => {
    const short = plan([300, 300], 900);
    const s = slicesOf(short);
    expect(s).toHaveLength(3);
    expect(s[2]).toMatchObject({ name: "Free time", seconds: 300, free: true });
    expect(sumSeconds(s)).toBe(900);
    expect(slicesOf(plan([300, 600], 900))).toHaveLength(2);
  });
  it("can be turned into a real activity", () => {
    const r = materializeFree(plan([300], 900));
    expect(r.ok && r.plan.activities[1]).toMatchObject({ name: "Free time", seconds: 600 });
    expect(r.ok && leftover(r.plan)).toBe(0);
  });
  it("over by is reported", () => {
    expect(overBy(plan([600, 600], 900))).toBe(300);
    expect(slicesOf(plan([600, 600], 900))).toHaveLength(2);
  });
});

describe("shrink to fit and split evenly", () => {
  it("shrink scales every slice, sums exactly, remainder in the last", () => {
    const r = shrinkToFit(plan([100, 100, 100], 100));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.activities.map((a) => a.seconds)).toEqual([33, 33, 34].map((n) => Math.max(10, n)));
    expect(sumSeconds(r.plan.activities)).toBe(100);
  });
  it("shrink always sums exactly across awkward numbers", () => {
    for (const [secs, total] of [[[1000, 777, 333], 1000], [[61, 61, 61, 61, 61], 100], [[3600, 10, 10], 600], [[13, 17, 19, 23], 60]] as [number[], number][]) {
      const r = shrinkToFit(plan(secs, total));
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(sumSeconds(r.plan.activities)).toBe(total);
        expect(r.plan.activities.every((a) => a.seconds >= 10 && Number.isInteger(a.seconds))).toBe(true);
      }
    }
  });
  it("shrink refuses when slices could not stay at 10 seconds", () => {
    expect(shrinkToFit(plan([100, 100, 100], 25)).ok).toBe(false);
  });
  it("split evenly puts the remainder in the last slice", () => {
    const r = splitEvenly(plan([1, 1, 1].map((n) => n * 100), 1000));
    expect(r.ok && r.plan.activities.map((a) => a.seconds)).toEqual([333, 333, 334]);
    expect(r.ok && sumSeconds(r.plan.activities)).toBe(1000);
  });
  it("raise total matches the activities", () => {
    const r = raiseTotal(plan([600, 600], 900));
    expect(r.ok && r.plan.totalSeconds).toBe(1200);
  });
});

describe("add or take a minute", () => {
  it("changes the current slice and the total together, and the clock does not jump", () => {
    const p = plan([300, 600, 1200]);
    const r = adjustCurrent(p, 400, 60); // inside slice two, 100s in
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.activities[1]!.seconds).toBe(660);
    expect(r.plan.totalSeconds).toBe(p.totalSeconds + 60);
    const before = locate(slicesOf(p), 400), after = locate(slicesOf(r.plan), 400);
    expect(after.index).toBe(before.index);
    expect(after.into).toBe(before.into);
    expect(after.left).toBe(before.left + 60);
  });
  it("never goes under 10 seconds or past the elapsed point", () => {
    expect(adjustCurrent(plan([60, 600]), 5, -60).ok).toBe(false);
    expect(adjustCurrent(plan([100, 600]), 50, -60).ok).toBe(false); // 40 <= ... 50 into
    const ok = adjustCurrent(plan([200, 600]), 50, -60);
    expect(ok.ok && ok.plan.activities[0]!.seconds).toBe(140);
  });
  it("adding to Free time raises the total only", () => {
    const p = plan([300], 600);
    const r = adjustCurrent(p, 350, 60);
    expect(r.ok && r.plan.totalSeconds).toBe(660);
    expect(r.ok && r.plan.activities[0]!.seconds).toBe(300);
  });
  it("respects the 6 hour cap and finished plans", () => {
    expect(adjustCurrent(plan([21600]), 10, 60).ok).toBe(false);
    expect(adjustCurrent(plan([100]), 100, 60).ok).toBe(false);
  });
});

describe("limits and helpers", () => {
  it("clamps with a message", () => {
    expect(clampSlice(3)).toMatchObject({ value: 10 });
    expect(clampSlice(3).message).toBeTruthy();
    expect(clampSlice(300).message).toBeUndefined();
  });
  it("allows at most 12 activities", () => {
    let p = plan([]);
    for (let i = 0; i < 12; i++) { const r = addActivity(p); expect(r.ok).toBe(true); if (r.ok) p = r.plan; }
    expect(addActivity(p).ok).toBe(false);
    expect(new Set(p.activities.map((a) => a.color)).size).toBe(10);
  });
  it("moves activities", () => {
    expect(moveActivity(plan([1, 2, 3].map((n) => n * 100)), "a0", 1).activities.map((a) => a.id)).toEqual(["a1", "a0", "a2"]);
    expect(moveActivity(plan([100, 200]), "a0", -1).activities.map((a) => a.id)).toEqual(["a0", "a1"]);
  });
  it("formats", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(2700)).toBe("45:00");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(spokenLength(1200)).toBe("20 minutes");
    expect(spokenLength(60)).toBe("1 minute");
    expect(spokenLength(90)).toBe("1 minute 30 seconds");
  });
});

describe("plan validation", () => {
  const good = { id: "x", name: "Reading", totalSeconds: 600, activities: [{ id: "1", name: "Warm", seconds: 300, color: "mint", icon: "📖" }] };
  it("accepts a good plan and keeps its data", () => {
    const r = parsePlan(good, false);
    expect(r.ok && r.plan).toMatchObject({ id: "x", name: "Reading", totalSeconds: 600 });
    expect(r.ok && r.plan.activities[0]).toMatchObject({ name: "Warm", seconds: 300, color: "mint", icon: "📖" });
  });
  it("rejects malformed plans", () => {
    for (const bad of [null, [], "x", {}, { activities: [] }, { ...good, activities: [{ name: 5, seconds: 60 }] },
      { ...good, activities: [{ name: "a", seconds: "60" }] }, { ...good, activities: [{ name: "a", seconds: 3 }] },
      { ...good, totalSeconds: 99999 }, { ...good, totalSeconds: "x" }, { ...good, activities: Array.from({ length: 13 }, () => ({ name: "a", seconds: 60 })) }]) {
      expect(parsePlan(bad, true).ok).toBe(false);
    }
  });
  it("storage mode is strict about missing lengths; import mode is lenient", () => {
    const noSecs = { name: "S", activities: [{ name: "Math", startTime: "09:00" }, { name: "Art", seconds: 600 }], extra: 1 };
    expect(parsePlan(noSecs, false).ok).toBe(false);
    const r = parsePlan(noSecs, true);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.needsLength).toHaveLength(1);
    expect(r.totalMissing).toBe(true);
    const done = finishImport(r, { [r.needsLength[0]!]: 900 });
    expect(done.ok && done.plan.totalSeconds).toBe(1500);
    expect(done.ok && done.plan.activities.map((a) => a.seconds)).toEqual([900, 600]);
  });
  it("drops invalid colors and icons, truncates names", () => {
    const r = parsePlan({ ...good, activities: [{ name: "x".repeat(50), seconds: 60, color: "#ff0000", icon: "hello" }, { name: "b", seconds: 60, color: "sky", icon: "ab" }] }, true);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.activities[0]!.name).toHaveLength(30);
    expect(r.plan.activities[0]!.color).toBe("coral");
    expect(r.plan.activities[0]!.icon).toBeUndefined();
    expect(r.plan.activities[1]!.icon).toBeUndefined();
    expect(r.plan.activities[1]!.color).toBe("sky");
  });
});
