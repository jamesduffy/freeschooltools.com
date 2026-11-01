import { locate } from "./model";

/** A stopwatch built on timestamps, never on counting ticks. `now` is milliseconds (performance.now in the page). */
export class Runner {
  private startedAt: number | null = null;
  private pausedTotal = 0;
  private pausedAt: number | null = null;
  constructor(private now: () => number) {}

  get state(): "idle" | "running" | "paused" {
    return this.startedAt === null ? "idle" : this.pausedAt === null ? "running" : "paused";
  }
  start(): void { if (this.startedAt === null) { this.startedAt = this.now(); this.pausedTotal = 0; this.pausedAt = null; } }
  pause(): void { if (this.state === "running") this.pausedAt = this.now(); }
  resume(): void {
    if (this.pausedAt !== null) { this.pausedTotal += this.now() - this.pausedAt; this.pausedAt = null; }
  }
  reset(): void { this.startedAt = null; this.pausedTotal = 0; this.pausedAt = null; }

  /** Seconds of running time so far (pauses excluded). */
  elapsed(): number {
    if (this.startedAt === null) return 0;
    const ref = this.pausedAt ?? this.now();
    return Math.max(0, (ref - this.startedAt - this.pausedTotal) / 1000);
  }
  /** Jump to a point in the plan (used by Next activity). */
  setElapsed(sec: number): void {
    if (this.startedAt === null) return;
    const ref = this.pausedAt ?? this.now();
    this.startedAt = ref - this.pausedTotal - Math.max(0, sec) * 1000;
  }
  /** The clock time (same scale as `now`) when the plan will finish if it keeps running, for a plan of `totalSeconds`. */
  endTime(totalSeconds: number): number {
    return (this.startedAt ?? this.now()) + this.pausedTotal + totalSeconds * 1000;
  }
}

export type Cue =
  | { kind: "slice"; index: number; initial: boolean }
  | { kind: "warn"; index: number }
  | { kind: "done" };

export const WARN_SECONDS = 60;

/** Decides which cues to fire from elapsed time alone. Each cue fires exactly once. If frames were skipped
 *  (a hidden tab, a sleeping computer) it fires one cue for where the plan is now and does not replay missed ones. */
export class CueTracker {
  private last = -2;
  private warned = false;
  private doneFired = false;
  reset(): void { this.last = -2; this.warned = false; this.doneFired = false; }

  update(slices: readonly { seconds: number }[], elapsed: number): Cue[] {
    const loc = locate(slices, elapsed);
    const out: Cue[] = [];
    if (loc.done) {
      if (!this.doneFired) { this.doneFired = true; out.push({ kind: "done" }); }
      return out;
    }
    const len = slices[loc.index]!.seconds;
    if (loc.index !== this.last) {
      out.push({ kind: "slice", index: loc.index, initial: this.last === -2 });
      this.last = loc.index;
      this.warned = len <= WARN_SECONDS || loc.left <= WARN_SECONDS; // joining late: the warning is not replayed
    } else if (!this.warned && loc.left <= WARN_SECONDS) {
      this.warned = true;
      out.push({ kind: "warn", index: loc.index });
    }
    return out;
  }
}
