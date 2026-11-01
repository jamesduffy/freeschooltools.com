import { describe, expect, it } from "vitest";
import { CueTracker, Runner } from "../src/timer/runner";
import { toneFor, toneSpecs } from "../src/timer/audio";

function clock() {
  let t = 1000;
  return { now: () => t, advance: (ms: number) => { t += ms; } };
}

describe("Runner with a fake clock", () => {
  it("measures from timestamps", () => {
    const c = clock(); const r = new Runner(c.now);
    expect(r.state).toBe("idle");
    expect(r.elapsed()).toBe(0);
    r.start(); c.advance(12_500);
    expect(r.elapsed()).toBe(12.5);
  });
  it("pausing for 90 seconds adds exactly 90 seconds to the end time", () => {
    const c = clock(); const r = new Runner(c.now);
    r.start();
    const end0 = r.endTime(600);
    c.advance(100_000);
    r.pause();
    c.advance(90_000);
    expect(r.elapsed()).toBe(100); // frozen while paused
    r.resume();
    expect(r.endTime(600) - end0).toBe(90_000);
    c.advance(5000);
    expect(r.elapsed()).toBe(105);
  });
  it("setElapsed jumps without breaking pause math", () => {
    const c = clock(); const r = new Runner(c.now);
    r.start(); c.advance(10_000); r.setElapsed(300);
    expect(r.elapsed()).toBe(300);
    c.advance(1000);
    expect(r.elapsed()).toBe(301);
    r.pause(); r.setElapsed(600); c.advance(5000);
    expect(r.elapsed()).toBe(600);
    r.resume(); c.advance(1000);
    expect(r.elapsed()).toBe(601);
  });
  it("reset goes back to idle", () => {
    const c = clock(); const r = new Runner(c.now);
    r.start(); c.advance(5000); r.reset();
    expect(r.state).toBe("idle"); expect(r.elapsed()).toBe(0);
  });
});

describe("CueTracker", () => {
  const sl = [{ seconds: 300 }, { seconds: 600 }, { seconds: 30 }];
  it("fires each cue exactly once", () => {
    const t = new CueTracker();
    expect(t.update(sl, 0)).toEqual([{ kind: "slice", index: 0, initial: true }]);
    expect(t.update(sl, 100)).toEqual([]);
    expect(t.update(sl, 239)).toEqual([]);
    expect(t.update(sl, 240)).toEqual([{ kind: "warn", index: 0 }]);
    expect(t.update(sl, 241)).toEqual([]);
    expect(t.update(sl, 300)).toEqual([{ kind: "slice", index: 1, initial: false }]);
    expect(t.update(sl, 300.5)).toEqual([]);
    expect(t.update(sl, 840)).toEqual([{ kind: "warn", index: 1 }]);
    expect(t.update(sl, 900)).toEqual([{ kind: "slice", index: 2, initial: false }]); // 30s slice: no warning
    expect(t.update(sl, 920)).toEqual([]);
    expect(t.update(sl, 930)).toEqual([{ kind: "done" }]);
    expect(t.update(sl, 1000)).toEqual([]);
  });
  it("does not replay missed cues after a long sleep", () => {
    const t = new CueTracker();
    t.update(sl, 0);
    expect(t.update(sl, 880)).toEqual([{ kind: "slice", index: 1, initial: false }]); // in the last minute of slice two: no warn replay
    expect(t.update(sl, 881)).toEqual([]);
    const t2 = new CueTracker();
    t2.update(sl, 0);
    expect(t2.update(sl, 5000)).toEqual([{ kind: "done" }]);
  });
  it("starts over after reset", () => {
    const t = new CueTracker();
    t.update(sl, 0); t.reset();
    expect(t.update(sl, 0)).toEqual([{ kind: "slice", index: 0, initial: true }]);
  });
});

describe("sound recipes", () => {
  it("builds the tones in the spec", () => {
    const soft = toneSpecs("soft", 0.4);
    expect(soft.map((n) => [n.type, Math.round(n.freq)])).toEqual([["sine", 659], ["sine", 880]]);
    expect(soft.every((n) => n.dur === 0.6)).toBe(true);
    const bell = toneSpecs("bell", 0.4);
    expect(bell).toHaveLength(1);
    expect(bell[0]).toMatchObject({ type: "triangle", dur: 1.5 });
    expect(Math.round(bell[0]!.freq)).toBe(523);
    expect(toneSpecs("warn", 0.4)[0]!.gain).toBeLessThan(soft[0]!.gain);
  });
  it("is silent when sound is off or the warning is off", () => {
    expect(toneFor("change", { chime: "off", warnOneMinute: true })).toBeNull();
    expect(toneFor("warn", { chime: "off", warnOneMinute: true })).toBeNull();
    expect(toneFor("warn", { chime: "soft", warnOneMinute: false })).toBeNull();
    expect(toneFor("warn", { chime: "bell", warnOneMinute: true })).toBe("warn");
    expect(toneFor("change", { chime: "bell", warnOneMinute: false })).toBe("bell");
  });
});
