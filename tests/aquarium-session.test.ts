import { describe, expect, it } from "vitest";
import { AUDIO_CONSTRAINTS, Mic, MicError, classifyError, type MicLike } from "../src/aquarium/mic";
import { Session } from "../src/aquarium/session";
import { defaultStore } from "../src/aquarium/storage";

// ---- fake web audio -------------------------------------------------------------
function fakeAudio(opts: { reject?: unknown; state?: "running" | "suspended" } = {}) {
  const log = { stopped: 0, closed: 0, connects: [] as string[], destinationTouched: false, resumed: 0, constraints: null as unknown, ended: [] as (() => void)[] };
  let signal = 0; // amplitude of the fake sine
  const track = { stop: () => { log.stopped++; }, addEventListener: (_: string, f: () => void) => { log.ended.push(f); }, removeEventListener: () => {} };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const ctx = {
    state: (opts.state ?? "running") as string,
    resume: async () => { log.resumed++; ctx.state = "running"; },
    close: async () => { log.closed++; ctx.state = "closed"; },
    get destination() { log.destinationTouched = true; return {}; },
    createAnalyser: () => ({ fftSize: 0, getFloatTimeDomainData: (b: Float32Array) => { for (let i = 0; i < b.length; i++) b[i] = signal * Math.sin(i / 3); }, connect: () => { log.connects.push("analyser-out"); } }),
    createMediaStreamSource: () => ({ connect: (n: unknown) => { log.connects.push(n && (n as { fftSize?: number }).fftSize !== undefined ? "source->analyser" : "source->other"); }, disconnect: () => {} }),
  };
  const deps = {
    getUserMedia: async (c: unknown) => { log.constraints = c; if (opts.reject) throw opts.reject; return stream; },
    createContext: () => ctx as unknown as AudioContext,
  };
  return { deps, log, set: (a: number) => { signal = a; } };
}

describe("mic", () => {
  it("asks for audio with all browser clean up turned off", async () => {
    const a = fakeAudio(); const m = new Mic(a.deps); await m.start();
    expect(a.log.constraints).toEqual({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    expect(a.log.constraints).toEqual(AUDIO_CONSTRAINTS);
  });
  it("only connects the source to the analyser, never to an output", async () => {
    const a = fakeAudio(); const m = new Mic(a.deps); await m.start(); m.readDb();
    expect(a.log.connects).toEqual(["source->analyser"]);
    expect(a.log.destinationTouched).toBe(false);
  });
  it("reads a louder number for louder sound and stays finite for silence", async () => {
    const a = fakeAudio(); const m = new Mic(a.deps); await m.start();
    a.set(0); const silent = m.readDb()!;
    a.set(0.5); const loud = m.readDb()!;
    expect(Number.isFinite(silent)).toBe(true);
    expect(loud).toBeGreaterThan(silent);
  });
  it("stop ends every track and closes the audio context", async () => {
    const a = fakeAudio(); const m = new Mic(a.deps); await m.start();
    expect(m.active).toBe(true);
    m.stop();
    expect(a.log.stopped).toBe(1);
    expect(a.log.closed).toBe(1);
    expect(m.active).toBe(false);
    expect(m.readDb()).toBeNull();
  });
  it("resumes a suspended audio context", async () => {
    const a = fakeAudio({ state: "suspended" }); const m = new Mic(a.deps); await m.start();
    expect(a.log.resumed).toBeGreaterThan(0);
    expect(m.readDb()).not.toBeNull();
  });
  it("tells the caller when the microphone ends by itself", async () => {
    const a = fakeAudio(); const m = new Mic(a.deps); let ended = 0; m.onEnded = () => ended++;
    await m.start();
    a.log.ended.forEach((f) => f());
    expect(ended).toBe(1);
    expect(m.active).toBe(false);
  });
  it("classifies failures", () => {
    expect(classifyError({ name: "NotAllowedError" })).toBe("denied");
    expect(classifyError({ name: "NotAllowedError", message: "Permission denied by system" })).toBe("blocked");
    expect(classifyError({ name: "NotFoundError" })).toBe("nomic");
    expect(classifyError({ name: "NotReadableError" })).toBe("blocked");
    expect(classifyError(new Error("weird"))).toBe("other");
  });
  it("turns a rejected permission into a MicError and cleans up", async () => {
    const a = fakeAudio({ reject: { name: "NotAllowedError" } }); const m = new Mic(a.deps);
    await expect(m.start()).rejects.toBeInstanceOf(MicError);
    expect(m.active).toBe(false);
    expect(a.log.closed).toBe(1);
  });
});

// ---- session with a scripted microphone ----------------------------------------------
class FakeMic implements MicLike {
  active = false; db = -50; stops = 0; fail: unknown = null; onEnded: (() => void) | null = null;
  async start() { if (this.fail) throw new MicError(this.fail as "denied"); this.active = true; }
  readDb() { return this.active ? this.db : null; }
  stop() { this.active = false; this.stops++; }
}
const run = (s: Session, m: FakeMic, db: number, ms: number) => { m.db = db; for (let t = 0; t < ms; t += 100) s.tick(100); };

describe("session", () => {
  it("calibrates for 5 seconds, then is running with a threshold 12 dB above the room", async () => {
    const m = new FakeMic(); const s = new Session(m, defaultStore().settings);
    await s.start();
    expect(s.phase).toBe("calibrating");
    run(s, m, -50, 4900);
    expect(s.phase).toBe("calibrating");
    run(s, m, -50, 200);
    expect(s.phase).toBe("running");
    expect(s.threshold).toBeCloseTo(-38);
  });
  it("loud talking flips to noisy and quiet flips it back", async () => {
    const m = new FakeMic(); const s = new Session(m, defaultStore().settings);
    await s.start(); run(s, m, -50, 5200);
    run(s, m, -20, 1500);
    expect(s.roomState).toBe("noisy");
    run(s, m, -50, 6000);
    expect(s.roomState).toBe("calm");
  });
  it("a 60 second calm run spawns the first species and announces it", async () => {
    const m = new FakeMic(); const s = new Session(m, defaultStore().settings);
    const arrivals: number[] = []; s.onArrive = (i) => arrivals.push(i);
    await s.start(); run(s, m, -50, 5200); run(s, m, -50, 60000);
    expect(arrivals).toEqual([0]);
    expect(s.engine.arrived).toBe(1);
  });
  it("earned species stay through a long loud stretch", async () => {
    const m = new FakeMic(); const s = new Session(m, defaultStore().settings);
    await s.start(); run(s, m, -50, 5200); run(s, m, -50, 50000);
    run(s, m, -10, 120000);
    expect(s.engine.arrived).toBe(1);
    expect(s.engine.bank).toBeGreaterThanOrEqual(30);
  });
  it("with loud moments turned off, a noisy room keeps growing", async () => {
    const settings = defaultStore().settings; settings.loudPausesGrowth = false;
    const m = new FakeMic(); const s = new Session(m, settings);
    await s.start(); run(s, m, -50, 5200); run(s, m, -10, 60000);
    expect(s.engine.arrived).toBe(1);
  });
  it("pause stops the microphone and freezes growth; resume keeps the baseline", async () => {
    const m = new FakeMic(); const s = new Session(m, defaultStore().settings);
    await s.start(); run(s, m, -50, 5200); run(s, m, -50, 10000);
    const bank = s.engine.bank;
    const stops = m.stops;
    s.pause("user");
    expect(m.active).toBe(false);
    expect(m.stops).toBeGreaterThan(stops);
    expect(s.listening).toBe(false);
    run(s, m, -50, 5000);
    expect(s.engine.bank).toBe(bank);
    await s.resume();
    expect(s.phase).toBe("running");
    expect(s.listening).toBe(true);
    expect(s.threshold).toBeCloseTo(-38);
  });
  it("hidden tab and unplugged microphone both pause and stop the microphone", async () => {
    const m = new FakeMic(); const s = new Session(m, defaultStore().settings);
    await s.start(); run(s, m, -50, 5200);
    s.pause("hidden");
    expect(s.phase).toBe("paused"); expect(s.pauseReason).toBe("hidden"); expect(m.active).toBe(false);
    await s.resume();
    m.onEnded?.();
    expect(s.phase).toBe("paused"); expect(s.pauseReason).toBe("unplugged");
  });
  it("shows a friendly error when the microphone is denied, and Try again works", async () => {
    const m = new FakeMic(); m.fail = "denied"; const s = new Session(m, defaultStore().settings);
    await s.start();
    expect(s.phase).toBe("error"); expect(s.error).toBe("denied"); expect(s.listening).toBe(false);
    m.fail = null;
    await s.start();
    expect(s.phase).toBe("calibrating");
  });
  it("recalibrate repeats the room check", async () => {
    const m = new FakeMic(); const s = new Session(m, defaultStore().settings);
    await s.start(); run(s, m, -50, 5200);
    await s.recalibrate();
    expect(s.phase).toBe("calibrating");
    run(s, m, -40, 5200);
    expect(s.threshold).toBeCloseTo(-28);
  });
  it("end turns the microphone off", async () => {
    const m = new FakeMic(); const s = new Session(m, defaultStore().settings);
    await s.start(); s.end();
    expect(m.active).toBe(false); expect(s.phase).toBe("idle");
  });
  it("new tank clears the bank", async () => {
    const m = new FakeMic(); const s = new Session(m, defaultStore().settings, 500, 3);
    s.newTank();
    expect(s.engine.bank).toBe(0); expect(s.engine.arrived).toBe(0);
  });
});
