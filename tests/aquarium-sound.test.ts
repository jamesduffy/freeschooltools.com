import { describe, expect, it } from "vitest";
import { Calibrator, CalmDetector, Smoother, clampOffset, loudnessDb, median, meterFraction, rmsOf, rmsToDb, thresholdFor } from "../src/aquarium/sound";

const sine = (amp: number, n = 2048) => Array.from({ length: n }, (_, i) => amp * Math.sin((2 * Math.PI * 440 * i) / 44100));

describe("loudness math", () => {
  it("silence is finite and quieter than a loud sine", () => {
    const silent = loudnessDb(new Float32Array(2048));
    const quiet = loudnessDb(sine(0.01));
    const loud = loudnessDb(sine(0.5));
    expect(Number.isFinite(silent)).toBe(true);
    expect(silent).toBeLessThan(quiet);
    expect(quiet).toBeLessThan(loud);
  });
  it("never returns -Infinity or NaN for odd input", () => {
    for (const r of [0, -1, NaN, 1e-30]) expect(Number.isFinite(rmsToDb(r))).toBe(true);
    expect(rmsOf([])).toBe(0);
  });
  it("a full scale sine reads about -3 dB", () => {
    expect(loudnessDb(sine(1))).toBeCloseTo(-3.01, 1);
  });
});

describe("smoothing", () => {
  it("rises faster than it falls", () => {
    const up = new Smoother(); up.push(-60, 100);
    const afterRise = up.push(-20, 100) - -60;
    const down = new Smoother(); down.push(-20, 100);
    const afterFall = -20 - down.push(-60, 100);
    expect(afterRise).toBeGreaterThan(afterFall * 3);
  });
  it("starts at the first reading", () => { expect(new Smoother().push(-42, 100)).toBe(-42); });
});

describe("calibration", () => {
  it("takes the median over 5 seconds, ignoring a cough", () => {
    const c = new Calibrator();
    for (let i = 0; i < 50; i++) c.add(i === 20 ? -10 : -50, 100);
    expect(c.done).toBe(true);
    expect(c.baseline()).toBe(-50);
  });
  it("is not done early and reports progress", () => {
    const c = new Calibrator();
    for (let i = 0; i < 25; i++) c.add(-50, 100);
    expect(c.done).toBe(false);
    expect(c.progress).toBeCloseTo(0.5);
  });
  it("median handles even and empty lists", () => { expect(median([1, 3])).toBe(2); expect(Number.isFinite(median([]))).toBe(true); });
  it("threshold is baseline plus the clamped offset (6 to 18 dB)", () => {
    expect(thresholdFor(-50, 12)).toBe(-38);
    expect(thresholdFor(-50, 0)).toBe(-44);
    expect(thresholdFor(-50, 99)).toBe(-32);
    expect(clampOffset(NaN)).toBe(12);
  });
});

describe("calm and noisy state", () => {
  const T = -38;
  const run = (d: CalmDetector, db: number, ms: number) => { for (let t = 0; t < ms; t += 100) d.update(db, 100, T); return d.state; };
  it("a 200 ms burst does not flip to noisy", () => {
    const d = new CalmDetector();
    run(d, -50, 1000);
    expect(run(d, -20, 200)).toBe("calm");
    expect(run(d, -50, 1000)).toBe("calm");
  });
  it("500 ms of noise does flip, and 400 ms is the edge", () => {
    const d = new CalmDetector();
    expect(run(d, -20, 300)).toBe("calm");
    expect(run(d, -20, 100)).toBe("noisy");
    const d2 = new CalmDetector();
    expect(run(d2, -20, 500)).toBe("noisy");
  });
  it("takes 2 seconds of quiet to return to calm", () => {
    const d = new CalmDetector();
    run(d, -20, 500);
    expect(run(d, -50, 1900)).toBe("noisy");
    expect(run(d, -50, 100)).toBe("calm");
  });
  it("a short dip does not reset the noisy state", () => {
    const d = new CalmDetector();
    run(d, -20, 500);
    run(d, -50, 1000);
    run(d, -20, 100);
    expect(run(d, -50, 1900)).toBe("noisy");
  });
  it("a moderate burst through the smoother stays a blip, loud talking flips it", () => {
    const d = new CalmDetector(), sm = new Smoother();
    const feed = (db: number, ms: number) => { for (let t = 0; t < ms; t += 100) d.update(sm.push(db, 100), 100, T); return d.state; };
    feed(-50, 1000);
    expect(feed(-30, 200)).toBe("calm");
    feed(-50, 3000);
    expect(feed(-15, 1000)).toBe("noisy");
    expect(feed(-50, 6000)).toBe("calm");
  });
  it("meter fraction stays within 0..1 and puts the threshold at the mark", () => {
    expect(meterFraction(-200, T)).toBe(0);
    expect(meterFraction(100, T)).toBe(1);
    expect(meterFraction(T, T)).toBeCloseTo(0.6);
  });
});
