import { describe, expect, it } from "vitest";
import { Diver } from "../src/ocean/diver";
import { PLAY_RADIUS, buildWorld, groundHeight } from "../src/ocean/world";

function run(seed: number, seconds: number, pois: () => { x: number; y: number; z: number; name: string; kind: string; r: number }[] = () => []) {
  const d = new Diver(seed, pois);
  let minClear = 1e9, maxR = 0, maxY = -1e9, maxVy = 0, maxTurn = 0, lingers = 0, travelled = 0;
  let px = d.x, py = d.y, pz = d.z, ph = d.heading, wasSlow = false;
  const grid = new Set<string>();
  for (let i = 0; i < seconds * 30; i++) {
    d.update(1 / 30);
    const v = d.view();
    expect(Number.isFinite(v.x + v.y + v.z + v.yaw + v.pitch + v.roll)).toBe(true);
    minClear = Math.min(minClear, d.y - groundHeight(d.x, d.z));
    maxR = Math.max(maxR, Math.hypot(d.x, d.z)); maxY = Math.max(maxY, d.y);
    if (i > 300) maxVy = Math.max(maxVy, Math.abs(d.y - py) * 30); // ignore the first 10 s, while it settles into the water
    let dh = d.heading - ph; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
    maxTurn = Math.max(maxTurn, Math.abs(dh) * 30);
    travelled += Math.hypot(d.x - px, d.z - pz);
    const slow = d.speed < 0.4; if (slow && !wasSlow) lingers++; wasSlow = slow;
    grid.add(`${Math.floor(d.x / 20)},${Math.floor(d.z / 20)}`);
    px = d.x; py = d.y; pz = d.z; ph = d.heading;
  }
  return { minClear, maxR, maxY, maxVy, maxTurn, lingers, travelled, cells: grid.size };
}

describe("diver camera", () => {
  it("never goes into the floor, out of the reef or up to the surface, for many tours", { timeout: 60000 }, () => {
    for (let seed = 1; seed <= 12; seed++) {
      const r = run(seed, 900);
      expect(r.minClear, `seed ${seed}`).toBeGreaterThan(0.8);
      expect(r.maxR, `seed ${seed}`).toBeLessThanOrEqual(PLAY_RADIUS + 0.01);
      expect(r.maxY, `seed ${seed}`).toBeLessThanOrEqual(-1.8);
    }
  });
  it("moves like a diver: slow, smooth and exploring", () => {
    const r = run(3, 900);
    expect(r.maxVy).toBeLessThan(1.4);          // m/s up or down
    expect(r.maxTurn).toBeLessThan(1.1);        // rad/s
    expect(r.travelled / 900).toBeLessThan(2.3); // average swimming speed, m/s
    expect(r.travelled / 900).toBeGreaterThan(0.5);
    expect(r.cells).toBeGreaterThan(12);        // covers a good part of the reef in 15 minutes
  });
  it("starts gently from the spot the page chooses, in front of the wreck", () => {
    const w = buildWorld().wreck, away = Math.atan2(w.z, w.x);
    const d = new Diver(9, () => [], { x: w.x * 0.45, z: w.z * 0.45 + 6, toX: w.x - Math.cos(away) * 6, toZ: w.z - Math.sin(away) * 6 });
    expect(d.y - groundHeight(d.x, d.z)).toBeGreaterThan(2);
    let py = d.y, vy = 0;
    for (let i = 0; i < 30 * 60; i++) { d.update(1 / 30); vy = Math.max(vy, Math.abs(d.y - py) * 30); py = d.y; }
    expect(vy).toBeLessThan(1.4);
  });
  it("stops to watch things", () => {
    const poi = [{ x: 30, y: -15, z: 10, name: "a thing", kind: "x", r: 5 }, { x: -30, y: -15, z: -20, name: "another", kind: "x", r: 5 }, { x: 5, y: -15, z: 40, name: "third", kind: "x", r: 5 }];
    expect(run(5, 1200, () => poi).lingers).toBeGreaterThan(0);
  });
  it("can be nudged to look around and drifts back", () => {
    const d = new Diver(2);
    d.nudge(1, 0.3);
    expect(Math.abs(d.lookYaw)).toBeGreaterThan(0.9);
    for (let i = 0; i < 30 * 20; i++) d.update(1 / 30);
    expect(Math.abs(d.lookYaw)).toBeLessThan(0.05);
  });
  it("does not move while paused", () => {
    const d = new Diver(2); d.paused = true;
    const x = d.x; d.update(1);
    expect(d.x).toBe(x);
  });
});
