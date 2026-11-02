import { describe, expect, it } from "vitest";
import { buildEntries } from "../src/fishtank/guide";
import { FLOOR, ROSTER } from "../src/fishtank/roster";
import { GLOWS, INFO, rarityLabel } from "../src/fishtank/species-info";

describe("species information", () => {
  const ids = [...ROSTER.map((r) => r.id as string), ...FLOOR.map((f) => f.kind as string)];
  it("has a page for every kind in the tank, and nothing extra", () => {
    for (const id of ids) expect(INFO[id], id).toBeDefined();
    expect(Object.keys(INFO).sort()).toEqual([...ids].sort());
  });
  it("every page is filled in", () => {
    for (const [id, f] of Object.entries(INFO)) {
      for (const k of ["name", "sci", "text", "size", "habitat", "diet"] as const) expect(f[k].trim().length, `${id}.${k}`).toBeGreaterThan(2);
      expect(f.text.length, id).toBeLessThan(260);
      expect(["day", "night", "both"]).toContain(f.active);
    }
  });
  it("has plenty of day animals, plenty of night animals, and some that are out at any time", () => {
    const count = (a: string) => Object.values(INFO).filter((f) => f.active === a).length;
    expect(count("day")).toBeGreaterThanOrEqual(12);
    expect(count("night")).toBeGreaterThanOrEqual(8);
    expect(count("both")).toBeGreaterThanOrEqual(10);
  });
  it("has day and night kinds among both the fish and the sand creatures' options", () => {
    expect(INFO.crab!.active).toBe("night");
    expect(INFO.anglerfish!.active).toBe("night");
    expect(INFO.butterflyfish!.active).toBe("day");
  });
  it("labels rarity from the ranks", () => {
    expect(rarityLabel(10)).toBe("Common"); expect(rarityLabel(7)).toBe("Uncommon"); expect(rarityLabel(4)).toBe("Rare");
    expect(rarityLabel(2)).toBe("Very rare"); expect(rarityLabel(1.2)).toBe("Legendary"); expect(rarityLabel(15)).toBe("Common");
  });
  it("glowing animals exist in the tank", () => { for (const g of GLOWS) expect(ids).toContain(g); });
  it("the guide lists everything once, most common first", () => {
    const e = buildEntries();
    expect(e.length).toBe(ids.length);
    expect(new Set(e.map((x) => x.id)).size).toBe(e.length);
    for (let i = 1; i < e.length; i++) expect(e[i - 1]!.rank).toBeGreaterThanOrEqual(e[i]!.rank);
    expect(e[e.length - 1]!.rank).toBeLessThan(2);
  });
  it("some day animals and some night animals can fill the tank at any time", async () => {
    const { isActiveIn } = await import("../src/shared/daynight");
    for (const phase of ["day", "night", "dusk", "dawn"] as const) {
      const usable = ids.filter((id) => isActiveIn(INFO[id]!.active, phase));
      expect(usable.length, phase).toBeGreaterThanOrEqual(14);
    }
  });
});
