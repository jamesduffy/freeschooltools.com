/** Pure simulation for the Fish Tank toy. No DOM. Positions are pixels in the tank.
 *  Everything travels across the screen in one direction and leaves the far side: no wandering, no bouncing off walls. */

export type Bounds = { w: number; h: number; floorTop: number };

export type Fish = {
  x: number; y: number; // center
  vx: number; vy: number; // px per second
  cruise: number; // normal swimming speed, px/s
  half: { w: number; h: number }; // half the drawn size
  /** Which way it is crossing the tank: -1 toward the left edge, 1 toward the right. It almost never changes. */
  heading: -1 | 1;
  ty: number; // gentle up-and-down drift target
  retarget: number; // seconds until the drift target changes
  /** Tilt follows the swim direction for flat fish, but upright fish (seahorse, jellyfish) stay upright. */
  upright: boolean;
  /** If set, this fish trails another fish at an offset (the schools). */
  follow?: { leader: number; dx: number; dy: number };
  /** "in": still swimming in from off screen. "out": following a fixed exit (used by school members once the leader has left). */
  mode?: "in" | "out";
  exitX?: number;
};

export const FLEE_MULTIPLIER = 10; // top flee speed, as a multiple of cruise speed
export const RELAX_PER_SECOND = 1.6; // how quickly a scared fish calms down

const rand = (a: number, b: number, r: () => number) => a + (b - a) * r();

export const isOffscreen = (f: Fish, b: Bounds): boolean => f.x < -f.half.w || f.x > b.w + f.half.w;
/** Is it on the side it is heading toward, beyond the edge? Arriving fish start off the other side, so this is only true once it has crossed. */
export const hasExited = (f: Fish, b: Bounds): boolean => (f.heading > 0 ? f.x > b.w + f.half.w : f.x < -f.half.w);

const exitTarget = (f: Fish, b: Bounds, side: -1 | 1) => (side < 0 ? -f.half.w * 3 : b.w + f.half.w * 3);

/** A new gentle up-and-down drift: a short hop from where it is, never a turn-around. */
export function newDrift(f: Fish, b: Bounds, r: () => number = Math.random): void {
  const lo = f.half.h + 8, hi = Math.max(lo + 1, b.floorTop - f.half.h - 6);
  f.ty = Math.min(hi, Math.max(lo, f.y + rand(-0.18, 0.18, r) * b.h));
  f.retarget = rand(3, 7, r);
}

/** Make a fish head for the given side from now on. `side` defaults to the way it is already going. */
export function sendAway(f: Fish, b: Bounds, side?: -1 | 1): void {
  const s = side ?? f.heading;
  f.heading = s; f.mode = "out"; f.exitX = exitTarget(f, b, s);
}

/** Move one fish forward by dt seconds. `fishes` is needed only for followers. */
export function stepFish(f: Fish, dt: number, b: Bounds, fishes: Fish[] = [], r: () => number = Math.random): void {
  let tx: number, ty: number;
  if (f.mode === "out") { tx = f.exitX ?? exitTarget(f, b, f.heading); ty = f.y; }
  else if (f.follow) {
    const l = fishes[f.follow.leader];
    tx = l ? l.x + f.follow.dx : f.x + f.heading * 100; ty = l ? l.y + f.follow.dy : f.y;
  } else {
    f.retarget -= dt;
    if (f.retarget <= 0) newDrift(f, b, r);
    tx = exitTarget(f, b, f.heading); ty = f.ty;
  }
  // steer toward the target at cruise speed; a scare leaves extra speed that fades away
  const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy) || 1;
  const speed = f.follow && f.mode !== "out" ? Math.min(f.cruise * 1.4, Math.max(f.cruise * 0.4, d * 1.5)) : f.cruise;
  const k = 1 - Math.exp(-dt * RELAX_PER_SECOND);
  // up-and-down movement is kept gentle, so fish cross the tank rather than zig-zag
  const vyScale = f.follow && f.mode !== "out" ? 1 : 0.5;
  f.vx += (((dx / d) * speed) - f.vx) * k;
  f.vy += (((dy / d) * speed * vyScale) - f.vy) * k;
  f.x += f.vx * dt;
  f.y += f.vy * dt;
  if (f.mode === "in" && f.x >= f.half.w && f.x <= b.w - f.half.w) f.mode = undefined; // it has swum all the way in
  // stay between the surface and the sand (the sides are open)
  const minY = f.half.h + 4, maxY = Math.max(minY + 1, b.floorTop - f.half.h);
  if (f.y < minY) { f.y = minY; f.vy = Math.max(0, f.vy); }
  if (f.y > maxY) { f.y = maxY; f.vy = Math.min(0, f.vy); }
}

/** A tap (or finger drag) at (tx, ty): fish within `radius` shoot away from it. Closer means faster.
 *  A real tap (strength 1) also turns the fish toward the side it is fleeing to, so it keeps going and leaves instead of coming back. */
export function scareFish(f: Fish, tx: number, ty: number, radius: number, strength = 1, r: () => number = Math.random): boolean {
  const dx = f.x - tx, dy = f.y - ty, d = Math.hypot(dx, dy);
  if (d > radius) return false;
  const falloff = Math.max(0.35, Math.pow(1 - d / radius, 0.6));
  let ux: number, uy: number;
  if (d < 1) { const a = r() * Math.PI * 2; ux = Math.cos(a); uy = Math.sin(a); } else { ux = dx / d; uy = dy / d; }
  f.vx += ux * f.cruise * FLEE_MULTIPLIER * falloff * strength;
  f.vy += uy * f.cruise * FLEE_MULTIPLIER * falloff * strength * 0.6;
  const sp = Math.hypot(f.vx, f.vy), cap = f.cruise * FLEE_MULTIPLIER;
  if (sp > cap) { f.vx *= cap / sp; f.vy *= cap / sp; }
  if (strength >= 1 && Math.abs(ux) > 0.3 && f.mode !== "out") f.heading = ux > 0 ? 1 : -1;
  return true;
}

// ---- floor creatures ----------------------------------------------------------

export type FloorKind = "crab" | "starfish" | "hermit";

export type Walker = {
  kind: FloorKind;
  x: number; y: number; // y is the position inside the sand band, 0 (far) to 1 (near)
  dir: 1 | -1; // which way it is crossing the sand. It does not turn around.
  state: "walk" | "idle" | "run" | "hide";
  timer: number; // seconds left in the current state
  walk: number; // walking speed, px/s
  runMult: number; // how much faster it runs when scared
  half: number; // half its drawn width
  /** "in": still walking in from off screen. */
  mode?: "in";
};

export const isWalkerOffscreen = (c: Walker, b: Bounds): boolean => c.x < -c.half || c.x > b.w + c.half;
export const walkerExited = (c: Walker, b: Bounds): boolean => (c.dir > 0 ? c.x > b.w + c.half : c.x < -c.half);

/** Walk across, resting now and then, never turning around. */
export function stepWalker(c: Walker, dt: number, b: Bounds, r: () => number = Math.random): void {
  c.timer -= dt;
  if (c.mode === "in" && c.x >= c.half && c.x <= b.w - c.half) c.mode = undefined;
  if (c.timer <= 0 && !c.mode) {
    if (c.state === "walk") { c.state = "idle"; c.timer = rand(0.8, 2.5, r); }
    else { c.state = "walk"; c.timer = rand(3, 8, r); c.y = Math.min(1, Math.max(0, c.y + rand(-0.1, 0.1, r))); }
  } else if (c.timer <= 0) { c.state = "walk"; c.timer = 1; }
  const v = c.state === "walk" ? c.walk : c.state === "run" ? c.walk * c.runMult : 0;
  c.x += c.dir * v * dt;
}

/** Floor creatures run away from a tap, and keep going the same way so they leave. A hermit crab hides in its shell for a moment instead. */
export function scareWalker(c: Walker, tx: number, ty: number, radius: number, floorY: number): boolean {
  const d = Math.hypot(c.x - tx, floorY - ty);
  if (d > radius) return false;
  if (c.kind === "hermit") { c.state = "hide"; c.timer = 2.4; return true; }
  c.dir = c.x >= tx ? 1 : -1;
  c.state = "run"; c.timer = 1.1;
  return true;
}
