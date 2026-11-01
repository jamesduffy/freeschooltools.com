/** Pure simulation for the Fish Tank toy. No DOM. Positions are pixels in the tank. */

export type Bounds = { w: number; h: number; floorTop: number };

export type Fish = {
  x: number; y: number; // center
  vx: number; vy: number; // px per second
  cruise: number; // normal swimming speed, px/s
  half: { w: number; h: number }; // half the drawn size, keeps the fish inside the tank
  tx: number; ty: number; // where it is heading
  retarget: number; // seconds until it picks a new spot
  /** Tilt follows the swim direction for flat fish, but upright fish (seahorse, jellyfish) stay upright. */
  upright: boolean;
  /** If set, this fish follows another fish at an offset (the minnow school). */
  follow?: { leader: number; dx: number; dy: number };
};

export const FLEE_MULTIPLIER = 10; // top flee speed, as a multiple of cruise speed
export const RELAX_PER_SECOND = 1.6; // how quickly a scared fish calms down

const rand = (a: number, b: number, r: () => number) => a + (b - a) * r();

export function newTarget(f: Fish, b: Bounds, r: () => number = Math.random): void {
  f.tx = rand(f.half.w, b.w - f.half.w, r);
  f.ty = rand(f.half.h + 8, Math.max(f.half.h + 9, b.floorTop - f.half.h - 6), r);
  f.retarget = rand(3, 8, r);
}

/** Move one fish forward by dt seconds. `fishes` is needed only for followers. */
export function stepFish(f: Fish, dt: number, b: Bounds, fishes: Fish[] = [], r: () => number = Math.random): void {
  if (f.follow) {
    const l = fishes[f.follow.leader];
    if (l) { f.tx = l.x + f.follow.dx; f.ty = l.y + f.follow.dy; }
  } else {
    f.retarget -= dt;
    if (f.retarget <= 0 || Math.hypot(f.tx - f.x, f.ty - f.y) < f.cruise * 0.25) newTarget(f, b, r);
  }
  // steer toward the target at cruise speed; a scare leaves extra speed that fades away
  const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy) || 1;
  const speed = f.follow ? Math.min(f.cruise * 1.4, Math.max(f.cruise * 0.4, d * 1.5)) : f.cruise;
  const k = 1 - Math.exp(-dt * RELAX_PER_SECOND);
  f.vx += (((dx / d) * speed) - f.vx) * k;
  f.vy += (((dy / d) * speed) - f.vy) * k;
  f.x += f.vx * dt;
  f.y += f.vy * dt;
  // stay inside the tank, bouncing off the walls and the sand
  const minX = f.half.w, maxX = b.w - f.half.w, minY = f.half.h + 4, maxY = Math.max(minY + 1, b.floorTop - f.half.h);
  if (f.x < minX) { f.x = minX; f.vx = Math.abs(f.vx); }
  if (f.x > maxX) { f.x = maxX; f.vx = -Math.abs(f.vx); }
  if (f.y < minY) { f.y = minY; f.vy = Math.abs(f.vy); }
  if (f.y > maxY) { f.y = maxY; f.vy = -Math.abs(f.vy); }
}

/** A tap (or finger drag) at (tx, ty): fish within `radius` shoot away from it. Closer means faster. */
export function scareFish(f: Fish, tx: number, ty: number, radius: number, strength = 1, r: () => number = Math.random): boolean {
  const dx = f.x - tx, dy = f.y - ty, d = Math.hypot(dx, dy);
  if (d > radius) return false;
  const falloff = Math.max(0.35, Math.pow(1 - d / radius, 0.6));
  let ux: number, uy: number;
  if (d < 1) { const a = r() * Math.PI * 2; ux = Math.cos(a); uy = Math.sin(a); } else { ux = dx / d; uy = dy / d; }
  f.vx += ux * f.cruise * FLEE_MULTIPLIER * falloff * strength;
  f.vy += uy * f.cruise * FLEE_MULTIPLIER * falloff * strength;
  const sp = Math.hypot(f.vx, f.vy), cap = f.cruise * FLEE_MULTIPLIER;
  if (sp > cap) { f.vx *= cap / sp; f.vy *= cap / sp; }
  // head somewhere new once it has calmed down, instead of swimming straight back
  f.retarget = Math.min(f.retarget, 0.6);
  return true;
}

// ---- floor creatures ----------------------------------------------------------

export type FloorKind = "crab" | "starfish" | "hermit";

export type Walker = {
  kind: FloorKind;
  x: number; y: number; // y is the position inside the sand band, 0 (far) to 1 (near)
  dir: 1 | -1;
  state: "walk" | "idle" | "run" | "hide";
  timer: number; // seconds left in the current state
  walk: number; // walking speed, px/s
  runMult: number; // how much faster it runs when scared
  half: number; // half its drawn width
};

export function stepWalker(c: Walker, dt: number, b: Bounds, r: () => number = Math.random): void {
  c.timer -= dt;
  if (c.timer <= 0) {
    if (c.state === "walk") { c.state = "idle"; c.timer = rand(1, 3.5, r); }
    else {
      c.state = "walk"; c.timer = rand(2, 6, r);
      c.dir = r() < 0.5 ? 1 : -1;
      c.y = Math.min(1, Math.max(0, c.y + rand(-0.15, 0.15, r)));
    }
  }
  const v = c.state === "walk" ? c.walk : c.state === "run" ? c.walk * c.runMult : 0;
  c.x += c.dir * v * dt;
  if (c.x < c.half) { c.x = c.half; c.dir = 1; }
  if (c.x > b.w - c.half) { c.x = b.w - c.half; c.dir = -1; }
}

/** Floor creatures run away from a tap (the hermit crab hides in its shell for a moment instead). */
export function scareWalker(c: Walker, tx: number, ty: number, radius: number, floorY: number): boolean {
  const d = Math.hypot(c.x - tx, floorY - ty);
  if (d > radius) return false;
  if (c.kind === "hermit") { c.state = "hide"; c.timer = 2.4; return true; }
  c.dir = c.x >= tx ? 1 : -1;
  c.state = "run"; c.timer = 1.1;
  return true;
}
