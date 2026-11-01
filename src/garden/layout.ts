/** Where everything sits in the Flowers scene. Pure numbers, no DOM code. The scene is 1600 by 900. */

export const W = 1600;
export const H = 900;
export type FlowerType = "daisy" | "sunflower" | "tulip" | "bell";
export const FLOWER_TYPES: FlowerType[] = ["daisy", "sunflower", "tulip", "bell"];

/** Stem height and the rough head radius for each type, in scene units. */
export const TYPE_INFO: Record<FlowerType, { stem: number; head: number }> = {
  daisy: { stem: 165, head: 46 },
  sunflower: { stem: 205, head: 56 },
  tulip: { stem: 140, head: 36 },
  bell: { stem: 130, head: 34 },
};

export type Plant = {
  index: number;
  type: FlowerType;
  x: number;
  y: number;
  scale: number;
  stem: number;       // stem height after scale
  flip: 1 | -1;
  swayDur: number;    // seconds
  swayDelay: number;  // seconds, negative so plants start out of step
  swayAmp: number;    // degrees
};

/** Which place along the soil each spot uses. Spread out, so early growers are not all in one corner. */
const SLOT_OF_SPOT = [4, 9, 1, 6, 11, 2, 7, 0, 10, 3, 8, 5];
const HEIGHT_VARIATION = [1.0, 0.92, 1.08, 0.88, 1.12, 0.96, 1.04, 0.9, 1.1, 0.98, 0.86, 1.06];
const SLOT_X0 = 170;
const SLOT_DX = 114;
/** Overall plant size. Bigger plants fill the picture so it reads from the back of the room. */
const K = 1.5;

const bandOf = (slot: number) => (Math.floor(slot / 2) % 2 === 0 ? "back" : "front");

export function plantLayout(spot: number): Plant {
  const slot = SLOT_OF_SPOT[spot] ?? 0;
  const type = FLOWER_TYPES[slot % 4] as FlowerType;
  const back = bandOf(slot) === "back";
  const scale = (back ? 0.88 : 1) * (HEIGHT_VARIATION[spot] ?? 1) * K;
  return {
    index: spot, type,
    x: Math.round(SLOT_X0 + slot * SLOT_DX),
    y: back ? 735 : 812,
    scale,
    stem: Math.round(TYPE_INFO[type].stem * scale),
    flip: spot % 2 === 0 ? 1 : -1,
    swayDur: 6.5 + ((spot * 7) % 5) * 0.9,
    swayDelay: -((spot * 13) % 9) * 0.8,
    swayAmp: 1.2 + (spot % 3) * 0.35,
  };
}

/** Bonus blooms sit in the gaps along the front edge, a little smaller so they do not hide the others. */
const BONUS_TYPES: FlowerType[] = ["sunflower", "daisy", "tulip"];
export function bonusLayout(k: number): Plant {
  const type = BONUS_TYPES[k % 3] as FlowerType;
  const scale = 0.72 * K;
  return {
    index: 100 + k, type,
    x: [341, 797, 1253][k] ?? 800,
    y: 888, scale,
    stem: Math.round(TYPE_INFO[type].stem * scale),
    flip: k % 2 === 0 ? -1 : 1,
    swayDur: 7.4 + k * 0.8, swayDelay: -k * 2.1, swayAmp: 1.6,
  };
}

export const plants = (n = 12): Plant[] => Array.from({ length: n }, (_, i) => plantLayout(i));

/** Top of a fully grown plant, where its flower head sits. */
export const headPos = (p: Plant): { x: number; y: number } => ({ x: p.x, y: p.y - p.stem });

/** The plant with the biggest bloom. The hummingbird stays near it. */
export function largestBloom(): Plant {
  let best = plantLayout(0);
  for (const p of plants()) if (TYPE_INFO[p.type].head * p.scale + p.stem * 0.001 > TYPE_INFO[best.type].head * best.scale + best.stem * 0.001) best = p;
  return best;
}

export type CritterPlan = {
  kind: string;
  /** Where it settles, in scene units. Ladybugs live on a stem instead (see `host`). */
  x: number; y: number;
  flip: 1 | -1;
  /** Which spot's stem a ladybug crawls on. */
  host?: number;
  /** Travel distance for bees (to the neighbouring bloom). */
  tx?: number; ty?: number;
  /** Where it flies in from, relative to where it settles. */
  fx: number; fy: number;
  dur: number; delay: number;
  color?: string;
};

/** One entry per creature in the order they arrive. Positions follow the layout of fully grown plants. */
export function critterPlans(kind: string, count: number): CritterPlan[] {
  const hp = (i: number) => headPos(plantLayout(i));
  if (kind === "ladybug") {
    return [0, 2].slice(0, count).map((host, n) => ({ kind, x: 0, y: 0, flip: 1 as const, host, fx: n === 0 ? -1500 : 1700, fy: -240, dur: 21 + n * 6, delay: -n * 9 }));
  }
  if (kind === "butterfly") {
    return [1, 3].slice(0, count).map((spot, n) => {
      const p = hp(spot);
      return { kind, x: p.x + (n === 0 ? 50 : -50), y: p.y - 62, flip: 1 as const, fx: n === 0 ? -1500 : 1700, fy: -300, dur: 24 + n * 7, delay: -n * 11, color: n === 0 ? "#F5A55B" : "#8CA6F2" };
    });
  }
  if (kind === "bee") {
    const spots = [5, 0];
    return spots.slice(0, count).map((spot, n) => {
      const a = hp(spot), b = hp(spots[1 - n] as number);
      return { kind, x: a.x + 16, y: a.y - 38, flip: (b.x > a.x ? -1 : 1) as 1 | -1, tx: b.x - a.x, ty: b.y - a.y, fx: n === 0 ? -1500 : 1700, fy: -180, dur: 26, delay: -n * 13 };
    });
  }
  if (kind === "hummingbird") {
    const p = hp(largestBloom().index);
    const right = p.x < 800;
    return [{ kind, x: p.x + (right ? 112 : -112), y: p.y + 4, flip: (right ? 1 : -1) as 1 | -1, fx: right ? 1500 : -1500, fy: -420, dur: 7, delay: 0 }].slice(0, count);
  }
  return [];
}
