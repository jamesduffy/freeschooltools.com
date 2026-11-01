/** Growth math. Pure functions on plain numbers, no DOM code. */

export const SPOTS = 12;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const round9 = (n: number) => Math.round(n * 1e9) / 1e9;

/** progress = total / goal. It can pass 1. */
export const progressOf = (total: number, goal: number): number => (goal > 0 ? total / goal : 0);

/** growth(i) = clamp((progress * 100 - i * 5) / 40, 0, 1). Spot i starts at i*5 percent and is in full bloom 40 points later. */
export function growth(i: number, progress: number): number {
  return clamp01(round9((progress * 100 - i * 5) / 40));
}

/** Same math from whole numbers, so there is no rounding at all. The app uses this one. */
export function growthAt(i: number, total: number, goal: number): number {
  return clamp01((total * 100 - i * 5 * goal) / (40 * goal));
}

export const spotGrowths = (total: number, goal: number, spots = SPOTS): number[] =>
  Array.from({ length: spots }, (_, i) => growthAt(i, total, goal));

/** True once total is at least `percent` percent of goal. Whole-number math, so 20 percent is exactly 20 percent. */
export const reached = (total: number, goal: number, percent: number): boolean => total * 100 >= percent * goal;

export type Milestone = { kind: string; percent: number; count: number };

/** Which creature kinds have arrived, with how many of each. */
export function arrivedCreatures(total: number, goal: number, milestones: readonly Milestone[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of milestones) if (reached(total, goal, m.percent)) out[m.kind] = m.count;
  return out;
}

/** How many bonus blooms are showing (0 to bonus.length). Bonus blooms start at 110, 125 and 150 percent. */
export function bonusBlooms(total: number, goal: number, bonus: readonly number[]): number {
  return bonus.filter((p) => reached(total, goal, p)).length;
}

/** Growth of bonus bloom k: it appears at its percent and finishes growing 10 points later. */
export function bonusGrowth(k: number, total: number, goal: number, bonus: readonly number[]): number {
  const p = bonus[k];
  if (p === undefined || !reached(total, goal, p)) return 0;
  return 0.3 + 0.7 * clamp01((total * 100 - p * goal) / (10 * goal));
}

/** How one plant is drawn at a given growth: a continuous function, so every addition moves something. */
export function plantShape(g: number): { stem: number; headScale: number; headOpacity: number; bloom: number } {
  return {
    stem: clamp01(round9(g / 0.6)),
    headScale: 0.25 + 0.75 * clamp01((g - 0.1) / 0.9),
    headOpacity: clamp01((g - 0.12) / 0.1),
    bloom: clamp01(round9((g - 0.55) / 0.45)),
  };
}

export const percentOf = (total: number, goal: number): number => Math.floor((total * 100) / goal);

export const fmt = (n: number): string => n.toLocaleString("en-US");

/** "240 of 500 books read" */
export const progressText = (total: number, goal: number, unit: string): string => `${fmt(total)} of ${fmt(goal)} ${unit}`;

/** What the live region reads out after a change. */
export const announceText = (total: number, goal: number, unit: string): string =>
  `${progressText(total, goal, unit)}. ${percentOf(total, goal)} percent.`;
