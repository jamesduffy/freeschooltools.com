import { describe, expect, it } from "vitest";
import { SESSION_MULTIPLIER, SPECIES, milestone } from "../src/aquarium/config";
import { floorFor, growthProgress, growthScale, newEngineState, step, type EngineSettings, type EngineState } from "../src/aquarium/engine";

const S: EngineSettings = { multiplier: 1, loudPausesGrowth: true };
const run = (st: EngineState, seconds: number, noisy: boolean, s: EngineSettings = S) => { for (let i = 0; i < seconds; i++) st = step(st, 1, noisy, s); return st; };

describe("growth engine", () => {
  it("calm banks time after the first 2 seconds", () => {
    expect(run(newEngineState(), 2, false).bank).toBe(0);
    expect(run(newEngineState(), 12, false).bank).toBe(10);
  });
  it("noise pauses banking", () => {
    const st = run(newEngineState(), 12, false);
    expect(run(st, 5, true).bank).toBe(st.bank);
  });
  it("noise longer than 5 seconds drains 2 seconds per second", () => {
    const st = run(newEngineState(), 22, false); // bank 20
    expect(run(st, 5, true).bank).toBe(20);
    expect(run(st, 8, true).bank).toBe(20 - 3 * 2);
  });
  it("a calm stretch of at least 2 seconds is needed again after noise", () => {
    let st = run(newEngineState(), 22, false);
    st = run(st, 1, true);
    const b = st.bank;
    expect(run(st, 2, false).bank).toBe(b);
    expect(run(st, 3, false).bank).toBe(b + 1);
  });
  it("never drops below the last milestone reached", () => {
    let st = run(newEngineState(), 45, false); // past 30 s: minnows arrived
    expect(st.arrived).toBe(1);
    st = run(st, 600, true);
    expect(st.bank).toBe(30);
    expect(st.arrived).toBe(1);
  });
  it("the first species arrives in a 60 second calm run", () => {
    const st = run(newEngineState(), 60, false);
    expect(st.arrived).toBeGreaterThanOrEqual(1);
    expect(SPECIES[0]?.id).toBe("minnows");
  });
  it("arrives at fixed milestones and can pass several in one big step", () => {
    const st = step(newEngineState(0, 0), 3, false, S);
    expect(st.arrived).toBe(0);
    const big = step({ bank: 0, calmFor: 10, noisyFor: 0, arrived: 0 }, 400, false, S);
    expect(big.arrived).toBe(SPECIES.filter((sp) => sp.at <= 400).length); // every milestone up to 400 seconds passed at once
    expect(big.arrived).toBeGreaterThan(3);
  });
  it("with loud moments turned off, noise never pauses or drains", () => {
    const off = { ...S, loudPausesGrowth: false };
    const st = run(newEngineState(), 100, true, off);
    expect(st.bank).toBe(98);
    expect(run(st, 100, true, off).bank).toBe(198);
  });
  it("stops at the last species", () => {
    const st = step({ bank: 0, calmFor: 10, noisyFor: 0, arrived: 0 }, 99999, false, S);
    expect(st.arrived).toBe(SPECIES.length);
    expect(growthProgress(st, 1)).toBe(1);
  });
});

describe("session length presets", () => {
  it("multiply every milestone", () => {
    expect(SESSION_MULTIPLIER).toEqual({ short: 0.5, standard: 1, long: 2 });
    SPECIES.forEach((sp, i) => {
      expect(milestone(i, 0.5)).toBe(sp.at / 2);
      expect(milestone(i, 2)).toBe(sp.at * 2);
    });
    const ats = SPECIES.map((s) => s.at);
    expect(ats).toEqual([...ats].sort((a, b) => a - b)); // the engine counts arrivals, so the list must stay in order
    expect(new Set(ats).size).toBe(ats.length);
    // the original 8 kinds keep their original times
    const original: Record<string, number> = { minnows: 30, butterflyfish: 120, pufferfish: 300, seahorse: 600, jellyfish: 900, turtle: 1500, manta: 2400, whaleshark: 3600 };
    for (const [id, at] of Object.entries(original)) expect(SPECIES.find((s) => s.id === id)?.at, id).toBe(at);
  });
  it("the first fish arrives in half the time on Short", () => {
    const short = { ...S, multiplier: 0.5 };
    expect(run(newEngineState(), 15, false, short).arrived).toBe(0);
    expect(run(newEngineState(), 18, false, short).arrived).toBe(1);
  });
  it("the floor uses the current multiplier", () => { expect(floorFor(2, 2)).toBe(SPECIES[1]!.at * 2); expect(floorFor(0, 2)).toBe(0); });
});

describe("growth scale", () => {
  it("goes from 60 percent to 100 percent between milestones", () => {
    expect(growthScale(0)).toBeCloseTo(0.6);
    expect(growthScale(1)).toBeCloseTo(1);
    expect(growthScale(0.5)).toBeCloseTo(0.8);
    expect(growthScale(5)).toBeCloseTo(1);
    expect(growthProgress({ bank: (SPECIES[0]!.at + SPECIES[1]!.at) / 2, calmFor: 0, noisyFor: 0, arrived: 1 }, 1)).toBeCloseTo(0.5); // halfway between the first two milestones
  });
});
