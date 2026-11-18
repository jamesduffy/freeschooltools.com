import { mulberry32 } from "./noise";

/** Underwater sound made live with the Web Audio API: a deep rumble, a soft surface wash, a quiet drone, bubbles, chimes and
 *  far-off whale calls. No sound files. It plays out only; the microphone is never used. Starts only after a click. */
export class OceanSound {
  private ac: AudioContext | null = null;
  private out: GainNode | null = null;
  private timer: number | undefined;
  private on = false;
  private readonly rnd = mulberry32(Date.now() & 0xffff);

  get enabled() { return this.on; }

  async enable(): Promise<boolean> {
    try {
      if (!this.ac) { this.ac = new AudioContext({ latencyHint: "playback" }); this.build(this.ac); }
      await this.ac.resume();
      this.out?.gain.setTargetAtTime(0.7, this.ac.currentTime, 0.8);
      this.on = true;
      return true;
    } catch { this.on = false; return false; }
  }

  disable() {
    this.on = false;
    if (this.ac && this.out) this.out.gain.setTargetAtTime(0, this.ac.currentTime, 0.3);
    window.setTimeout(() => { if (!this.on) void this.ac?.suspend(); }, 1200);
  }

  /** Quiet while the tab is hidden. */
  setHidden(hidden: boolean) {
    if (!this.ac) return;
    if (hidden) void this.ac.suspend(); else if (this.on) void this.ac.resume();
  }

  private build(ac: AudioContext) {
    const rnd = this.rnd, sr = ac.sampleRate;
    const comp = new DynamicsCompressorNode(ac, { threshold: -8, knee: 8, ratio: 12, attack: 0.005, release: 0.3 });
    comp.connect(ac.destination);
    const out = new GainNode(ac, { gain: 0 }); out.connect(comp); this.out = out;
    const G = (g: number, ...to: AudioNode[]) => { const n = new GainNode(ac, { gain: g }); for (const t of to) n.connect(t); return n; };
    const BQ = (type: BiquadFilterType, f: number, q: number, ...to: AudioNode[]) => { const n = new BiquadFilterNode(ac, { type, frequency: f, Q: q }); for (const t of to) n.connect(t); return n; };
    const lfo = (f: number, depth: number, to: AudioParam) => { const o = new OscillatorNode(ac, { frequency: f }); o.connect(G(depth, to as unknown as AudioNode)); o.start(); };
    // seamless brown noise loop
    const len = sr * 9, buf = ac.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); let b = 0; for (let i = 0; i < len; i++) { b = (b + 0.02 * (rnd() * 2 - 1)) / 1.02; d[i] = b * 3.5; } for (let i = 0; i < 4000; i++) { const k = i / 4000; d[len - 4000 + i] = d[len - 4000 + i]! * (1 - k) + d[i]! * k; } }
    const src = (rate: number, ...to: AudioNode[]) => { const s = new AudioBufferSourceNode(ac, { buffer: buf, loop: true, playbackRate: rate }); for (const t of to) s.connect(t); s.start(); };
    // reverb tail
    const ir = ac.createBuffer(2, sr * 4, sr);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let b = 0; for (let i = 0; i < d.length; i++) { const t = i / sr; b += (rnd() * 2 - 1 - b) * (0.05 + 0.4 * Math.exp(-t * 2)); d[i] = b * Math.exp(-t * 1.6) * (1 - i / d.length); } }
    const wet = new ConvolverNode(ac, { buffer: ir }); wet.connect(out);
    const rum = G(0.34, out); src(1, BQ("lowpass", 140, 0.7, rum)); lfo(0.07, 0.1, rum.gain);
    const wash = G(0.2, out); src(0.63, BQ("bandpass", 420, 0.5, wash)); lfo(0.09, 0.12, wash.gain);
    const pad = G(1, out, G(1.4, wet));
    // drone: a stack of fifths, each a pair of slightly detuned sines that slowly beat
    [73.42, 110, 164.81, 246.94].forEach((f, i) => {
      const g = G(0.02 - i * 0.003, pad);
      for (const df of [0, 0.05 + rnd() * 0.08]) { const o = new OscillatorNode(ac, { frequency: f + df }); o.connect(g); o.start(); }
    });

    // single notes: oscillator -> envelope -> pan -> dry + reverb
    const note = (type: OscillatorType, t: number, f0: number, f1: number, dur: number, vol: number, att: number, send: number) => {
      const o = new OscillatorNode(ac, { type }), g = new GainNode(ac, { gain: 0 }), p = new StereoPannerNode(ac, { pan: (rnd() - 0.5) * 1.4 });
      o.connect(g); g.connect(p); p.connect(out); p.connect(G(send, wet));
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.linearRampToValueAtTime(vol, t + att); g.gain.setTargetAtTime(0, t + att, (dur - att) / 5);
      o.start(t); o.stop(t + dur + 0.5);
    };
    const NOTES = [0, 2, 5, 7, 9, 12, 14, 17];
    let tB = ac.currentTime + 2, tC = ac.currentTime + 6, tW = ac.currentTime + 15;
    this.timer = window.setInterval(() => {
      if (!this.on) return;
      const now = ac.currentTime, t = now + 0.05;
      if (t > tB) { let tt = t; for (let n = 1 + Math.floor(rnd() * rnd() * 6); n--;) { const f = 380 + rnd() * 900; note("sine", tt, f, f * (1.4 + rnd() * 0.8), 0.05 + 40 / f, 0.03 + rnd() * 0.05, 0.006, 0.15); tt += 0.07 + rnd() * 0.13; } tB = tt + 0.5 + rnd() * 5; }
      if (t > tC) { const f = 440 * Math.pow(2, NOTES[Math.floor(rnd() * NOTES.length)]! / 12); note("sine", t, f, f, 5, 0.02 + rnd() * 0.02, 0.03, 1.2); tC = t + 3 + rnd() * 7; }
      if (t > tW) { let tt = t; for (let n = 2 + Math.floor(rnd() * 2); n--;) { const f = 170 + rnd() * 210, d = 1.8 + rnd() * 1.6; note("triangle", tt, f, f * (0.6 + rnd() * 1.1), d, 0.07, d * 0.4, 2); tt += d * 0.8; } tW = tt + 20 + rnd() * 30; }
    }, 150);
  }

  dispose() { window.clearInterval(this.timer); void this.ac?.close(); this.ac = null; }
}
