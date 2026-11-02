// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createScene } from "../src/garden/scene";
import { SYMBOL_IDS } from "../src/garden/art-flowers";
import { FLOWERS } from "../src/garden/theme";
import { bonusLayout, plantLayout, plants } from "../src/garden/layout";

const visible = (svg: Element, sel: string) => [...svg.querySelectorAll(sel)].filter((e) => !e.classList.contains("off")).length;

describe("flowers scene", () => {
  it("defines every flower and creature once as a symbol under 3 KB", () => {
    createScene(FLOWERS);
    for (const id of SYMBOL_IDS) {
      const els = document.querySelectorAll(`[id="${id}"]`);
      expect(els.length, id).toBe(1);
      expect(new XMLSerializer().serializeToString(els[0]!).length, id).toBeLessThan(3000);
    }
  });
  it("has 12 plant spots with four flower types, each different from its neighbour", () => {
    const ps = plants();
    expect(new Set(ps.map((p) => p.type)).size).toBe(4);
    expect(new Set(ps.map((p) => p.x)).size).toBe(12);
    expect(plantLayout(3).stem).toBeGreaterThan(0);
    expect(bonusLayout(2).y).toBeLessThan(900);
    const s = createScene(FLOWERS);
    expect(s.el.querySelectorAll(".cg-plant").length).toBe(15);
  });
  const upTo = (pct: number) => FLOWERS.creatures.filter((c) => c.percent <= pct).reduce((n, c) => n + c.count, 0);
  it("shows creatures only from their milestone, and reports arrivals", () => {
    const s = createScene(FLOWERS);
    s.update(0, 100);
    expect(visible(s.el, ".cg-critter")).toBe(0);
    expect(s.update(9, 100, { animate: true }).arrived).toEqual([]);
    expect(s.update(10, 100, { animate: true }).arrived).toEqual(["firefly"]);
    expect(visible(s.el, ".cg-critter")).toBe(upTo(10));
    expect(s.update(19, 100, { animate: true }).arrived).toEqual(["caterpillar"]);
    expect(s.update(20, 100, { animate: true }).arrived).toEqual(["ladybug"]);
    expect(s.update(45, 100, { animate: true }).arrived).toContain("butterfly");
    expect(s.update(65, 100, { animate: true }).arrived).toContain("bee");
    expect(s.update(85, 100, { animate: true }).arrived).toEqual(["bat", "bluebird", "owl", "hummingbird"]);
    expect(visible(s.el, ".cg-critter")).toBe(upTo(100));
    s.update(80, 100);
    expect(visible(s.el, ".cg-critter")).toBe(upTo(80));
  });
  it("does not announce creatures that were already there on load", () => {
    const s = createScene(FLOWERS);
    expect(s.update(90, 100, { animate: true }).arrived).toEqual([]);
    expect(visible(s.el, ".cg-critter")).toBe(upTo(90));
  });
  it("adds bonus blooms at 110, 125 and 150 percent", () => {
    const s = createScene(FLOWERS);
    s.update(100, 100);
    expect(visible(s.el, ".cg-plant")).toBe(12);
    expect(s.update(110, 100).bonusAppeared).toBe(true);
    expect(visible(s.el, ".cg-plant")).toBe(13);
    s.update(125, 100); s.update(150, 100); s.update(900, 100);
    expect(visible(s.el, ".cg-plant")).toBe(15);
  });
  it("moves a plant on every change in the total", () => {
    const s = createScene(FLOWERS);
    s.update(0, 50);
    const stem = () => (s.el.querySelector(".cg-plant .cg-sway > .cg-t") as SVGElement).style.transform;
    const seen = new Set<string>();
    for (let t = 0; t <= 20; t++) { s.update(t, 50); seen.add(stem()); }
    expect(seen.size).toBeGreaterThan(5);
  });
  it("keeps moving elements under 60 even during the celebration", () => {
    const s = createScene(FLOWERS);
    s.update(200, 100); s.celebrate();
    const moving = s.el.querySelectorAll(".cg-sway:not(.off *):not(.rest *), .cg-cloud, .cg-rays, .cg-flap-x, .cg-flap-y, .cg-flap-r, .cg-loop:not(.rest *), .cg-petal");
    const out = ".cg-critter:not(.off):not(.rest)";
    const critterInner = [...s.el.querySelectorAll(`${out} .cg-flap-x, ${out} .cg-flap-y, ${out} .cg-flap-r`)].length;
    const count = visible(s.el, ".cg-plant") + 3 + 1 + critterInner + s.el.querySelectorAll(out).length + s.el.querySelectorAll(".cg-petal").length;
    expect(count).toBeLessThan(60);
    expect(moving.length).toBeGreaterThan(0);
  });
  it("a still preview has no animation class driving motion", () => {
    expect(createScene(FLOWERS, { still: true }).el.classList.contains("still")).toBe(true);
  });
});
