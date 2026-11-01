import { SOUND } from "./config";
import { loudnessDb } from "./sound";

/** Reads the microphone through an AnalyserNode only.
 *  Privacy: no recording API, the analyser is never connected to any output, one reusable analysis block is
 *  cleared after every reading, and stop() ends every track so the browser's recording light goes out. */

export type ErrorKind = "denied" | "nomic" | "blocked" | "other";

export const AUDIO_CONSTRAINTS = { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } } as const;

export interface MicLike {
  readonly active: boolean;
  start(): Promise<void>;
  /** One loudness number in dB, or null if nothing can be read right now. */
  readDb(): number | null;
  stop(): void;
  /** Called if the microphone stops by itself (for example it was unplugged). */
  onEnded: (() => void) | null;
}

export type MicDeps = {
  getUserMedia: (c: typeof AUDIO_CONSTRAINTS) => Promise<MediaStream>;
  createContext: () => AudioContext;
};

export class MicError extends Error {
  constructor(public kind: ErrorKind, cause?: unknown) { super(kind); this.cause = cause; }
}

export function classifyError(e: unknown): ErrorKind {
  const name = (e as { name?: string } | null)?.name ?? "";
  const msg = String((e as { message?: string } | null)?.message ?? "").toLowerCase();
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") return "nomic";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return msg.includes("system") ? "blocked" : "denied";
  if (name === "SecurityError" || name === "NotReadableError" || name === "AbortError") return "blocked";
  return "other";
}

export function defaultDeps(): MicDeps {
  return {
    getUserMedia: (c) => navigator.mediaDevices.getUserMedia(c),
    createContext: () => new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(),
  };
}

export class Mic implements MicLike {
  onEnded: (() => void) | null = null;
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private block: Float32Array<ArrayBuffer> | null = null;
  private starting = 0;
  constructor(private deps: MicDeps = defaultDeps()) {}

  get active(): boolean { return this.stream !== null; }

  /** Must be called straight from a click so the browser lets the audio context run. */
  async start(): Promise<void> {
    this.stop();
    const token = ++this.starting;
    let ctx: AudioContext | null = null;
    try {
      if (!this.deps.getUserMedia) throw Object.assign(new Error("no media devices"), { name: "NotFoundError" });
      ctx = this.deps.createContext();
      void ctx.resume?.()?.catch?.(() => {});
      const stream = await this.deps.getUserMedia(AUDIO_CONSTRAINTS);
      if (token !== this.starting) { stream.getTracks().forEach((t) => t.stop()); void ctx.close?.(); return; }
      this.stream = stream;
      this.ctx = ctx;
      if (ctx.state === "suspended") { try { await ctx.resume(); } catch { /* retried on each reading */ } }
      const analyser = ctx.createAnalyser();
      analyser.fftSize = SOUND.fftSize;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser); // the analyser is a dead end: nothing connects it to the speakers
      this.source = source;
      this.analyser = analyser;
      this.block = new Float32Array(analyser.fftSize);
      for (const t of stream.getTracks()) t.addEventListener?.("ended", this.handleEnded);
    } catch (e) {
      this.stop();
      if (ctx) void ctx.close?.();
      throw new MicError(classifyError(e), e);
    }
  }

  private handleEnded = () => {
    if (!this.stream) return;
    this.stop();
    this.onEnded?.();
  };

  readDb(): number | null {
    const a = this.analyser, b = this.block, c = this.ctx;
    if (!a || !b || !c) return null;
    if (c.state === "suspended") { void c.resume?.()?.catch?.(() => {}); return null; }
    if (c.state !== "running") return null;
    a.getFloatTimeDomainData(b);
    const db = loudnessDb(b);
    b.fill(0); // keep no audio
    return db;
  }

  stop(): void {
    this.starting++;
    const stream = this.stream, ctx = this.ctx, source = this.source;
    this.stream = null; this.ctx = null; this.source = null; this.analyser = null; this.block = null;
    if (stream) for (const t of stream.getTracks()) { t.removeEventListener?.("ended", this.handleEnded); t.stop(); }
    try { source?.disconnect(); } catch { /* already gone */ }
    try { void ctx?.close?.()?.catch?.(() => {}); } catch { /* already closed */ }
  }
}
