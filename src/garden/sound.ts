/** One soft chime, made in code with Web Audio. No audio files. Only ever called after the teacher pressed a button. */
let ctx: AudioContext | null = null;

type Ctor = typeof AudioContext;
function getCtx(): AudioContext | null {
  try {
    if (ctx) return ctx;
    const C: Ctor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    return ctx;
  } catch { return null; }
}

/** volume is 0 to 1. Two gentle sine notes with a slow fade. */
export function playChime(volume: number): void {
  const ac = getCtx();
  if (!ac || volume <= 0) return;
  try {
    if (ac.state === "suspended") void ac.resume();
    const t0 = ac.currentTime + 0.02;
    const master = ac.createGain();
    master.gain.value = Math.min(1, Math.max(0, volume)) * 0.3;
    master.connect(ac.destination);
    [[659.25, 0], [987.77, 0.16]].forEach(([freq, delay]) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = freq as number;
      const t = t0 + (delay as number);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(1, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + 1.5);
    });
  } catch { /* sound is a nicety; never break the page */ }
}
