import { describe, expect, it } from "vitest";
import { exportPlan, parseImport, newSchedule, newCard } from "../src/schedule/model";
import { parsePlan, finishImport, newPlan } from "../src/timer/model";

/** The Pie Timer and the Visual Schedule Board swap plan files. These tests pin that contract. */
describe("timer <-> schedule plan files", () => {
  it("a schedule without lengths imports into the timer, which asks for lengths", () => {
    const s = newSchedule("Monday", "day", [newCard("Reading", { icon: "reading", color: "sky", startTime: "09:00" }), newCard("Recess", { icon: "🏃" })]);
    const file = JSON.parse(JSON.stringify(exportPlan(s)));
    const r = parsePlan(file, true);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.needsLength).toHaveLength(2);
    expect(r.totalMissing).toBe(true);
    expect(r.plan.activities.map((a) => a.name)).toEqual(["Reading", "Recess"]);
    expect(r.plan.activities[1]!.icon).toBe("🏃");
    expect(r.plan.activities[0]!.icon).toBeUndefined(); // built-in icon ids are not timer icons
    const done = finishImport(r, Object.fromEntries(r.needsLength.map((id) => [id, 600])));
    expect(done.ok && done.plan.totalSeconds).toBe(1200);
  });
  it("a schedule with lengths gives the timer a complete plan", () => {
    const s = newSchedule("Block", "day", [newCard("A", { seconds: 300 }), newCard("B", { seconds: 600 })]);
    const r = parsePlan(JSON.parse(JSON.stringify(exportPlan(s))), true);
    expect(r.ok && r.needsLength.length).toBe(0);
    expect(r.ok && r.plan.totalSeconds).toBe(900);
  });
  it("a timer plan imports into the schedule as cards", () => {
    const p = newPlan("Reading block", 900);
    p.activities = [{ id: "a", name: "Warm up", seconds: 300, color: "mint", icon: "📖" }, { id: "b", name: "Read", seconds: 600, color: "blue" }];
    const r = parseImport(JSON.stringify(p));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.schedule.activities.map((c) => [c.name, c.icon, c.color, c.seconds])).toEqual([["Warm up", "📖", "mint", 300], ["Read", undefined, "blue", 600]]);
  });
  it("both reject malformed files", () => {
    expect(parseImport("{}").ok).toBe(false);
    expect(parsePlan({ activities: "x" }, true).ok).toBe(false);
  });
});
