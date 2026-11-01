import { locate } from "./model";

export const CX = 300, CY = 300, R_OUT = 280, R_IN = 190, R_MID = 235, MIN_DEG = 3, POP = 10;
export type Arc = { start: number; end: number };

/** Angles in degrees, 0 at 12 o'clock, clockwise. A slice under 3 degrees gets 3 degrees; the others share the rest. */
export function computeArcs(seconds: readonly number[]): Arc[] {
  const n = seconds.length;
  const total = seconds.reduce((a, b) => a + b, 0);
  if (n === 0 || total <= 0) return [];
  const raw = seconds.map((s) => (s / total) * 360);
  let ang = raw.slice();
  const fixed = new Set<number>();
  for (let it = 0; it <= n; it++) {
    let changed = false;
    ang.forEach((a, i) => { if (!fixed.has(i) && a < MIN_DEG) { fixed.add(i); changed = true; } });
    if (!changed) break;
    const rest = 360 - fixed.size * MIN_DEG;
    const freeRaw = raw.reduce((sum, a, i) => sum + (fixed.has(i) ? 0 : a), 0);
    if (fixed.size === n || rest <= 0 || freeRaw <= 0) { ang = raw.map(() => 360 / n); break; }
    ang = raw.map((a, i) => (fixed.has(i) ? MIN_DEG : (a * rest) / freeRaw));
  }
  let at = 0;
  return ang.map((a) => { const arc = { start: at, end: at + a }; at += a; return arc; });
}

export function polar(deg: number, r: number): { x: number; y: number } {
  const t = (deg * Math.PI) / 180;
  return { x: CX + r * Math.sin(t), y: CY - r * Math.cos(t) };
}

const f = (n: number) => n.toFixed(2);

/** SVG path for a ring sector between two angles. */
export function sectorPath(start: number, end: number, rIn = R_IN, rOut = R_OUT): string {
  const e = Math.min(end, start + 359.99);
  if (e - start <= 0.001) return "";
  const large = e - start > 180 ? 1 : 0;
  const a = polar(start, rOut), b = polar(e, rOut), c = polar(e, rIn), d = polar(start, rIn);
  return `M${f(a.x)} ${f(a.y)}A${rOut} ${rOut} 0 ${large} 1 ${f(b.x)} ${f(b.y)}L${f(c.x)} ${f(c.y)}A${rIn} ${rIn} 0 ${large} 0 ${f(d.x)} ${f(d.y)}Z`;
}

/** Angle on the ring for an elapsed time, using the drawn (minimum-width adjusted) slices. */
export function angleAt(arcs: readonly Arc[], slices: readonly { seconds: number }[], elapsed: number): number {
  if (arcs.length === 0) return 0;
  const loc = locate(slices, elapsed);
  const arc = arcs[loc.index];
  if (!arc) return 0;
  if (loc.done) return arc.end;
  const len = slices[loc.index]!.seconds;
  return arc.start + (len > 0 ? loc.into / len : 0) * (arc.end - arc.start);
}

export const LABEL_FONT = 22;
export type LabelPlan = "full" | "icon" | "none";

/** Whether a slice is wide enough (along the middle of the band) to hold its name, just its emoji, or nothing. */
export function labelPlan(arcDegrees: number, name: string, hasIcon: boolean): LabelPlan {
  const arcLen = (2 * Math.PI * R_MID * arcDegrees) / 360;
  const iconW = LABEL_FONT * 1.5;
  const nameW = [...name].length * LABEL_FONT * 0.58 + (hasIcon ? iconW : 0) + 16;
  if (arcLen >= nameW) return "full";
  if (hasIcon && arcLen >= iconW + 8) return "icon";
  return "none";
}
