import type { Settings } from "./model";

export type ToneKind = "soft" | "bell" | "warn";
export type ToneSpec = { type: OscillatorType; freq: number; at: number; dur: number; gain: number };

/** The notes for each cue. Pure so it can be tested; nothing is ever downloaded. */
export function toneSpecs(kind: ToneKind, volume: number): ToneSpec[] {
  const v = Math.min(1, Math.max(0, volume)) * 0.6;
  if (kind === "soft") return [{ type: "sine", freq: 659.25, at: 0, dur: 0.6, gain: v }, { type: "sine", freq: 880, at: 0.3, dur: 0.6, gain: v }];
  if (kind === "bell") return [{ type: "triangle", freq: 523.25, at: 0, dur: 1.5, gain: v }];
  return [{ type: "sine", freq: 659.25, at: 0, dur: 0.6, gain: v * 0.4 }];
}

/** Which tone, if any, plays for a cue under the current settings. */
export function toneFor(cue: "change" | "warn", s: Pick<Settings, "chime" | "warnOneMinute">): ToneKind | null {
  if (s.chime === "off") return null;
  if (cue === "warn") return s.warnOneMinute ? "warn" : null;
  return s.chime;
}

export class Sound {
  private ctx: AudioContext | null = null;

  /** Call from a click or key press (the Start button) so the browser allows audio. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctor) this.ctx = new Ctor();
      }
      void this.ctx?.resume();
    } catch { this.ctx = null; }
  }

  play(kind: ToneKind, volume: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      void ctx.resume();
      const t0 = ctx.currentTime + 0.02;
      for (const n of toneSpecs(kind, volume)) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = n.type;
        osc.frequency.value = n.freq;
        const s = t0 + n.at;
        g.gain.setValueAtTime(0.0001, s);
        g.gain.linearRampToValueAtTime(Math.max(0.0002, n.gain), s + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, s + n.dur);
        osc.connect(g).connect(ctx.destination);
        osc.start(s);
        osc.stop(s + n.dur + 0.05);
      }
    } catch { /* sound is a nice extra; never break the timer */ }
  }
}
