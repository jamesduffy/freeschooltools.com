import { clamp, fbm, hsl, mulberry32, smoothstep } from "./noise";

/** The ocean world. Units are metres. The sea surface is y = 0 and the sea floor is 10 to 45 m below it.
 *  The diver stays inside PLAY_RADIUS. Past that the floor climbs into rock walls that the water haze hides,
 *  so there is never a visible edge. */
export const PLAY_RADIUS = 92;
export const WORLD_RADIUS = 130;

type Spire = { x: number; z: number; r: number; h: number };
const SPIRES: Spire[] = (() => {
  const rnd = mulberry32(7);
  const out: Spire[] = [];
  for (let i = 0; i < 18; i++) {
    const a = rnd() * Math.PI * 2, d = 14 + rnd() * 84;
    out.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, r: 2.6 + rnd() * 4.5, h: 9 + rnd() * 20 });
  }
  return out;
})();

/** Height of the sea floor at (x, z). */
export function groundHeight(x: number, z: number): number {
  const wx = x + 26 * (fbm(x * 0.017, z * 0.017, 3, 11) - 0.5);
  const wz = z + 26 * (fbm(x * 0.017 + 40, z * 0.017, 3, 12) - 0.5);
  let h = -36 + 16 * (fbm(wx * 0.011, wz * 0.011, 3, 1) - 0.5);
  // reef platforms: broad flat-topped rises that corals grow on
  const m = fbm(wx * 0.019 + 50, wz * 0.019, 4, 2);
  h += smoothstep(0.5, 0.64, m) * 22;
  // sand channels between them
  const c = Math.abs(fbm(wx * 0.014 + 90, wz * 0.014, 3, 3) - 0.5);
  h -= (1 - smoothstep(0, 0.055, c)) * 6;
  // rock spires
  for (const s of SPIRES) {
    const dx = x - s.x, dz = z - s.z;
    const d2 = (dx * dx + dz * dz) / (s.r * s.r);
    if (d2 < 9) h += s.h * Math.exp(-d2) * (0.85 + 0.3 * fbm(x * 0.3, z * 0.3, 2, 4));
  }
  // fine rock texture, stronger on higher ground
  h += (fbm(x * 0.11, z * 0.11, 3, 5) - 0.5) * 2.2 * smoothstep(-40, -18, h) + (fbm(x * 0.4, z * 0.4, 2, 6) - 0.5) * 0.5;
  // nothing inside the play area reaches the surface: soft ceiling at about -2.5 m
  if (h > -9) h = -9 + 6.5 * Math.tanh((h + 9) / 6.5);
  // distant walls
  const r = Math.hypot(x, z);
  h += smoothstep(PLAY_RADIUS + 6, WORLD_RADIUS - 6, r) * 52 * (0.7 + 0.6 * fbm(x * 0.05, z * 0.05, 3, 8));
  return Math.min(h, 4);
}

export function groundSlope(x: number, z: number): number {
  const e = 1.2;
  const dx = groundHeight(x + e, z) - groundHeight(x - e, z);
  const dz = groundHeight(x, z + e) - groundHeight(x, z - e);
  return Math.hypot(dx, dz) / (2 * e);
}

export type Poi = { x: number; y: number; z: number; name: string; kind: string; r: number };

export const KELP_STRIDE = 8; // x y z height phase width hue seed
export const GRASS_STRIDE = 8;
export const INST_STRIDE = 12; // pos xyz + scale | yaw, ySquash, sway seed, 0 | tint rgb + glow

export type PropKind = "rock0" | "rock1" | "rock2" | "branch0" | "branch1" | "branch2" | "fan" | "brain" | "barrel" | "tube" | "mat";
export const PROP_KINDS: PropKind[] = ["rock0", "rock1", "rock2", "branch0", "branch1", "branch2", "fan", "brain", "barrel", "tube", "mat"];

export interface World {
  kelp: Float32Array;
  grass: Float32Array;
  props: Record<PropKind, Float32Array>;
  vents: Float32Array; // x y z
  wreck: { x: number; y: number; z: number; yaw: number };
  canopy: Uint8Array; // CANOPY_N * CANOPY_N, kelp cover from above
  pois: Poi[];
}
export const CANOPY_N = 128;
export const CANOPY_SPAN = 256; // metres covered, centred on the origin

/** Everything is placed with a fixed seed, so it is always the same reef. Full counts are built; the renderer
 *  draws only the first part of each list on slower devices, which thins them evenly. */
export function buildWorld(scale = 1): World {
  const rnd = mulberry32(2024);
  const r = (a: number, b: number) => a + (b - a) * rnd();
  const inDisc = (rad: number): [number, number] => {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * rad;
    return [Math.cos(a) * d, Math.sin(a) * d];
  };

  // --- kelp: clumps in patches on mid-depth ground
  const kelp: number[] = [];
  const canopy = new Float32Array(CANOPY_N * CANOPY_N);
  const nKelp = Math.round(2600 * scale);
  for (let tries = 0; kelp.length / KELP_STRIDE < nKelp && tries < 60000; tries++) {
    const [x, z] = inDisc(PLAY_RADIUS + 14);
    const g = groundHeight(x, z);
    if (g > -17 || g < -42 || groundSlope(x, z) > 0.8) continue;
    const patch = fbm(x * 0.035 + 7, z * 0.035, 3, 21);
    if (patch < 0.46 || rnd() > (patch - 0.4) * 3) continue;
    const blades = 2 + Math.floor(rnd() * 4);
    for (let b = 0; b < blades; b++) {
      const bx = x + r(-0.9, 0.9), bz = z + r(-0.9, 0.9), bg = groundHeight(bx, bz);
      const hgt = clamp(-bg * r(0.35, 0.8), 6, 27);
      kelp.push(bx, bg - 0.2, bz, hgt, r(0, 6.28), r(0.14, 0.3), rnd(), rnd());
      const cx = Math.floor(((bx + CANOPY_SPAN / 2) / CANOPY_SPAN) * CANOPY_N), cz = Math.floor(((bz + CANOPY_SPAN / 2) / CANOPY_SPAN) * CANOPY_N);
      if (cx >= 0 && cz >= 0 && cx < CANOPY_N && cz < CANOPY_N) canopy[cz * CANOPY_N + cx] = (canopy[cz * CANOPY_N + cx] ?? 0) + 0.16 * Math.min(1, hgt / 12);
    }
  }
  const canopyBytes = new Uint8Array(CANOPY_N * CANOPY_N);
  for (let z = 0; z < CANOPY_N; z++) {
    for (let x = 0; x < CANOPY_N; x++) {
      let s = 0, w = 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, zz = z + dz;
        if (xx < 0 || zz < 0 || xx >= CANOPY_N || zz >= CANOPY_N) continue;
        const k = dx === 0 && dz === 0 ? 2 : 1;
        s += (canopy[zz * CANOPY_N + xx] ?? 0) * k; w += k;
      }
      canopyBytes[z * CANOPY_N + x] = Math.round(clamp(s / w, 0, 1) * 255);
    }
  }

  // --- seagrass tufts on sand and gentle ground
  const grass: number[] = [];
  const nGrass = Math.round(7000 * scale);
  for (let tries = 0; grass.length / GRASS_STRIDE < nGrass && tries < 80000; tries++) {
    const [x, z] = inDisc(PLAY_RADIUS + 10);
    const g = groundHeight(x, z);
    if (g > -9 || groundSlope(x, z) > 0.55) continue;
    if (fbm(x * 0.05 + 3, z * 0.05, 3, 31) < 0.45) continue;
    grass.push(x, g - 0.1, z, r(0.5, 1.6), r(0, 6.28), r(0.05, 0.1), rnd(), rnd());
  }

  // --- rocks, corals, sponges
  const bag: Record<PropKind, number[]> = {} as Record<PropKind, number[]>;
  for (const k of PROP_KINDS) bag[k] = [];
  const put = (k: PropKind, x: number, g: number, z: number, size: number, tint: [number, number, number], glow = 0, squash = 1, sink = 0.15) => {
    bag[k].push(x, g - sink * size, z, size, r(0, 6.28), squash, rnd() * 100, 0, tint[0], tint[1], tint[2], glow);
  };
  const rockTint = (): [number, number, number] => hsl(r(0.05, 0.12), r(0.08, 0.25), r(0.2, 0.34));
  for (let i = 0, n = Math.round(520 * scale); i < n; i++) {
    const [x, z] = inDisc(PLAY_RADIUS + 14);
    const g = groundHeight(x, z);
    put(`rock${Math.floor(rnd() * 3)}` as PropKind, x, g, z, r(0.5, 3.4) * (rnd() < 0.1 ? 2 : 1), rockTint(), 0, r(0.55, 1), 0.3);
  }
  const reefMask = (x: number, z: number) => fbm(x * 0.06 + 11, z * 0.06, 3, 41);
  const coral = (kind: PropKind, count: number, gMin: number, gMax: number, sz: [number, number], hueFn: () => [number, number, number], glow = 0, minMask = 0.5) => {
    let placed = 0;
    for (let tries = 0; placed < Math.round(count * scale) && tries < 90000; tries++) {
      const [x, z] = inDisc(PLAY_RADIUS + 8);
      const g = groundHeight(x, z);
      if (g < gMin || g > gMax || groundSlope(x, z) > 1.1) continue;
      if (reefMask(x, z) < minMask) continue;
      put(kind, x, g, z, r(sz[0], sz[1]), hueFn(), glow, r(0.8, 1.2), 0.05);
      placed++;
    }
  };
  const warm = () => hsl(r(0.0, 0.1), r(0.6, 0.9), r(0.45, 0.62));
  const orchid = () => hsl(r(0.76, 0.93), r(0.5, 0.85), r(0.5, 0.65));
  const teal = () => hsl(r(0.45, 0.52), r(0.45, 0.8), r(0.45, 0.6));
  const gold = () => hsl(r(0.1, 0.16), r(0.7, 0.95), r(0.5, 0.62));
  const anyCoral = () => [warm, orchid, teal, gold, orchid][Math.floor(rnd() * 5)]!();
  coral("branch0", 460, -26, -4, [0.7, 1.9], anyCoral, 0.12);
  coral("branch1", 400, -26, -4, [0.7, 2.1], anyCoral, 0.12);
  coral("branch2", 360, -26, -4, [0.6, 1.6], orchid, 0.2);
  coral("fan", 300, -30, -5, [0.8, 2.2], () => hsl(r(0.82, 0.98), r(0.55, 0.85), r(0.5, 0.62)), 0.1);
  coral("brain", 300, -24, -5, [0.5, 1.5], () => hsl(r(0.08, 0.18), r(0.4, 0.7), r(0.42, 0.58)), 0.05);
  coral("barrel", 320, -42, -8, [0.5, 1.6], () => hsl(r(0.0, 0.07), r(0.35, 0.6), r(0.3, 0.45)), 0.04, 0.4);
  coral("tube", 300, -34, -6, [0.5, 1.3], () => hsl(r(0.55, 0.9), r(0.45, 0.8), r(0.5, 0.65)), 0.18, 0.4);
  coral("mat", 1100, -40, -6, [0.3, 1.0], () => hsl(r(0.8, 0.97), r(0.4, 0.75), r(0.4, 0.55)), 0.25, 0.4);

  // --- bubble vents
  const vents: number[] = [];
  for (let tries = 0; vents.length < 3 * 9 && tries < 4000; tries++) {
    const [x, z] = inDisc(PLAY_RADIUS - 8);
    const g = groundHeight(x, z);
    if (g > -14 || g < -40 || groundSlope(x, z) > 0.4) continue;
    vents.push(x, g, z);
  }

  // --- the wreck: a flat spot near the middle of the play area
  let wreck = { x: 0, y: 0, z: 0, yaw: 0.6 };
  {
    let best = 1e9;
    for (let tries = 0; tries < 800; tries++) {
      const [x, z] = inDisc(60);
      if (Math.hypot(x, z) < 22) continue;
      const g = groundHeight(x, z);
      if (g < -40 || g > -24) continue;
      let rough = 0;
      for (let k = 0; k < 8; k++) rough += Math.abs(groundHeight(x + Math.cos(k) * 12, z + Math.sin(k) * 12) - g);
      if (rough < best) { best = rough; wreck = { x, y: g, z, yaw: r(0, 6.28) }; }
    }
    // flatten the floor under it by lifting it a little: the hull is sunk partly into the sand
    wreck.y = groundHeight(wreck.x, wreck.z) + 1.4;
  }

  const pois: Poi[] = [{ x: wreck.x, y: wreck.y + 3, z: wreck.z, name: "an old shipwreck", kind: "wreck", r: 14 }];
  for (let i = 0; i < vents.length; i += 3) pois.push({ x: vents[i]!, y: vents[i + 1]! + 4, z: vents[i + 2]!, name: "bubbles rising from the sand", kind: "vent", r: 8 });

  const props = {} as Record<PropKind, Float32Array>;
  for (const k of PROP_KINDS) props[k] = new Float32Array(bag[k]);
  return { kelp: new Float32Array(kelp), grass: new Float32Array(grass), props, vents: new Float32Array(vents), wreck, canopy: canopyBytes, pois };
}

// ---- fast floor lookup: the exact function is a little costly, so animals and the diver read a 1 m grid of it
const GRID_CELL = 1, GRID_HALF = WORLD_RADIUS + 12, GRID_N = Math.ceil((GRID_HALF * 2) / GRID_CELL) + 1;
let grid: Float32Array | null = null;
function buildGrid(): Float32Array {
  const g = new Float32Array(GRID_N * GRID_N);
  for (let j = 0; j < GRID_N; j++) for (let i = 0; i < GRID_N; i++) g[j * GRID_N + i] = groundHeight(i * GRID_CELL - GRID_HALF, j * GRID_CELL - GRID_HALF);
  return g;
}
/** Same as groundHeight, but read from a table (bilinear). Used for things that ask many times per frame. */
export function groundFast(x: number, z: number): number {
  grid ??= buildGrid();
  const fx = clamp((x + GRID_HALF) / GRID_CELL, 0, GRID_N - 1.001), fz = clamp((z + GRID_HALF) / GRID_CELL, 0, GRID_N - 1.001);
  const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
  const i = iz * GRID_N + ix;
  const a = grid[i]!, b = grid[i + 1]!, c = grid[i + GRID_N]!, d = grid[i + GRID_N + 1]!;
  return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
}
