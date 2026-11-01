import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../src/timer/model";
import { STARTER_PLANS } from "../src/timer/starters";
import { emptyStore, exportPlanText, loadStore, parsePlanFileText, parseStoreText, saveStore, STORAGE_KEY, validateSettings } from "../src/timer/storage";
import { fakeKV } from "./helpers";

const sample = () => ({ ...emptyStore(), plans: [STARTER_PLANS[0]!, STARTER_PLANS[1]!], lastPlanId: STARTER_PLANS[1]!.id, settings: { ...DEFAULT_SETTINGS, chime: "bell" as const, volume: 0.7, marker: "snail" as const } });

describe("storage", () => {
  it("round-trips through save and load", () => {
    const kv = fakeKV(); const s = sample();
    expect(saveStore(kv, s)).toEqual({ ok: true });
    expect(kv.m.has(STORAGE_KEY)).toBe(true);
    expect(STORAGE_KEY).toBe("timer.v1");
    expect(loadStore(kv)).toEqual({ kind: "ok", store: s });
  });
  it("works with empty storage", () => { expect(loadStore(fakeKV())).toEqual({ kind: "empty" }); });
  it("reports failed saves and unavailable storage instead of throwing", () => {
    expect(saveStore({ ...fakeKV(), setItem: () => { throw new Error("QuotaExceededError"); } }, emptyStore())).toEqual({ ok: false, error: "QuotaExceededError" });
    expect(loadStore({ ...fakeKV(), getItem: () => { throw new Error("denied"); } }).kind).toBe("unavailable");
  });
  it("corrupted data is reported so the page can fall back to defaults", () => {
    for (const raw of ["not json", "[]", "null", "42", JSON.stringify({ schemaVersion: 1 }), JSON.stringify({ plans: [] })]) {
      expect(parseStoreText(raw).kind).toBe("invalid");
    }
    expect(parseStoreText(JSON.stringify({ schemaVersion: 2, plans: [] })).kind).toBe("newer");
  });
  it("drops bad plans and repairs bad settings but keeps the rest", () => {
    const raw = JSON.stringify({ schemaVersion: 1, plans: [STARTER_PLANS[0], { id: "bad" }, 5, STARTER_PLANS[0]], lastPlanId: 7, settings: { chime: "loud", volume: 9, showNumbers: "yes", marker: "sun" } });
    const r = parseStoreText(raw);
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.store.plans).toHaveLength(1);
    expect(r.store.lastPlanId).toBeNull();
    expect(r.store.settings).toEqual({ ...DEFAULT_SETTINGS, volume: 1, marker: "sun" });
  });
  it("settings default safely", () => {
    expect(validateSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.chime).toBe("off");
    expect(DEFAULT_SETTINGS.volume).toBe(0.4);
  });
});

describe("starter plans", () => {
  it("add up to their totals", () => {
    expect(STARTER_PLANS.map((p) => p.totalSeconds / 60)).toEqual([45, 60, 20, 10]);
    for (const p of STARTER_PLANS) expect(p.activities.reduce((n, a) => n + a.seconds, 0)).toBe(p.totalSeconds);
  });
});

describe("plan files", () => {
  it("export is exactly the Plan object and imports back unchanged", () => {
    const p = STARTER_PLANS[0]!;
    expect(JSON.parse(exportPlanText(p))).toEqual(p);
    const r = parsePlanFileText(exportPlanText(p));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.needsLength).toEqual([]);
      expect(r.plan.totalSeconds).toBe(p.totalSeconds);
      expect(r.plan.activities.map((a) => [a.name, a.seconds, a.color])).toEqual(p.activities.map((a) => [a.name, a.seconds, a.color]));
    }
  });
  it("rejects malformed files", () => {
    for (const t of ["", "nope", "{}", "[1,2]", JSON.stringify({ activities: [{ name: "x", seconds: -5 }] }), "x".repeat(300_000)]) {
      expect(parsePlanFileText(t).ok).toBe(false);
    }
  });
  it("accepts a schedule-tool style file with no lengths and no total", () => {
    const r = parsePlanFileText(JSON.stringify({ name: "Day", startTime: "08:30", activities: [{ name: "Circle", icon: "🧩", startTime: "08:30" }, { name: "Math", seconds: 1200, color: "nope" }] }));
    expect(r.ok && r.needsLength.length).toBe(1);
    expect(r.ok && r.totalMissing).toBe(true);
  });
});
