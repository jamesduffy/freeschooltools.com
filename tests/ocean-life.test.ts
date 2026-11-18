import { describe, expect, it } from "vitest";
import { Life } from "../src/ocean/life";
import { PLAY_RADIUS, groundHeight } from "../src/ocean/world";

describe("ocean life", () => {
  it("keeps every animal in the water, off the floor and inside the reef", { timeout: 60000 }, () => {
    const life = new Life(5);
    for (let i = 0; i < 60 * 120; i++) life.update(1 / 30, 0, -15, 0);
    expect(life.fishCount()).toBeGreaterThan(500);
    for (const shape of ["fish", "slender"] as const) {
      const a = life.dyn[shape];
      for (let i = 0; i < life.count[shape]; i++) {
        const x = a[i * 8]!, y = a[i * 8 + 1]!, z = a[i * 8 + 2]!;
        expect(Number.isFinite(x + y + z)).toBe(true);
        expect(y).toBeLessThan(-1.5);
        expect(y).toBeGreaterThan(groundHeight(x, z) - 0.8);
        expect(Math.hypot(x, z)).toBeLessThan(PLAY_RADIUS + 25);
        const d = Math.hypot(a[i * 8 + 4]!, a[i * 8 + 5]!, a[i * 8 + 6]!);
        expect(d).toBeGreaterThan(0.99); expect(d).toBeLessThan(1.01);
      }
    }
  });
  it("keeps a school together", () => {
    const life = new Life(5);
    for (let i = 0; i < 30 * 90; i++) life.update(1 / 30, 80, -15, 80);
    for (const sc of life.schools.filter((s) => s.fish.length > 50)) {
      let far = 0;
      for (const f of sc.fish) if (Math.hypot(f.x - sc.cx, f.y - sc.cy, f.z - sc.cz) > 25) far++;
      expect(far / sc.fish.length, sc.sp.id).toBeLessThan(0.2);
    }
  });
  it("lists things worth looking at", () => {
    const life = new Life(5);
    life.update(0.1, 0, -15, 0);
    expect(life.pois.length).toBeGreaterThan(8);
    expect(life.pois.some((p) => p.kind === "manta")).toBe(true);
  });
});
