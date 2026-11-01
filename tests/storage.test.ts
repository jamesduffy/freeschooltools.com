import { describe, expect, it } from "vitest";
import { emptyStore, migrate, newGoal, newStudent, STORAGE_KEY, validateStore } from "../src/iep/model";
import { loadStore, parseStoreText, saveStore } from "../src/iep/storage";
import { fakeKV } from "./helpers";

const sample = () => {
  const st = newStudent("S-01");
  st.dates = { lastIepMeeting: "2026-03-12" };
  const g = newGoal("Reading");
  g.text = "x"; g.baseline = { value: 1, unit: "wpm", date: "2026-01-01" }; g.dataPoints = [{ date: "2026-01-02", value: 2, note: "hi" }];
  st.goals.push(g);
  return { ...emptyStore(), students: [st], calendar: [{ start: "2026-12-21", end: "2027-01-01", label: "winter" }] };
};

describe("storage", () => {
  it("round-trips through save and load", () => {
    const kv = fakeKV(); const s = sample();
    expect(saveStore(kv, s)).toEqual({ ok: true });
    expect(kv.m.has(STORAGE_KEY)).toBe(true);
    expect(loadStore(kv)).toEqual({ kind: "ok", store: s });
  });
  it("empty when nothing is saved", () => { expect(loadStore(fakeKV())).toEqual({ kind: "empty" }); });
  it("reports a failed save instead of throwing", () => {
    const kv = { ...fakeKV(), setItem: () => { throw new Error("QuotaExceededError"); } };
    expect(saveStore(kv, emptyStore())).toEqual({ ok: false, error: "QuotaExceededError" });
  });
  it("reports unavailable storage on load", () => {
    const kv = { ...fakeKV(), getItem: () => { throw new Error("denied"); } };
    expect(loadStore(kv).kind).toBe("unavailable");
  });
  it("migrate leaves a version 1 store unchanged", () => {
    const s = sample();
    expect(migrate(s)).toBe(s);
    expect(migrate(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});

describe("import / validation", () => {
  it("rejects malformed text", () => {
    expect(parseStoreText("not json").kind).toBe("invalid");
    expect(parseStoreText("[]").kind).toBe("invalid");
    expect(parseStoreText("{}").kind).toBe("invalid");
  });
  it("rejects bad shapes", () => {
    const bad = (mut: (s: any) => void) => { const s: any = JSON.parse(JSON.stringify(sample())); mut(s); return parseStoreText(JSON.stringify(s)).kind; };
    expect(bad((s) => { s.students[0].goals[0].dataPoints[0].value = "12"; })).toBe("invalid");
    expect(bad((s) => { s.students[0].dates.lastIepMeeting = "2026-02-30"; })).toBe("invalid");
    expect(bad((s) => { s.calendar[0].start = "2028-01-01"; })).toBe("invalid");
    expect(bad((s) => { delete s.calendar; })).toBe("invalid");
    expect(bad((s) => { s.students[0].goals[0].dismissedFlags = [1]; })).toBe("invalid");
  });
  it("rejects a newer schemaVersion without touching it", () => {
    const text = JSON.stringify({ ...sample(), schemaVersion: 2 });
    expect(parseStoreText(text)).toEqual({ kind: "newer", raw: text });
    const kv = fakeKV({ [STORAGE_KEY]: text });
    expect(loadStore(kv).kind).toBe("newer");
    expect(kv.m.get(STORAGE_KEY)).toBe(text);
  });
  it("accepts a valid file", () => {
    expect(validateStore(sample()).ok).toBe(true);
    expect(parseStoreText(JSON.stringify(sample())).kind).toBe("ok");
  });
});
