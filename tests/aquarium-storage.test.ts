import { describe, expect, it } from "vitest";
import { STORAGE_KEY, defaultStore, deleteAllToolKeys, loadStore, saveStore, validateStore } from "../src/aquarium/storage";
import { fakeKV } from "./helpers";

describe("aquarium storage", () => {
  it("uses a key that starts with aquarium.", () => { expect(STORAGE_KEY).toBe("aquarium.v1"); });
  it("round-trips", () => {
    const kv = fakeKV();
    const s = defaultStore();
    s.settings.session = "long"; s.settings.showMeter = true; s.settings.sensitivityDb = 8;
    s.discovered = ["minnows", "seahorse"]; s.tank = { bank: 321.5, arrived: 3 };
    expect(saveStore(kv, s)).toBe(true);
    expect(loadStore(kv)).toEqual({ kind: "ok", store: s });
  });
  it("starts with defaults when empty", () => { expect(loadStore(fakeKV())).toEqual({ kind: "empty", store: defaultStore() }); });
  it("falls back to defaults for corrupted text without throwing", () => {
    for (const raw of ["not json", "{", "null", "42", "[]", '"x"']) {
      const r = loadStore(fakeKV({ [STORAGE_KEY]: raw }));
      expect(r.store).toEqual(defaultStore());
    }
  });
  it("repairs bad fields one by one", () => {
    const s = validateStore({ settings: { sensitivityDb: 400, session: "forever", showMeter: "yes" }, discovered: ["minnows", "dragon", 4, "minnows"], tank: { bank: -5, arrived: 99 } })!;
    expect(s.settings.sensitivityDb).toBe(18);
    expect(s.settings.session).toBe("standard");
    expect(s.settings.showMeter).toBe(false);
    expect(s.discovered).toEqual(["minnows"]);
    expect(s.tank).toEqual({ bank: 0, arrived: 8 });
  });
  it("leaves newer versions alone as defaults", () => {
    expect(loadStore(fakeKV({ [STORAGE_KEY]: JSON.stringify({ schemaVersion: 9, tank: { bank: 5, arrived: 1 } }) })).kind).toBe("invalid");
  });
  it("copes with storage that throws", () => {
    const bad = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("full"); }, removeItem: () => {} };
    expect(loadStore(bad).kind).toBe("unavailable");
    expect(saveStore(bad, defaultStore())).toBe(false);
    expect(loadStore(null).store).toEqual(defaultStore());
    expect(saveStore(null, defaultStore())).toBe(false);
  });
  it("stores no loudness or microphone data", () => {
    const text = JSON.stringify(defaultStore()).toLowerCase();
    for (const w of ["loudness", "level", "audio", "baseline", "threshold"]) expect(text.includes(`"${w}`)).toBe(false);
    expect(Object.keys(defaultStore()).sort()).toEqual(["discovered", "schemaVersion", "settings", "tank"]);
    expect(Object.keys(defaultStore().tank).sort()).toEqual(["arrived", "bank"]);
  });
  it("delete removes only aquarium. keys", () => {
    const m = new Map([["aquarium.v1", "a"], ["aquarium.other", "b"], ["iepkit.v1", "c"], ["theme", "d"]]);
    const storage = { get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, removeItem: (k: string) => void m.delete(k) } as unknown as Storage;
    deleteAllToolKeys(storage);
    expect([...m.keys()].sort()).toEqual(["iepkit.v1", "theme"]);
  });
});
