import { describe, expect, it } from "vitest";
import { FLEE_MULTIPLIER, isOffscreen, sendAway, scareFish, scareWalker, stepFish, stepWalker, type Bounds, type Fish, type Walker } from "../src/fishtank/sim";

const b: Bounds = { w: 800, h: 600, floorTop: 480 };
const fish = (o: Partial<Fish> = {}): Fish => ({ x: 400, y: 200, vx: 0, vy: 0, cruise: 60, half: { w: 30, h: 15 }, tx: 400, ty: 200, retarget: 5, upright: false, ...o });
const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]!; };
const speed = (f: Fish) => Math.hypot(f.vx, f.vy);

describe("fish", () => {
  it("a tap sends nearby fish directly away, fast", () => {
    const f = fish();
    expect(scareFish(f, 300, 200, 300)).toBe(true);
    expect(f.vx).toBeGreaterThan(0);
    expect(Math.abs(f.vy)).toBeLessThan(1e-9);
    expect(speed(f)).toBeGreaterThan(f.cruise * 3);
    expect(speed(f)).toBeLessThanOrEqual(f.cruise * FLEE_MULTIPLIER + 1e-9);
  });
  it("fish outside the radius are not scared; closer fish go faster", () => {
    expect(scareFish(fish(), 0, 0, 100)).toBe(false);
    const near = fish(), far = fish();
    scareFish(near, 380, 200, 400); scareFish(far, 100, 200, 400);
    expect(speed(near)).toBeGreaterThan(speed(far));
  });
  it("a fish exactly under the tap still picks a direction", () => {
    const f = fish(); scareFish(f, 400, 200, 300, 1, seq(0.25));
    expect(speed(f)).toBeGreaterThan(f.cruise);
  });
  it("repeated taps never exceed the top speed", () => {
    const f = fish(); for (let i = 0; i < 20; i++) scareFish(f, 390, 200, 300);
    expect(speed(f)).toBeLessThanOrEqual(f.cruise * FLEE_MULTIPLIER + 1e-6);
  });
  it("calms back down to cruise speed within a few seconds", () => {
    const f = fish({ tx: 700, ty: 200, retarget: 100 });
    scareFish(f, 300, 200, 300);
    for (let t = 0; t < 4; t += 1 / 60) stepFish(f, 1 / 60, b);
    expect(speed(f)).toBeLessThan(f.cruise * 1.5);
  });
  it("never leaves the tank or goes below the sand, even when scared at a wall", () => {
    const f = fish({ x: 40, y: 470 });
    for (let i = 0; i < 600; i++) { if (i % 30 === 0) scareFish(f, f.x + 20, f.y - 20, 300); stepFish(f, 1 / 60, b); }
    expect(f.x).toBeGreaterThanOrEqual(f.half.w); expect(f.x).toBeLessThanOrEqual(b.w - f.half.w);
    expect(f.y).toBeGreaterThanOrEqual(0); expect(f.y + f.half.h).toBeLessThanOrEqual(b.floorTop + 1e-6);
  });
  it("followers head for their leader's offset", () => {
    const leader = fish({ x: 600, y: 300, tx: 600, ty: 300, retarget: 100 });
    const f = fish({ x: 100, y: 100, follow: { leader: 0, dx: -20, dy: 0 } });
    const all = [leader, f];
    for (let i = 0; i < 600; i++) stepFish(f, 1 / 60, b, all);
    expect(Math.hypot(f.x - 580, f.y - 300)).toBeLessThan(40);
  });
});

describe("fish coming and going", () => {
  it("a fish sent away swims off the screen and is not stopped by the wall", () => {
    const f = fish({ x: 700, y: 200, tx: 700, ty: 200, retarget: 100 });
    sendAway(f, b);
    expect(f.exitX).toBeGreaterThan(b.w);
    for (let i = 0; i < 60 * 20 && !isOffscreen(f, b); i++) stepFish(f, 1 / 60, b);
    expect(isOffscreen(f, b)).toBe(true);
  });
  it("leaves by the nearest side", () => {
    const l = fish({ x: 100 }); sendAway(l, b); expect(l.exitX).toBeLessThan(0);
  });
  it("a fish starting off screen swims in, then is held inside the walls like any other", () => {
    const f = fish({ x: -60, y: 200, tx: 400, ty: 200, retarget: 100, mode: "in" });
    expect(isOffscreen(f, b)).toBe(true);
    for (let i = 0; i < 60 * 15 && f.mode; i++) stepFish(f, 1 / 60, b);
    expect(f.mode).toBeUndefined();
    expect(isOffscreen(f, b)).toBe(false);
    for (let i = 0; i < 600; i++) stepFish(f, 1 / 60, b);
    expect(f.x).toBeGreaterThanOrEqual(f.half.w);
  });
  it("an arriving fish keeps its heading until it is inside, ignoring retarget timers", () => {
    const f = fish({ x: -80, tx: 400, retarget: 0, mode: "in" });
    stepFish(f, 1 / 60, b);
    expect(f.tx).toBe(400);
  });
});

const walker = (o: Partial<Walker> = {}): Walker => ({ kind: "crab", x: 400, y: 0.5, dir: 1, state: "walk", timer: 5, walk: 40, runMult: 6, half: 30, ...o });

describe("floor creatures", () => {
  it("walk, stay on screen, and turn at the edges", () => {
    const c = walker({ x: 790, dir: 1, timer: 100 });
    stepWalker(c, 1, b);
    expect(c.x).toBeLessThanOrEqual(b.w - c.half);
    expect(c.dir).toBe(-1);
  });
  it("stop to rest, then walk again", () => {
    const c = walker({ timer: 0.01 });
    stepWalker(c, 0.02, b, seq(0.5));
    expect(c.state).toBe("idle");
    stepWalker(c, 10, b, seq(0.5));
    expect(c.state).toBe("walk");
  });
  it("a tap makes a crab run away fast, then calm down", () => {
    const c = walker();
    expect(scareWalker(c, 300, 480, 400, 480)).toBe(true);
    expect(c.state).toBe("run"); expect(c.dir).toBe(1);
    const x0 = c.x; stepWalker(c, 0.5, b); expect(c.x - x0).toBeGreaterThan(c.walk * 0.5 * 3);
    stepWalker(c, 2, b, seq(0.5)); expect(c.state).not.toBe("run");
  });
  it("a hermit crab hides instead of running", () => {
    const c = walker({ kind: "hermit" });
    scareWalker(c, 400, 480, 400, 480);
    expect(c.state).toBe("hide");
    const x0 = c.x; stepWalker(c, 1, b); expect(c.x).toBe(x0);
  });
  it("far-away creatures ignore the tap", () => {
    expect(scareWalker(walker({ x: 700 }), 50, 50, 200, 480)).toBe(false);
  });
});
