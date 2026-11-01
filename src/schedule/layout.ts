/** Sizes for the Whole day board. Pure, so it can be tested. With many cards, spacing shrinks first, then sizes,
 *  and only then does the list scroll. Labels never go below 28px (44px on the Now card) and icons never below 96px. */
export type DayLayout = { gap: number; pad: number; icon: number; label: number; nowIcon: number; nowLabel: number; nowPad: number; fits: boolean };

const MAX = { gap: 14, pad: 12, icon: 112, label: 40, nowIcon: 156, nowLabel: 64, nowPad: 18 };
const MIN = { gap: 6, pad: 4, icon: 96, label: 28, nowIcon: 112, nowLabel: 44, nowPad: 8 };
const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

function build(spacing: number, size: number): Omit<DayLayout, "fits"> {
  // spacing and size: 0 = smallest, 1 = largest
  return {
    gap: lerp(MIN.gap, MAX.gap, spacing),
    pad: lerp(MIN.pad, MAX.pad, spacing),
    nowPad: lerp(MIN.nowPad, MAX.nowPad, spacing),
    icon: lerp(MIN.icon, MAX.icon, size),
    label: lerp(MIN.label, MAX.label, size),
    nowIcon: lerp(MIN.nowIcon - 0, MAX.nowIcon, size),
    nowLabel: lerp(MIN.nowLabel, MAX.nowLabel, size),
  };
}
export const totalHeight = (n: number, l: Omit<DayLayout, "fits">): number =>
  n <= 0 ? 0 : (n - 1) * (l.icon + 2 * l.pad) + (l.nowIcon + 2 * l.nowPad) + (n - 1) * l.gap;

/** `availableHeight` is the space for the card column in pixels. */
export function dayLayout(n: number, availableHeight: number): DayLayout {
  for (let k = 0; k <= 10; k++) { const l = build(1 - k / 10, 1); if (totalHeight(n, l) <= availableHeight) return { ...l, fits: true }; }
  for (let k = 1; k <= 10; k++) { const l = build(0, 1 - k / 10); if (totalHeight(n, l) <= availableHeight) return { ...l, fits: true }; }
  return { ...build(0, 0), fits: false };
}
