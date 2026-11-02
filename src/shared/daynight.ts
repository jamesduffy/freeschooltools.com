/** Day and night for the Fish Tank. Pure: give it elapsed time, get back where in the cycle it is. */

/** Length of one whole day-and-night cycle. Change this one number to speed it up or slow it down. */
export const CYCLE_MINUTES = 10;
/** Where in the cycle the tank starts (0 to 1). 0.15 is a little after sunrise, so it opens in daylight. */
export const START_POSITION = 0.15;

export type Phase = "day" | "dusk" | "night" | "dawn";
/** When a kind of animal is out and about. */
export type Active = "day" | "night" | "both";

const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

/** Position in the cycle, 0 up to (not including) 1. */
export function positionAt(elapsedMs: number, cycleMs = CYCLE_MINUTES * 60000, start = START_POSITION): number {
  const p = (start + elapsedMs / cycleMs) % 1;
  return p < 0 ? p + 1 : p;
}

/** Day is 5% to 45% of the cycle, dusk 45% to 55%, night 55% to 95%, dawn 95% to 5% (the next cycle). */
export function phaseOf(pos: number): Phase {
  if (pos < 0.05 || pos >= 0.95) return "dawn";
  if (pos < 0.45) return "day";
  if (pos < 0.55) return "dusk";
  return "night";
}

/** How bright it is: 1 in full daylight, 0 in full night, easing through dusk and dawn. */
export function lightAt(pos: number): number {
  if (pos >= 0.05 && pos < 0.45) return 1;
  if (pos >= 0.45 && pos < 0.55) return 1 - smooth((pos - 0.45) / 0.1);
  if (pos >= 0.55 && pos < 0.95) return 0;
  const p = pos < 0.05 ? pos + 1 : pos; // dawn wraps around the end of the cycle
  return smooth((p - 0.95) / 0.1);
}

/** 0 in full day or night, up to 1 in the middle of dusk or dawn. Used for the warm tint. */
export const twilightAt = (pos: number): number => { const l = lightAt(pos); return 4 * l * (1 - l); };

/** Is a kind of animal out in this phase? Day and night animals only show up in their own time; dusk and dawn are for animals active at any time. */
export function isActiveIn(active: Active, phase: Phase): boolean {
  if (active === "both") return true;
  return active === "day" ? phase === "day" : phase === "night";
}
