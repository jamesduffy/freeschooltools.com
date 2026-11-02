import { describe, expect, it } from "vitest";
import { addAmount, checkCustom, checkFields, editGarden, emptyStore, addGardenToStore, moveToShelf, newGarden, setTotal, undoLast, LIMITS, type Garden } from "../src/garden/model";
import { announceText, arrivedCreatures, bonusBlooms, bonusGrowth, growth, growthAt, percentOf, plantShape, progressText, reached, spotGrowths } from "../src/garden/growth";
import { FLOWERS } from "../src/garden/theme";

const T = "2026-11-01";
const mk = (goal = 500, extra: Partial<Garden> = {}): Garden => ({ ...newGarden({ name: "Our reading garden", unit: "books read", goal }, "g1", T), ...extra });

describe("growth(i)", () => {
  it("is 0 at the start", () => { for (let i = 0; i < 12; i++) expect(growth(i, 0)).toBe(0); });
  it("rises smoothly and never falls", () => {
    for (let i = 0; i < 12; i++) {
      let prev = -1;
      for (let p = 0; p <= 1.2; p += 0.005) { const g = growth(i, p); expect(g).toBeGreaterThanOrEqual(prev); expect(g).toBeGreaterThanOrEqual(0); expect(g).toBeLessThanOrEqual(1); prev = g; }
    }
  });
  it("starts at i*5 percent", () => {
    expect(growth(3, 0.15)).toBe(0);
    expect(growth(3, 0.35)).toBeCloseTo(0.5, 9);
  });
  it("spot 0 is full at 40 percent and spot 11 at 95 percent, not before", () => {
    expect(growth(0, 0.4)).toBe(1);
    expect(growth(0, 0.39)).toBeLessThan(1);
    expect(growth(11, 0.95)).toBe(1);
    expect(growth(11, 0.94)).toBeLessThan(1);
    expect(growthAt(0, 40, 100)).toBe(1);
    expect(growthAt(11, 95, 100)).toBe(1);
    expect(growthAt(11, 94, 100)).toBeLessThan(1);
    expect(spotGrowths(95, 100).every((g) => g === 1)).toBe(true);
  });
  it("integer math and float math agree", () => {
    for (const goal of [1, 7, 50, 500, 5000, 100000]) for (const t of [0, 1, Math.floor(goal / 3), goal, goal * 2]) for (let i = 0; i < 12; i++)
      expect(growthAt(i, t, goal)).toBeCloseTo(growth(i, t / goal), 8);
  });
  it("plant shape moves for any change in growth, and is full at 1", () => {
    expect(plantShape(0).stem).toBe(0);
    expect(plantShape(1)).toEqual({ stem: 1, headScale: 1, headOpacity: 1, bloom: 1 });
    for (let g = 0; g < 0.99; g += 0.01) {
      const a = plantShape(g), b = plantShape(g + 0.01);
      expect(a.stem + a.headScale + a.bloom + a.headOpacity).toBeLessThan(b.stem + b.headScale + b.bloom + b.headOpacity);
    }
  });
});

describe("goals of 1 and 100000", () => {
  it("work, and the total can pass the goal", () => {
    let g = mk(1);
    const r = addAmount(g, 1, T)!;
    expect(r.finishedNow).toBe(true);
    g = r.garden;
    expect(spotGrowths(g.total, g.goal).every((x) => x === 1)).toBe(true);
    g = addAmount(g, 10, T)!.garden;
    expect(g.total).toBe(11);
    expect(percentOf(g.total, g.goal)).toBe(1100);
    expect(bonusBlooms(g.total, g.goal, FLOWERS.bonus)).toBe(3);
    const big = mk(100000);
    const b = addAmount(big, 10, T)!.garden;
    expect(growthAt(0, b.total, b.goal)).toBeCloseTo(10 / 100000 * 100 / 40, 9);
    expect(setTotal(big, 250000, T)!.garden.total).toBe(250000);
    expect(percentOf(250000, 100000)).toBe(250);
  });
  it("accepts only goals from 1 to 100000", () => {
    const f = (goal: string | number) => checkFields({ name: "a", unit: "b", goal }).ok;
    expect(f(1)).toBe(true); expect(f("100000")).toBe(true); expect(f("1,000")).toBe(true);
    expect(f(0)).toBe(false); expect(f(100001)).toBe(false); expect(f("1.5")).toBe(false); expect(f("")).toBe(false); expect(f("abc")).toBe(false); expect(f(-4)).toBe(false);
  });
});

describe("creatures", () => {
  const at = (total: number, goal = 100) => arrivedCreatures(total, goal, FLOWERS.creatures);
  it("every creature arrives exactly at its percent and not before", () => {
    for (const c of FLOWERS.creatures) {
      expect(at(c.percent - 1)[c.kind], c.kind).toBeUndefined();
      expect(at(c.percent)[c.kind], c.kind).toBe(c.count);
    }
    expect(at(0)).toEqual({});
  });
  it("the original four still arrive at 20, 45, 65 and 85 percent", () => {
    const pct = (kind: string) => FLOWERS.creatures.find((c) => c.kind === kind)?.percent;
    expect([pct("ladybug"), pct("butterfly"), pct("bee"), pct("hummingbird")]).toEqual([20, 45, 65, 85]);
  });
  it("are listed in order of arrival, each kind once", () => {
    const ps = FLOWERS.creatures.map((c) => c.percent);
    expect(ps).toEqual([...ps].sort((a, b) => a - b));
    expect(new Set(FLOWERS.creatures.map((c) => c.kind)).size).toBe(FLOWERS.creatures.length);
    expect(FLOWERS.creatures.length).toBe(16);
  });
  it("hold for other goals, with no rounding trouble", () => {
    expect(at(49, 500)).toEqual({}); // firefly is at 10 percent: 50 of 500
    expect(at(50, 500)).toEqual({ firefly: 3 });
    expect(at(100, 500).ladybug).toBe(2);
    expect(at(99, 500).ladybug).toBeUndefined();
    expect(at(225, 500).butterfly).toBe(2);
    expect(at(224, 500).butterfly).toBeUndefined();
    expect(reached(7, 35, 20)).toBe(true);
    expect(reached(6, 35, 20)).toBe(false);
    expect(Object.keys(at(1, 1)).length).toBe(FLOWERS.creatures.length);
  });
  it("bonus blooms appear at 110, 125 and 150 percent and then stop", () => {
    const b = (t: number) => bonusBlooms(t, 100, FLOWERS.bonus);
    expect([b(100), b(109), b(110), b(124), b(125), b(149), b(150), b(900)]).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(bonusGrowth(0, 109, 100, FLOWERS.bonus)).toBe(0);
    expect(bonusGrowth(0, 110, 100, FLOWERS.bonus)).toBeGreaterThan(0);
    expect(bonusGrowth(0, 120, 100, FLOWERS.bonus)).toBe(1);
  });
});

describe("add, undo, set total", () => {
  it("adds and records amounts, newest last", () => {
    let g = mk();
    g = addAmount(g, 1, T)!.garden; g = addAmount(g, 5, T)!.garden; g = addAmount(g, 10, T)!.garden;
    expect(g.total).toBe(16);
    expect(g.recent).toEqual([1, 5, 10]);
  });
  it("rejects bad amounts", () => {
    const g = mk();
    for (const n of [0, -1, 1.5, NaN, Infinity]) expect(addAmount(g, n, T)).toBeNull();
  });
  it("undo removes the most recent amount and says what", () => {
    let g = mk();
    g = addAmount(g, 5, T)!.garden; g = addAmount(g, 10, T)!.garden;
    const u = undoLast(g)!;
    expect(u.removed).toBe(10); expect(u.garden.total).toBe(5); expect(u.garden.recent).toEqual([5]);
    expect(undoLast(undoLast(u.garden)!.garden)).toBeNull();
  });
  it("keeps only the last 20 amounts", () => {
    let g = mk(); for (let i = 1; i <= 25; i++) g = addAmount(g, i, T)!.garden;
    expect(g.recent.length).toBe(20);
    expect(g.recent[19]).toBe(25);
    expect(g.recent[0]).toBe(6);
  });
  it("the total never goes below 0", () => {
    const g = mk(500, { total: 3, recent: [10] });
    expect(undoLast(g)!.garden.total).toBe(0);
    expect(setTotal(g, -1, T)).toBeNull();
    expect(setTotal(g, 2.5, T)).toBeNull();
    expect(setTotal(g, 0, T)!.garden.total).toBe(0);
  });
  it("set total clears recent, so Undo is then off", () => {
    let g = mk(); g = addAmount(g, 5, T)!.garden;
    const s = setTotal(g, 42, T)!.garden;
    expect(s.total).toBe(42); expect(s.recent).toEqual([]); expect(undoLast(s)).toBeNull();
  });
  it("custom amount is 1 up to the goal", () => {
    const g = mk(50);
    expect(checkCustom("50", g).ok).toBe(true);
    expect(checkCustom("51", g).ok).toBe(false);
    expect(checkCustom("0", g).ok).toBe(false);
    expect(checkCustom("x", g).ok).toBe(false);
    expect(checkCustom("", g).ok).toBe(false);
    expect(checkCustom("12", mk(1)).ok).toBe(false);
  });
  it("edit goal recalculates and loses nothing", () => {
    let g = mk(); g = addAmount(g, 100, T)!.garden;
    const e = editGarden(g, { name: "New", unit: "pages", goal: 200 }, T).garden;
    expect(e.total).toBe(100); expect(e.recent).toEqual([100]); expect(percentOf(e.total, e.goal)).toBe(50);
  });
});

describe("the celebration is recorded once", () => {
  it("finishedOn is set the first time total reaches goal and never again", () => {
    let g = mk(10);
    expect(addAmount(g, 9, T)!.finishedNow).toBe(false);
    const a = addAmount(g, 10, "2026-11-02")!;
    expect(a.finishedNow).toBe(true); expect(a.garden.finishedOn).toBe("2026-11-02");
    const un = undoLast(a.garden)!.garden;
    expect(un.total).toBe(0); expect(un.finishedOn).toBe("2026-11-02");
    const again = addAmount(un, 10, "2026-12-01")!;
    expect(again.finishedNow).toBe(false); expect(again.garden.finishedOn).toBe("2026-11-02");
    expect(setTotal(un, 99, "2027-01-01")!.finishedNow).toBe(false);
  });
  it("set total and edit goal can reach the goal too", () => {
    expect(setTotal(mk(10), 10, T)!.finishedNow).toBe(true);
    const g = mk(100, { total: 50 });
    expect(editGarden(g, { name: "x", unit: "y", goal: 50 }, T).finishedNow).toBe(true);
  });
});

describe("limits and the shelf", () => {
  it("allows at most 6 active gardens with a plain message", () => {
    let s = emptyStore();
    for (let i = 0; i < LIMITS.active; i++) { const r = addGardenToStore(s, mk(10, { id: `g${i}` })); expect(r.ok).toBe(true); if (r.ok) s = r.store; }
    const r = addGardenToStore(s, mk(10, { id: "x" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/6 active gardens/);
  });
  it("moves only finished gardens to the shelf, and holds at most 50", () => {
    let s = { ...emptyStore(), gardens: [mk(10, { id: "a" }), mk(10, { id: "b", finishedOn: T, total: 10 })] };
    expect(moveToShelf(s, "a").ok).toBe(false);
    const r = moveToShelf(s, "b");
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.store.gardens.map((g) => g.id)).toEqual(["a"]); expect(r.store.shelf.map((g) => g.id)).toEqual(["b"]); s = r.store; }
    const full = { ...s, shelf: Array.from({ length: 50 }, (_, i) => mk(10, { id: `s${i}`, finishedOn: T })), gardens: [mk(10, { id: "c", finishedOn: T })] };
    const f = moveToShelf(full, "c");
    expect(f.ok).toBe(false);
    if (!f.ok) expect(f.message).toMatch(/50/);
  });
});

describe("text", () => {
  it("shows progress in words", () => {
    expect(progressText(240, 500, "books read")).toBe("240 of 500 books read");
    expect(announceText(240, 500, "books read")).toBe("240 of 500 books read. 48 percent.");
    expect(progressText(1240, 5000, "minutes of kindness")).toBe("1,240 of 5,000 minutes of kindness");
    expect(percentOf(499, 500)).toBe(99);
  });
  it("trims and limits names and units", () => {
    expect(checkFields({ name: "  Our   garden ", unit: "books", goal: 5 })).toEqual({ ok: true, value: { name: "Our garden", unit: "books", goal: 5 } });
    const r = checkFields({ name: "x".repeat(31), unit: "y".repeat(21), goal: 5 });
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.errors.name).toBeTruthy(); expect(r.errors.unit).toBeTruthy(); }
    expect(checkFields({ name: "", unit: "", goal: 5 }).ok).toBe(false);
  });
});
