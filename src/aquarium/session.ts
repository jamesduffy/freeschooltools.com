import { SESSION_MULTIPLIER, SOUND } from "./config";
import { newEngineState, step, type EngineState } from "./engine";
import type { ErrorKind, MicLike } from "./mic";
import { MicError } from "./mic";
import { CalmDetector, Calibrator, Smoother, meterFraction, thresholdFor, type RoomState } from "./sound";
import type { Settings } from "./storage";

export type Phase = "idle" | "starting" | "calibrating" | "running" | "paused" | "error";
export type PauseReason = "user" | "hidden" | "unplugged";

/** Ties the microphone, the sound state and the growth engine together. No DOM. Drive it with tick(). */
export class Session {
  phase: Phase = "idle";
  pauseReason: PauseReason | null = null;
  error: ErrorKind | null = null;
  engine: EngineState;
  roomState: RoomState = "calm";
  /** Smoothed loudness minus threshold, in dB. Only the latest value is held. */
  private level: number | null = null;
  private baseline: number | null = null;
  private smoother = new Smoother();
  private calibrator = new Calibrator();
  private detector = new CalmDetector();
  onChange: () => void = () => {};
  onArrive: (index: number) => void = () => {};

  constructor(private mic: MicLike, public settings: Settings, bank = 0, arrived = 0) {
    this.engine = newEngineState(bank, arrived);
    this.mic.onEnded = () => this.pause("unplugged");
  }

  get listening(): boolean { return this.mic.active && (this.phase === "calibrating" || this.phase === "running"); }
  get calibrationProgress(): number { return this.calibrator.progress; }
  get threshold(): number | null { return this.baseline === null ? null : thresholdFor(this.baseline, this.settings.sensitivityDb); }
  get meter(): number { const t = this.threshold; return t === null || this.level === null ? 0 : meterFraction(this.level, t); }
  get multiplier(): number { return SESSION_MULTIPLIER[this.settings.session]; }

  private set(p: Phase) { this.phase = p; this.onChange(); }

  /** Call straight from a click. */
  async start(): Promise<void> {
    this.error = null; this.pauseReason = null;
    this.phase = "starting"; this.onChange();
    try { await this.mic.start(); }
    catch (e) { this.error = e instanceof MicError ? e.kind : "other"; this.set("error"); return; }
    if (this.phase !== "starting") { this.mic.stop(); return; } // ended while waiting for permission
    this.beginCalibration();
  }

  private beginCalibration() {
    this.smoother = new Smoother(); this.calibrator = new Calibrator(); this.level = null; this.baseline = null;
    this.set("calibrating");
  }

  /** Repeat the 5 second room check. */
  async recalibrate(): Promise<void> {
    if (this.mic.active) this.beginCalibration(); else await this.start();
  }

  pause(reason: PauseReason): void {
    if (this.phase === "paused") { this.mic.stop(); return; }
    if (this.phase !== "starting" && this.phase !== "calibrating" && this.phase !== "running") return;
    this.mic.stop();
    this.level = null;
    this.pauseReason = reason;
    this.set("paused");
  }

  async resume(): Promise<void> {
    if (this.phase !== "paused" && this.phase !== "error") return;
    this.error = null; this.phase = "starting"; this.onChange();
    try { await this.mic.start(); }
    catch (e) { this.error = e instanceof MicError ? e.kind : "other"; this.set("error"); return; }
    if (this.phase !== "starting") { this.mic.stop(); return; }
    if (this.baseline === null) { this.beginCalibration(); return; }
    this.smoother = new Smoother(); this.detector.reset(); this.roomState = "calm"; this.pauseReason = null;
    this.set("running");
  }

  end(): void {
    this.mic.stop();
    this.level = null; this.baseline = null; this.roomState = "calm"; this.pauseReason = null; this.error = null;
    this.set("idle");
  }

  /** Clears the tank bank only. Species already discovered are kept by the caller. */
  newTank(): void { this.engine = newEngineState(); this.onChange(); }

  /** Call about every 100 ms with the real time since the last call. */
  tick(dtMs: number): void {
    if (this.phase !== "calibrating" && this.phase !== "running") return;
    const dt = Math.min(Math.max(dtMs, 0), 1000);
    const db = this.mic.readDb();
    if (db === null) return;
    const smoothed = this.smoother.push(db, dt);
    if (this.phase === "calibrating") {
      this.calibrator.add(smoothed, dt);
      if (this.calibrator.done) {
        this.baseline = this.calibrator.baseline();
        this.detector = new CalmDetector(); this.roomState = "calm"; this.level = smoothed;
        this.set("running");
      } else this.onChange();
      return;
    }
    const t = this.threshold as number;
    this.level = smoothed;
    this.roomState = this.detector.update(smoothed, dt, t);
    const before = this.engine.arrived;
    this.engine = step(this.engine, dt / 1000, this.roomState === "noisy", { multiplier: this.multiplier, loudPausesGrowth: this.settings.loudPausesGrowth });
    for (let i = before; i < this.engine.arrived; i++) this.onArrive(i);
    this.onChange();
  }
}

export const READ_INTERVAL_MS = SOUND.readIntervalMs;
