/** Where everything sits in the Flowers scene. Pure numbers, no DOM code. The scene is 1600 by 900. */

export const W = 1600;
export const H = 900;
export type FlowerType =
  | "daisy" | "sunflower" | "tulip" | "bell"
  | "poppy" | "daffodil" | "cosmos" | "lavender" | "rose" | "iris"
  | "moonflower" | "eveningprimrose" | "nightjasmine" | "cereus";
export const FLOWER_TYPES: FlowerType[] = [
  "daisy", "sunflower", "tulip", "bell", "poppy", "daffodil", "cosmos", "lavender", "rose", "iris",
  "moonflower", "eveningprimrose", "nightjasmine", "cereus",
];
/** The original four, used when a scene is drawn without a garden of its own (for example the New garden preview). */
export const ORIGINAL_FLOWERS: FlowerType[] = ["daisy", "sunflower", "tulip", "bell"];

/** Stem height and the rough head radius for each type, in scene units. */
export const TYPE_INFO: Record<FlowerType, { stem: number; head: number }> = {
  daisy: { stem: 165, head: 46 },
  sunflower: { stem: 205, head: 56 },
  tulip: { stem: 140, head: 36 },
  bell: { stem: 130, head: 34 },
  poppy: { stem: 150, head: 38 },
  daffodil: { stem: 150, head: 40 },
  cosmos: { stem: 175, head: 42 },
  lavender: { stem: 135, head: 30 },
  rose: { stem: 150, head: 36 },
  iris: { stem: 170, head: 44 },
  moonflower: { stem: 160, head: 48 },
  eveningprimrose: { stem: 160, head: 38 },
  nightjasmine: { stem: 145, head: 36 },
  cereus: { stem: 190, head: 56 },
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

/** `kinds` is the flower picked for each of the 12 spots (see chooseFlowers). Without it, the original four are used. */
export function plantLayout(spot: number, kinds?: readonly FlowerType[]): Plant {
  const slot = SLOT_OF_SPOT[spot] ?? 0;
  const type = kinds?.[spot] ?? (ORIGINAL_FLOWERS[slot % 4] as FlowerType);
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
const BONUS_TYPES: FlowerType[] = ["rose", "moonflower", "cereus"];
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

export const plants = (n = 12, kinds?: readonly FlowerType[]): Plant[] => Array.from({ length: n }, (_, i) => plantLayout(i, kinds));

/** Top of a fully grown plant, where its flower head sits. */
export const headPos = (p: Plant): { x: number; y: number } => ({ x: p.x, y: p.y - p.stem });

/** The plant with the biggest bloom. The hummingbird stays near it. */
export function largestBloom(kinds?: readonly FlowerType[]): Plant {
  let best = plantLayout(0, kinds);
  for (const p of plants(12, kinds)) if (TYPE_INFO[p.type].head * p.scale + p.stem * 0.001 > TYPE_INFO[best.type].head * best.scale + best.stem * 0.001) best = p;
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
export function critterPlans(kind: string, count: number, kinds?: readonly FlowerType[]): CritterPlan[] {
  const hp = (i: number) => headPos(plantLayout(i, kinds));
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
    const p = hp(largestBloom(kinds).index);
    const right = p.x < 800;
    return [{ kind, x: p.x + (right ? 112 : -112), y: p.y + 4, flip: (right ? 1 : -1) as 1 | -1, fx: right ? 1500 : -1500, fy: -420, dur: 7, delay: 0 }].slice(0, count);
  }
  return newCritterPlans(kind, count, hp);
}

const FROM_LEFT = -1500, FROM_RIGHT = 1700;
const side = (n: number) => (n % 2 === 0 ? FROM_LEFT : FROM_RIGHT);

/** Plans for the newer creatures. Ground walkers cross the soil and turn around; fliers loop through the sky; fireflies drift low over the plants. */
function newCritterPlans(kind: string, count: number, hp: (i: number) => { x: number; y: number }): CritterPlan[] {
  const one = (p: Omit<CritterPlan, "kind">): CritterPlan[] => [{ kind, ...p }].slice(0, count);
  const many = (n: number, f: (i: number) => Omit<CritterPlan, "kind">): CritterPlan[] => Array.from({ length: Math.min(n, count) }, (_, i) => ({ kind, ...f(i) }));
  switch (kind) {
    case "caterpillar": return one({ x: 280, y: 872, flip: 1, tx: 190, fx: FROM_LEFT, fy: 0, dur: 46, delay: 0 });
    case "snail": return one({ x: 1180, y: 874, flip: 1, tx: -150, fx: FROM_RIGHT, fy: 0, dur: 80, delay: -20 });
    case "robin": return one({ x: 560, y: 862, flip: 1, tx: 300, fx: FROM_LEFT, fy: -200, dur: 28, delay: -6 });
    case "rabbit": return one({ x: 1390, y: 852, flip: 1, tx: -420, fx: FROM_RIGHT, fy: 0, dur: 38, delay: -12 });
    case "frog": return one({ x: 900, y: 878, flip: 1, tx: 170, fx: FROM_LEFT, fy: 0, dur: 32, delay: -9 });
    case "hedgehog": return one({ x: 110, y: 864, flip: 1, tx: 300, fx: FROM_LEFT, fy: 0, dur: 64, delay: -30 });
    case "dragonfly": return one({ x: 640, y: 330, flip: 1, tx: 300, ty: -50, fx: FROM_LEFT, fy: -300, dur: 17, delay: -3 });
    case "moth": return many(2, (n) => ({ x: n === 0 ? 520 : 1090, y: n === 0 ? 330 : 270, flip: (n === 0 ? 1 : -1) as 1 | -1, fx: side(n), fy: -300, dur: 26 + n * 6, delay: -n * 10, color: n === 0 ? "#B9AFA0" : "#D6C8B0" }));
    case "firefly": return many(3, (n) => ({ x: [430, 860, 1240][n]!, y: [610, 540, 640][n]!, flip: 1 as const, fx: side(n), fy: -200, dur: 15 + n * 4, delay: -n * 6 }));
    case "bat": return many(2, (n) => ({ x: n === 0 ? 420 : 1180, y: n === 0 ? 170 : 240, flip: (n === 0 ? 1 : -1) as 1 | -1, tx: n === 0 ? 420 : -380, ty: 70, fx: side(n), fy: -200, dur: 22 + n * 9, delay: -n * 8 }));
    case "owl": return one({ x: 760, y: 300, flip: 1, tx: 440, ty: 60, fx: FROM_RIGHT, fy: -300, dur: 46, delay: -10 });
    case "bluebird": return one({ x: 340, y: 400, flip: -1, tx: 520, ty: 40, fx: FROM_LEFT, fy: -240, dur: 30, delay: -5 });
    default: void hp; return [];
  }
}
