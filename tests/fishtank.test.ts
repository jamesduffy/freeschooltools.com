import { describe, expect, it } from "vitest";
import { FLEE_MULTIPLIER, hasExited, isOffscreen, isWalkerOffscreen, scareFish, scareWalker, sendAway, stepFish, stepWalker, walkerExited, type Bounds, type Fish, type Walker } from "../src/fishtank/sim";

const b: Bounds = { w: 800, h: 600, floorTop: 480 };
const fish = (o: Partial<Fish> = {}): Fish => ({ x: 400, y: 200, vx: 0, vy: 0, cruise: 60, half: { w: 30, h: 15 }, heading: 1, ty: 200, retarget: 5, upright: false, ...o });
const speed = (f: Fish) => Math.hypot(f.vx, f.vy);
const run = (f: Fish, secs: number, all: Fish[] = [f]) => { for (let i = 0; i < secs * 60; i++) stepFish(f, 1 / 60, b, all); };

describe("fish cross the tank", () => {
  it("keep their heading all the way across and leave the far side", () => {
    const f = fish({ x: -40, heading: 1, mode: "in" });
    let reversed = false;
    for (let i = 0; i < 60 * 60 && !hasExited(f, b); i++) { stepFish(f, 1 / 60, b); if (f.vx < -1) reversed = true; }
    expect(hasExited(f, b)).toBe(true);
    expect(reversed).toBe(false);
  });
  it("swim the other way when heading left", () => {
    const f = fish({ x: 840, heading: -1, mode: "in" });
    for (let i = 0; i < 60 * 60 && !hasExited(f, b); i++) stepFish(f, 1 / 60, b);
    expect(hasExited(f, b)).toBe(true);
    expect(f.x).toBeLessThan(0);
  });
  it("the sides are open: no bouncing off the edges", () => {
    const f = fish({ x: 770, heading: 1 });
    run(f, 10);
    expect(f.x).toBeGreaterThan(b.w);
  });
  it("up and down drift is gentle and stays between the surface and the sand", () => {
    const f = fish({ x: 100, heading: 1, cruise: 20 });
    let minY = 1e9, maxY = -1e9;
    for (let i = 0; i < 60 * 60 && !hasExited(f, b); i++) { stepFish(f, 1 / 60, b); minY = Math.min(minY, f.y); maxY = Math.max(maxY, f.y); }
    expect(minY).toBeGreaterThanOrEqual(f.half.h);
    expect(maxY + f.half.h).toBeLessThanOrEqual(b.floorTop + 1e-6);
  });
  it("arriving fish clear the 'in' mode once fully inside", () => {
    const f = fish({ x: -50, mode: "in" });
    run(f, 20);
    expect(f.mode).toBeUndefined();
  });
  it("followers trail their leader", () => {
    const leader = fish({ x: 300, y: 300 });
    const f = fish({ x: 100, y: 100, follow: { leader: 0, dx: -20, dy: 0 } });
    const all = [leader, f];
    leader.cruise = 0; // hold the leader still to see the follower settle at its offset
    run(f, 10, all);
    expect(Math.hypot(f.x - 280, f.y - 300)).toBeLessThan(40);
  });
  it("sendAway sends a fish to the chosen side", () => {
    const f = fish({ x: 700, heading: 1 });
    sendAway(f, b, -1);
    expect(f.heading).toBe(-1);
    run(f, 60);
    expect(hasExited(f, b)).toBe(true);
    expect(f.x).toBeLessThan(0);
  });
  it("isOffscreen", () => { expect(isOffscreen(fish({ x: -31 }), b)).toBe(true); expect(isOffscreen(fish({ x: 400 }), b)).toBe(false); });
});

describe("tapping", () => {
  it("sends nearby fish directly away, fast", () => {
    const f = fish({ heading: 1 });
    expect(scareFish(f, 300, 200, 300)).toBe(true);
    expect(f.vx).toBeGreaterThan(0);
    expect(speed(f)).toBeGreaterThan(f.cruise * 3);
    expect(speed(f)).toBeLessThanOrEqual(f.cruise * FLEE_MULTIPLIER + 1e-9);
  });
  it("a tap turns the fish toward the side it flees to, so it keeps going and leaves", () => {
    const f = fish({ x: 300, heading: 1 });
    scareFish(f, 400, 200, 300); // tap to its right: it flees left
    expect(f.heading).toBe(-1);
    run(f, 12);
    expect(hasExited(f, b)).toBe(true);
    expect(f.x).toBeLessThan(0);
  });
  it("a finger drag speeds fish up but does not change where they are heading", () => {
    const f = fish({ x: 300, heading: 1 });
    scareFish(f, 400, 200, 300, 0.55);
    expect(f.heading).toBe(1);
  });
  it("fish outside the radius are not scared; closer fish go faster", () => {
    expect(scareFish(fish(), 0, 0, 100)).toBe(false);
    const near = fish(), far = fish();
    scareFish(near, 380, 200, 400); scareFish(far, 100, 200, 400);
    expect(speed(near)).toBeGreaterThan(speed(far));
  });
  it("repeated taps never exceed the top speed", () => {
    const f = fish(); for (let i = 0; i < 20; i++) scareFish(f, 390, 200, 300);
    expect(speed(f)).toBeLessThanOrEqual(f.cruise * FLEE_MULTIPLIER + 1e-6);
  });
  it("a fish exactly under the tap still picks a direction", () => {
    const f = fish(); scareFish(f, 400, 200, 300, 1, () => 0.25);
    expect(speed(f)).toBeGreaterThan(f.cruise);
  });
  it("calms back down to cruise speed within a few seconds", () => {
    const f = fish({ x: 200, heading: 1 });
    scareFish(f, 100, 200, 300);
    run(f, 4);
    expect(speed(f)).toBeLessThan(f.cruise * 1.6);
  });
});

const walker = (o: Partial<Walker> = {}): Walker => ({ kind: "crab", x: 400, y: 0.5, dir: 1, state: "walk", timer: 5, walk: 40, runMult: 6, half: 30, ...o });
const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]!; };

describe("floor creatures", () => {
  it("cross the sand without turning around, resting now and then, and walk off the far side", () => {
    const c = walker({ x: -30, dir: 1, mode: "in" });
    let turned = false, rested = false;
    for (let i = 0; i < 60 * 120 && !walkerExited(c, b); i++) { const d = c.dir; stepWalker(c, 1 / 60, b, seq(0.5)); if (c.dir !== d) turned = true; if (c.state === "idle") rested = true; }
    expect(walkerExited(c, b)).toBe(true);
    expect(turned).toBe(false);
    expect(rested).toBe(true);
  });
  it("walking left works the same way", () => {
    const c = walker({ x: 830, dir: -1, mode: "in" });
    for (let i = 0; i < 60 * 120 && !walkerExited(c, b); i++) stepWalker(c, 1 / 60, b, seq(0.5));
    expect(c.x).toBeLessThan(0);
  });
  it("the sides are open: no turning at the edge", () => {
    const c = walker({ x: 790, dir: 1, timer: 100 });
    stepWalker(c, 2, b);
    expect(c.dir).toBe(1);
    expect(c.x).toBeGreaterThan(790);
  });
  it("a tap makes a crab run away fast, and it keeps going that way", () => {
    const c = walker();
    expect(scareWalker(c, 300, 480, 400, 480)).toBe(true);
    expect(c.state).toBe("run"); expect(c.dir).toBe(1);
    const x0 = c.x; stepWalker(c, 0.5, b); expect(c.x - x0).toBeGreaterThan(c.walk * 0.5 * 3);
    stepWalker(c, 2, b, seq(0.5)); expect(c.state).not.toBe("run"); expect(c.dir).toBe(1);
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
  it("isWalkerOffscreen", () => { expect(isWalkerOffscreen(walker({ x: -31 }), b)).toBe(true); expect(isWalkerOffscreen(walker({ x: 5 }), b)).toBe(false); });
});
