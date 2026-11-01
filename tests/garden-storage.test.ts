import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { addAmount, emptyStore, newGarden, STORAGE_KEY, validateGarden, type Garden, type Store } from "../src/garden/model";
import { deleteAllToolKeys, exportFileName, exportGardenText, loadStore, parseGardenFile, parseStoreText, saveStore } from "../src/garden/storage";
import { fakeKV } from "./helpers";

const T = "2026-11-01";
const g1 = (): Garden => addAmount(newGarden({ name: "Our reading garden", unit: "books read", goal: 500 }, "a1", T), 240, T)!.garden;
const sample = (): Store => ({ ...emptyStore(), gardens: [g1()], shelf: [{ ...newGarden({ name: "Kind", unit: "acts", goal: 10 }, "s1", T), total: 10, finishedOn: "2026-10-05", recent: [] }], settings: { showNumbers: false, sound: "chime", volume: 0.3, keepScreenAwake: true } });

describe("garden storage", () => {
  it("round-trips through save and load", () => {
    const kv = fakeKV(); const s = sample();
    expect(saveStore(kv, s)).toEqual({ ok: true });
    expect(kv.m.has(STORAGE_KEY)).toBe(true);
    expect(STORAGE_KEY).toBe("garden.v1");
    expect(loadStore(kv)).toEqual({ kind: "ok", store: s });
  });
  it("works with empty storage", () => { expect(loadStore(fakeKV())).toEqual({ kind: "empty" }); });
  it("reports a failed save and an unavailable store instead of throwing", () => {
    expect(saveStore({ ...fakeKV(), setItem: () => { throw new Error("QuotaExceededError"); } }, emptyStore())).toEqual({ ok: false, error: "QuotaExceededError" });
    expect(loadStore({ ...fakeKV(), getItem: () => { throw new Error("denied"); } }).kind).toBe("unavailable");
  });
  it("corrupted data is reported as invalid, with the raw text kept, so the app can fall back to defaults", () => {
    for (const raw of ["not json", "[]", "{}", "null", '{"schemaVersion":1}', '{"schemaVersion":1,"gardens":"x","shelf":[]}']) {
      const r = loadStore(fakeKV({ [STORAGE_KEY]: raw }));
      expect(r.kind).toBe("invalid");
      if (r.kind === "invalid") expect(r.raw).toBe(raw);
    }
  });
  it("rejects bad gardens inside a store", () => {
    const bad = (mut: (s: any) => void) => { const s: any = JSON.parse(JSON.stringify(sample())); mut(s); return parseStoreText(JSON.stringify(s)).kind; };
    expect(bad((s) => { s.gardens[0].goal = 0; })).toBe("invalid");
    expect(bad((s) => { s.gardens[0].goal = 100001; })).toBe("invalid");
    expect(bad((s) => { s.gardens[0].total = -1; })).toBe("invalid");
    expect(bad((s) => { s.gardens[0].total = 1.5; })).toBe("invalid");
    expect(bad((s) => { s.gardens[0].theme = "trees"; })).toBe("invalid");
    expect(bad((s) => { s.gardens[0].createdOn = "2026-02-30"; })).toBe("invalid");
    expect(bad((s) => { s.gardens[0].recent = new Array(21).fill(1); })).toBe("invalid");
    expect(bad((s) => { s.gardens[0].recent = [0]; })).toBe("invalid");
    expect(bad((s) => { s.gardens[0].name = "x".repeat(31); })).toBe("invalid");
    expect(bad((s) => { s.gardens[0].studentName = "Sam"; })).toBe("invalid");
    expect(bad((s) => { s.shelf[0].id = s.gardens[0].id; })).toBe("invalid");
    expect(bad((s) => { s.gardens = new Array(7).fill(0).map((_, i) => ({ ...s.gardens[0], id: "x" + i })); })).toBe("invalid");
  });
  it("odd settings fall back to defaults", () => {
    const s: any = JSON.parse(JSON.stringify(sample())); s.settings = { showNumbers: "yes", sound: "loud", volume: 9 };
    const r = parseStoreText(JSON.stringify(s));
    expect(r.kind === "ok" && r.store.settings).toEqual({ showNumbers: true, sound: "off", volume: 0.5, keepScreenAwake: false });
  });
  it("a newer version is left alone", () => {
    const text = JSON.stringify({ ...sample(), schemaVersion: 2 });
    expect(parseStoreText(text)).toEqual({ kind: "newer", raw: text });
  });
  it("delete removes only garden. keys", () => {
    const m = new Map<string, string>([["garden.v1", "x"], ["garden.backup", "y"], ["iepkit.v1", "keep"], ["other", "keep"]]);
    const st = { get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, removeItem: (k: string) => void m.delete(k) } as unknown as Storage;
    deleteAllToolKeys(st);
    expect([...m.keys()].sort()).toEqual(["iepkit.v1", "other"]);
  });
});

describe("garden export and import", () => {
  it("round-trips one garden", () => {
    const g = g1();
    const text = exportGardenText(g);
    expect(parseGardenFile(text)).toEqual({ ok: true, garden: g });
    expect(exportFileName(g)).toBe("garden-our-reading-garden.json");
    expect(exportFileName({ ...g, name: "!!!" })).toBe("garden-garden.json");
  });
  it("validates what comes in", () => {
    const g = g1(); const wrap = (o: object) => JSON.stringify({ kind: "class-garden", schemaVersion: 1, garden: g, ...o });
    expect(parseGardenFile("nope").ok).toBe(false);
    expect(parseGardenFile("[]").ok).toBe(false);
    expect(parseGardenFile("{}").ok).toBe(false);
    expect(parseGardenFile(wrap({ kind: "other" })).ok).toBe(false);
    expect(parseGardenFile(wrap({ schemaVersion: 2 })).ok).toBe(false);
    expect(parseGardenFile(wrap({ schemaVersion: "1" })).ok).toBe(false);
    expect(parseGardenFile(wrap({ garden: { ...g, goal: -5 } })).ok).toBe(false);
    expect(parseGardenFile(wrap({ garden: { ...g, extra: "x" } })).ok).toBe(false);
    expect(parseGardenFile(wrap({ garden: { ...g, total: "5" } })).ok).toBe(false);
    expect(parseGardenFile(wrap({ garden: null })).ok).toBe(false);
    expect(parseGardenFile("x".repeat(200_000)).ok).toBe(false);
    expect(parseGardenFile(wrap({})).ok).toBe(true);
  });
  it("validateGarden drops nothing and accepts a finished garden", () => {
    const g = { ...g1(), finishedOn: "2026-11-02" };
    const r = validateGarden(g);
    expect(r.ok && r.garden).toEqual(g);
  });
});

describe("scope: no person fields, no network", () => {
  const dir = join(import.meta.dirname, "../src/garden");
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts")).map((f) => ({ f, text: readFileSync(join(dir, f), "utf8") }));
  it("finds source files", () => { expect(files.length).toBeGreaterThan(8); });
  it("has no network calls", () => {
    const re = /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|navigator\.connection|importScripts|https?:\/\/(?!www\.w3\.org)/;
    for (const { f, text } of files) expect(re.test(text), f).toBe(false);
  });
  it("has no field for a person's name, a contributor or a ranking", () => {
    const re = /\b(student|pupil|child|person|people|user|contributor|author|firstName|lastName|fullName|leaderboard|ranking|rank|score|who)\w*\s*\??\s*[:=]/i;
    for (const { f, text } of files) expect(re.test(text), f).toBe(false);
    expect(Object.keys(g1()).sort()).toEqual(["createdOn", "goal", "id", "name", "recent", "theme", "total", "unit"]);
  });
  it("only uses localStorage keys that start with garden.", () => {
    for (const { f, text } of files) for (const m of text.matchAll(/(?:getItem|setItem|removeItem)\(\s*["'`]([^"'`]+)/g)) expect(m[1]!.startsWith("garden."), f).toBe(true);
  });
});
