import { SOUND } from "./config";

/** Pure sound math. Nothing here touches the microphone, so it can be tested with made up numbers.
 *  Privacy: functions take a block of samples, return one number, and keep nothing. */

/** Root mean square of a block of samples (any value range; the web audio range is -1 to 1). */
export function rmsOf(samples: ArrayLike<number>): number {
  const n = samples.length;
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) { const v = samples[i] ?? 0; sum += v * v; }
  return Math.sqrt(sum / n);
}

/** 20 * log10(rms), floored so silence never gives -Infinity. 0 dB is a full-scale sine's peak. */
export function rmsToDb(rms: number): number {
  if (!(rms > 0)) return SOUND.minDb;
  const db = 20 * Math.log10(rms);
  return Number.isFinite(db) ? Math.max(SOUND.minDb, db) : SOUND.minDb;
}

export function loudnessDb(samples: ArrayLike<number>): number {
  return rmsToDb(rmsOf(samples));
}

/** One pole smoothing that rises quickly and falls slowly. Time constants are in milliseconds. */
export class Smoother {
  private v: number | null = null;
  constructor(private riseMs: number = SOUND.riseMs, private fallMs: number = SOUND.fallMs) {}
  get value(): number | null { return this.v; }
  push(db: number, dtMs: number): number {
    if (this.v === null) { this.v = db; return db; }
    const tau = db > this.v ? this.riseMs : this.fallMs;
    const a = 1 - Math.exp(-Math.max(0, dtMs) / tau);
    this.v = this.v + (db - this.v) * a;
    return this.v;
  }
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return SOUND.minDb;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

/** Collects loudness readings for the calibration time, then reports the median as the room's baseline. */
export class Calibrator {
  private readings: number[] = [];
  private elapsed = 0;
  constructor(private durationMs: number = SOUND.calibrationMs) {}
  add(db: number, dtMs: number): void { this.readings.push(db); this.elapsed += dtMs; }
  get progress(): number { return Math.min(1, this.elapsed / this.durationMs); }
  get done(): boolean { return this.elapsed >= this.durationMs; }
  baseline(): number { return median(this.readings); }
}

export const clampOffset = (db: number): number =>
  Number.isFinite(db) ? Math.min(SOUND.offsetMaxDb, Math.max(SOUND.offsetMinDb, db)) : SOUND.offsetDefaultDb;

export const thresholdFor = (baselineDb: number, offsetDb: number): number => baselineDb + clampOffset(offsetDb);

export type RoomState = "calm" | "noisy";

/** Noisy after loudness stays above the threshold for graceMs; calm again after it stays below for calmAfterMs. */
export class CalmDetector {
  state: RoomState = "calm";
  private aboveMs = 0;
  private belowMs = 0;
  constructor(private graceMs: number = SOUND.graceMs, private calmAfterMs: number = SOUND.calmAfterMs) {}
  update(db: number, dtMs: number, threshold: number): RoomState {
    if (db > threshold) {
      this.aboveMs += dtMs; this.belowMs = 0;
      if (this.state === "calm" && this.aboveMs >= this.graceMs) this.state = "noisy";
    } else {
      this.belowMs += dtMs; this.aboveMs = 0;
      if (this.state === "noisy" && this.belowMs >= this.calmAfterMs) this.state = "calm";
    }
    return this.state;
  }
  reset(): void { this.state = "calm"; this.aboveMs = 0; this.belowMs = 0; }
}

/** Level relative to the threshold, for the optional meter: 0 is far below, 1 is well above, threshold sits at METER_MARK. */
export const METER_BELOW_DB = 18;
export const METER_ABOVE_DB = 12;
export const METER_MARK = METER_BELOW_DB / (METER_BELOW_DB + METER_ABOVE_DB);
export function meterFraction(db: number, threshold: number): number {
  const f = (db - threshold + METER_BELOW_DB) / (METER_BELOW_DB + METER_ABOVE_DB);
  return Math.min(1, Math.max(0, f));
}
