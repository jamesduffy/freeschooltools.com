import { describe, expect, it } from "vitest";
import { PLAY_RADIUS, buildWorld, groundHeight, INST_STRIDE, KELP_STRIDE } from "../src/ocean/world";

describe("ocean world", () => {
  const world = buildWorld();
  it("has the same floor every time", () => {
    expect(groundHeight(10, 20)).toBe(groundHeight(10, 20));
    const w2 = buildWorld();
    expect(Array.from(w2.kelp.slice(0, 16))).toEqual(Array.from(world.kelp.slice(0, 16)));
  });
  it("keeps the floor below the surface across the play area and rising into walls beyond it", () => {
    let deepest = 0, shallowest = -99;
    for (let a = 0; a < 360; a += 7) for (let d = 0; d <= PLAY_RADIUS; d += 6) {
      const g = groundHeight(Math.cos(a) * d, Math.sin(a) * d);
      deepest = Math.min(deepest, g); shallowest = Math.max(shallowest, g);
      expect(Number.isFinite(g)).toBe(true);
    }
    expect(shallowest).toBeLessThan(-2);
    expect(deepest).toBeGreaterThan(-60);
    expect(deepest).toBeLessThan(-25);
    expect(groundHeight(0, 125)).toBeGreaterThan(0); // wall, so there is no visible edge
  });
  it("places plenty of life, all inside the world", () => {
    expect(world.kelp.length / KELP_STRIDE).toBeGreaterThan(1500);
    expect(world.grass.length).toBeGreaterThan(8 * 3000);
    expect(world.props.branch0.length / INST_STRIDE).toBeGreaterThan(100);
    expect(world.props.barrel.length / INST_STRIDE).toBeGreaterThan(50);
    for (let i = 0; i < world.kelp.length; i += KELP_STRIDE) {
      expect(Math.hypot(world.kelp[i]!, world.kelp[i + 2]!)).toBeLessThan(120);
      expect(world.kelp[i + 3]!).toBeGreaterThan(5);
    }
  });
  it("puts the wreck on the sea floor, not in the walls", () => {
    expect(Math.hypot(world.wreck.x, world.wreck.z)).toBeLessThan(75);
    expect(world.wreck.y).toBeLessThan(-20);
  });
});
