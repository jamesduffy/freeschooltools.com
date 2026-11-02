import { describe, expect, it } from "vitest";
import { ALL_ART, FLOOR_ART } from "../src/fishtank/art";
import { FLOOR, ROSTER } from "../src/fishtank/roster";

describe("fish tank roster", () => {
  it("has a drawing for every kind, and no kind twice", () => {
    const ids = ROSTER.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(ALL_ART[id], id).toBeDefined();
  });
  it("uses every drawing it has", () => {
    expect(new Set(ROSTER.map((r) => r.id))).toEqual(new Set(Object.keys(ALL_ART)));
  });
  it("has at least 44 kinds of fish, across all five rarities", () => {
    expect(ROSTER.length).toBeGreaterThanOrEqual(44);
    expect(new Set(ROSTER.map((r) => r.weight)).size).toBe(5);
  });
  it("rarer kinds have lower weights", () => {
    const w = (id: string) => ROSTER.find((r) => r.id === id)!.weight;
    expect(w("guppy")).toBeGreaterThan(w("triggerfish"));
    expect(w("triggerfish")).toBeGreaterThan(w("moray"));
    expect(w("moray")).toBeGreaterThan(w("greatwhite"));
    expect(w("greatwhite")).toBeGreaterThan(w("bluewhale"));
  });
  it("every drawing is small (under 4 KB) and well formed", () => {
    for (const [id, a] of [...Object.entries(ALL_ART), ...Object.entries(FLOOR_ART)]) {
      expect(a.body.length, id).toBeLessThan(4096);
      expect(a.w, id).toBeGreaterThan(0); expect(a.h, id).toBeGreaterThan(0);
      expect(a.body.split("<g").length - 1, id).toBe(a.body.split("</g>").length - 1);
    }
  });
  it("every school has more than one member and nothing else does", () => {
    for (const r of ROSTER) expect(r.count > 1, r.id).toBe(!!r.school);
  });
  it("floor creatures are all there", () => { expect(FLOOR.map((f) => f.kind).sort()).toEqual(["crab", "hermit", "starfish"]); });
});
