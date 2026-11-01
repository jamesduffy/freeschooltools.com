import { describe, expect, it } from "vitest";
import { defaultSettings, emptyStore, newCard, newSchedule, STORAGE_KEY, validateStore } from "../src/schedule/model";
import { deleteAllToolKeys, loadStore, parseStoreText, saveStore } from "../src/schedule/storage";
import { fakeKV } from "./helpers";

const sample = () => {
  const s = newSchedule("Monday", "day", [newCard("Reading", { icon: "reading", color: "sky", startTime: "09:00", seconds: 600 }), newCard("Recess", { icon: "😀" })]);
  return { ...emptyStore(), schedules: [s], currentId: s.id, progress: { [s.id]: { date: "2026-11-05", index: 1 } }, settings: { ...defaultSettings(), highContrast: true } };
};

describe("schedule storage", () => {
  it("round-trips through save and load under schedule.v1", () => {
    const kv = fakeKV(); const st = sample();
    expect(saveStore(kv, st)).toEqual({ ok: true });
    expect([...kv.m.keys()]).toEqual(["schedule.v1"]);
    expect(STORAGE_KEY).toBe("schedule.v1");
    expect(loadStore(kv)).toEqual({ kind: "ok", store: st });
  });
  it("works with empty storage", () => { expect(loadStore(fakeKV())).toEqual({ kind: "empty" }); });
  it("reports a failed save and an unreadable store without throwing", () => {
    expect(saveStore({ ...fakeKV(), setItem: () => { throw new Error("QuotaExceededError"); } }, emptyStore())).toEqual({ ok: false, error: "QuotaExceededError" });
    expect(loadStore({ ...fakeKV(), getItem: () => { throw new Error("denied"); } }).kind).toBe("unavailable");
  });
  it("rejects bad shapes and newer versions", () => {
    expect(parseStoreText("nope").kind).toBe("invalid");
    expect(parseStoreText("[]").kind).toBe("invalid");
    expect(parseStoreText(JSON.stringify({ ...sample(), schemaVersion: 2 })).kind).toBe("newer");
    const bad = (mut: (s: any) => void) => { const s: any = JSON.parse(JSON.stringify(sample())); mut(s); return validateStore(s).ok; };
    expect(bad(() => {})).toBe(true);
    expect(bad((s) => { s.schedules[0].activities[0].startTime = "9:00"; })).toBe(false);
    expect(bad((s) => { s.schedules[0].activities[0].icon = "bogus"; })).toBe(false);
    expect(bad((s) => { s.schedules[0].activities[0].color = "#fff"; })).toBe(false);
    expect(bad((s) => { s.schedules[0].mode = "week"; })).toBe(false);
    expect(bad((s) => { s.settings.mode = "auto"; })).toBe(false);
    expect(bad((s) => { s.progress.x = { date: "2026-02-30", index: 0 }; })).toBe(false);
    expect(bad((s) => { s.schedules[0].activities = Array.from({ length: 13 }, (_, i) => ({ id: `i${i}`, name: "x" })); })).toBe(false);
  });
  it("deletes only keys that start with schedule.", () => {
    const m = new Map([["schedule.v1", "x"], ["schedule.other", "y"], ["iepkit.v1", "keep"], ["timer.v1", "keep"]]);
    const storage = { get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, removeItem: (k: string) => void m.delete(k) } as unknown as Storage;
    deleteAllToolKeys(storage);
    expect([...m.keys()].sort()).toEqual(["iepkit.v1", "timer.v1"]);
  });
});
