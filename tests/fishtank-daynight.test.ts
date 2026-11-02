import { describe, expect, it } from "vitest";
import { CYCLE_MINUTES, START_POSITION, isActiveIn, lightAt, phaseOf, positionAt, twilightAt } from "../src/fishtank/daynight";

const MIN = 60000;
describe("day and night", () => {
  it("the cycle is 10 minutes and the tank opens in daylight", () => {
    expect(CYCLE_MINUTES).toBe(10);
    expect(phaseOf(positionAt(0))).toBe("day");
    expect(lightAt(START_POSITION)).toBe(1);
  });
  it("goes day, dusk, night, dawn, day over one cycle", () => {
    const seq: string[] = [];
    for (let m = 0; m <= 10 * 60; m += 5) { const ph = phaseOf(positionAt(m * 1000)); if (seq[seq.length - 1] !== ph) seq.push(ph); }
    expect(seq).toEqual(["day", "dusk", "night", "dawn", "day"]);
  });
  it("the cycle repeats every 10 minutes", () => {
    for (const t of [0, 1.3, 4.9, 7.7]) expect(positionAt(t * MIN)).toBeCloseTo(positionAt((t + 10) * MIN), 9);
    expect(positionAt(30 * MIN)).toBeCloseTo(positionAt(0), 9);
  });
  it("is dark in the middle of the night and bright at midday", () => {
    expect(lightAt(0.75)).toBe(0);
    expect(lightAt(0.25)).toBe(1);
  });
  it("light fades smoothly at dusk and brightens at dawn, with no jumps at the edges", () => {
    let prev = lightAt(0.45);
    for (let p = 0.45; p <= 0.55; p += 0.005) { const l = lightAt(p); expect(l).toBeLessThanOrEqual(prev + 1e-9); prev = l; }
    expect(lightAt(0.45)).toBeCloseTo(1, 6); expect(lightAt(0.55)).toBeCloseTo(0, 6);
    expect(lightAt(0.9499)).toBeCloseTo(lightAt(0.95), 3);
    expect(lightAt(0.0499)).toBeCloseTo(1, 3);
    prev = lightAt(0.95);
    for (const p of [0.97, 0.99, 0.01, 0.03, 0.05]) { const l = lightAt(p); expect(l).toBeGreaterThanOrEqual(prev - 1e-9); prev = l; }
  });
  it("twilight tint peaks in the middle of dusk and is zero in full day and full night", () => {
    expect(twilightAt(0.25)).toBe(0); expect(twilightAt(0.75)).toBe(0);
    expect(twilightAt(0.5)).toBeCloseTo(1, 6);
  });
  it("day animals show up by day, night animals at night, and both kinds at any time", () => {
    expect(isActiveIn("day", "day")).toBe(true);
    expect(isActiveIn("day", "night")).toBe(false);
    expect(isActiveIn("night", "night")).toBe(true);
    expect(isActiveIn("night", "day")).toBe(false);
    for (const ph of ["day", "dusk", "night", "dawn"] as const) expect(isActiveIn("both", ph)).toBe(true);
    for (const ph of ["dusk", "dawn"] as const) { expect(isActiveIn("day", ph)).toBe(false); expect(isActiveIn("night", ph)).toBe(false); }
  });
});
