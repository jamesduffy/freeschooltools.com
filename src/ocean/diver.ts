import { clamp, mulberry32, smoothstep, vnoise } from "./noise";
import { PLAY_RADIUS, groundFast, type Poi } from "./world";

/** The camera is a scuba diver, not a drone. It swims slowly, follows the sea floor at a comfortable height, turns its
 *  head to look at things, stops now and then to watch something, and never goes underground or out of the reef.
 *  It is steered, not scripted, so the tour never repeats. */

const wrap = (a: number) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

export type View = { x: number; y: number; z: number; yaw: number; pitch: number; roll: number };

export class Diver {
  x = 0; y = -18; z = 0;
  heading: number;
  speed = 1.4;
  vy = 0;
  bodyPitch = 0;
  gazeYaw = 0; gazePitch = 0; private gv = 0; private gpv = 0;
  private gazeTargetYaw = 0; private gazeTargetPitch = 0; private gazeTimer = 3;
  /** What the diver is looking at right now, for the caption. */
  watching: Poi | null = null;
  /** Dragging the screen turns the head; it drifts back by itself. */
  lookYaw = 0; lookPitch = 0; private lookHeld = false; private lookIdle = 0;
  paused = false;
  t = 0;
  private mode: "swim" | "linger" = "swim";
  private modeTimer = 18;
  private cooldown = 25;
  private lingerTarget: Poi | null = null;
  private yawRate = 0;
  private readonly seed: number;
  private readonly rnd: () => number;
  /** Speed scale: 1 normal, less for reduced motion. */
  pace = 1;

  constructor(seed = 1, private readonly pois: () => Poi[] = () => [], start?: { x: number; z: number; toX: number; toZ: number }) {
    this.seed = seed * 13.7;
    this.rnd = mulberry32(seed);
    if (start) {
      this.x = start.x; this.z = start.z;
      this.heading = Math.atan2(start.toZ - start.z, start.toX - start.x);
    } else {
      this.heading = this.rnd() * Math.PI * 2;
      this.x = Math.cos(this.heading + 2) * 20; this.z = Math.sin(this.heading + 2) * 20;
    }
    this.y = Math.min(groundFast(this.x, this.z) + 9, -9);
  }

  /** Dragging with a finger or mouse. */
  nudge(dyaw: number, dpitch: number) {
    this.lookYaw = clamp(this.lookYaw + dyaw, -2.4, 2.4);
    this.lookPitch = clamp(this.lookPitch + dpitch, -1, 1);
    this.lookIdle = 0;
  }
  holdLook(on: boolean) { this.lookHeld = on; if (!on) this.lookIdle = 0; }

  update(dtRaw: number): void {
    const dt = Math.min(dtRaw, 0.1);
    if (this.paused || dt <= 0) return;
    this.t += dt;

    // ---- what to do: swim on, or stop and watch something
    this.modeTimer -= dt; this.cooldown -= dt;
    let pois: Poi[] | null = null;
    const nearby = (maxD: number, fov: number) => {
      pois ??= this.pois();
      let best: Poi | null = null, bestScore = 1e9;
      for (const p of pois) {
        const dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz, p.y - this.y);
        if (d > maxD || d < 3) continue;
        const off = Math.abs(wrap(Math.atan2(dz, dx) - this.heading));
        if (off > fov) continue;
        const score = d + off * 12;
        if (score < bestScore) { bestScore = score; best = p; }
      }
      return best;
    };
    if (this.mode === "swim" && this.modeTimer <= 0 && this.cooldown <= 0) {
      const p = nearby(34, 1.3);
      if (p) { this.mode = "linger"; this.lingerTarget = p; this.modeTimer = 9 + this.rnd() * 9; }
      else this.modeTimer = 6;
    } else if (this.mode === "linger" && this.modeTimer <= 0) {
      this.mode = "swim"; this.lingerTarget = null; this.cooldown = 28 + this.rnd() * 30; this.modeTimer = 10;
    }

    // ---- heading: slow wander, away from the edge, away from rock
    let rate = (vnoise(this.t * 0.045, 0, this.seed) - 0.5) * 0.34;
    const r = Math.hypot(this.x, this.z);
    if (r > PLAY_RADIUS - 28) {
      const toCentre = Math.atan2(-this.z, -this.x);
      rate += clamp(wrap(toCentre - this.heading), -1, 1) * smoothstep(PLAY_RADIUS - 28, PLAY_RADIUS - 6, r) * 0.7;
    }
    // look ahead for rock: how fast would the diver have to climb to clear it?
    let need = -1e9;
    let climb = 0;
    const sp = Math.max(this.speed, 0.7);
    for (const k of [2.5, 5, 9, 15, 22, 30]) {
      for (const a of [0, 0.3, -0.3]) {
        const raw = groundFast(this.x + Math.cos(this.heading + a) * k, this.z + Math.sin(this.heading + a) * k);
        const g = raw + 2.8;
        if (a === 0) need = Math.max(need, g);
        climb = Math.max(climb, raw > -7.5 ? 1.5 : (g - this.y) / (k / sp)); // too shallow to swim over: turn away
      }
    }
    const blocked = clamp((climb - 0.15) / 0.4, 0, 1);
    if (blocked > 0) {
      const ahead = (a: number) => Math.max(...[8, 16, 24].map((k) => groundFast(this.x + Math.cos(this.heading + a) * k, this.z + Math.sin(this.heading + a) * k)));
      const gl = ahead(0.8), gr = ahead(-0.8);
      rate += (gl < gr ? 1 : -1) * 0.95 * blocked;
    }
    // rock close by on either side: ease away from it
    for (const k of [3, 6, 10]) {
      const gl = groundFast(this.x + Math.cos(this.heading + 0.8) * k, this.z + Math.sin(this.heading + 0.8) * k);
      const gr = groundFast(this.x + Math.cos(this.heading - 0.8) * k, this.z + Math.sin(this.heading - 0.8) * k);
      const lw = clamp((gl + 2.2 - this.y) / 3, 0, 1), rw = clamp((gr + 2.2 - this.y) / 3, 0, 1);
      rate += (rw - lw) * 0.7 * (1 - k / 14);
    }
    if (this.mode === "linger" && this.lingerTarget) {
      const want = Math.atan2(this.lingerTarget.z - this.z, this.lingerTarget.x - this.x);
      rate = clamp(wrap(want - this.heading), -0.5, 0.5) * 0.4;
    }
    rate = clamp(rate, -0.8, 0.8);
    this.yawRate += (rate - this.yawRate) * Math.min(1, dt * 0.9);
    this.heading = wrap(this.heading + this.yawRate * dt);

    // ---- speed: a relaxed finning pace; nearly still while watching
    const cruise = (1.15 + 0.55 * vnoise(this.t * 0.03, 9, this.seed)) * this.pace;
    const wantSpeed = this.mode === "linger" ? 0.15 : cruise * (1 - 0.75 * blocked);
    this.speed += (wantSpeed - this.speed) * Math.min(1, dt * (this.mode === "linger" ? 0.5 : 0.35));
    this.x += Math.cos(this.heading) * this.speed * dt;
    this.z += Math.sin(this.heading) * this.speed * dt;

    // ---- depth: float above the floor, drifting up and down a little
    const here = groundFast(this.x, this.z);
    const band = 4.5 + 9 * vnoise(this.t * 0.02, 4, this.seed);
    let targetY = Math.max(here + band, need);
    targetY = clamp(targetY, here + 2.2, Math.max(-4.5, here + 2.2));
    if (this.mode === "linger" && this.lingerTarget) targetY = clamp(this.lingerTarget.y + 0.5, here + 2.2, -4.5);
    const wantVy = clamp((targetY - this.y) * (targetY > this.y ? 0.45 : 0.2), -0.5, 0.9);
    this.vy += (wantVy - this.vy) * Math.min(1, dt * 0.9);
    this.y += this.vy * dt;
    this.bodyPitch += (Math.atan2(this.vy, Math.max(this.speed, 0.6)) - this.bodyPitch) * Math.min(1, dt * 1.5);

    // ---- hard limits: never into the floor, the wall or the surface
    if (this.y > -3.2) this.y = -3.2;
    const floor = groundFast(this.x, this.z) + 2.2;
    if (this.y < floor) this.y = floor;
    const rr = Math.hypot(this.x, this.z);
    if (rr > PLAY_RADIUS) { const k = PLAY_RADIUS / rr; this.x *= k; this.z *= k; }

    // ---- head: look around, sometimes at something interesting
    this.gazeTimer -= dt;
    if (this.gazeTimer <= 0) {
      const p = this.mode === "linger" ? this.lingerTarget : nearby(38, 1.5);
      if (p && (this.mode === "linger" || this.rnd() < 0.65)) {
        const dx = p.x - this.x, dz = p.z - this.z;
        this.gazeTargetYaw = clamp(wrap(Math.atan2(dz, dx) - this.heading), -1.5, 1.5);
        this.gazeTargetPitch = clamp(Math.atan2(p.y - this.y, Math.hypot(dx, dz)), -0.5, 0.4);
        this.watching = p;
        this.gazeTimer = 5 + this.rnd() * 6;
      } else {
        this.gazeTargetYaw = (this.rnd() - 0.5) * 1.3;
        this.gazeTargetPitch = (this.rnd() - 0.55) * 0.4;
        this.watching = null;
        this.gazeTimer = 3.5 + this.rnd() * 6;
      }
    }
    if (this.watching) { // stop calling it "watching" once it has dropped out of view
      const d = Math.hypot(this.watching.x - this.x, this.watching.z - this.z);
      if (d > 60) this.watching = null;
    }
    const k = 2.2, c = 3.0; // soft, slightly sluggish head
    this.gv += ((this.gazeTargetYaw - this.gazeYaw) * k - this.gv * c) * dt; this.gazeYaw += this.gv * dt;
    this.gpv += ((this.gazeTargetPitch - this.gazePitch) * k - this.gpv * c) * dt; this.gazePitch += this.gpv * dt;
    if (!this.lookHeld) {
      this.lookIdle += dt;
      if (this.lookIdle > 2.5) { const f = Math.min(1, dt * 0.6); this.lookYaw -= this.lookYaw * f; this.lookPitch -= this.lookPitch * f; }
    }
  }

  /** Camera pose, with a gentle breathing sway. */
  view(): View {
    const bt = this.t;
    const sway = 0.07 * Math.sin(bt * 0.9) + 0.03 * Math.sin(bt * 2.3);
    const yaw = this.heading + this.gazeYaw + this.lookYaw;
    const pitch = clamp(this.bodyPitch * 0.7 + this.gazePitch + this.lookPitch + 0.012 * Math.sin(bt * 0.75), -1.35, 1.35);
    // finning rocks the view a hair
    const fin = 0.05 * Math.sin(bt * 2.2) * clamp(this.speed, 0, 1.5);
    const px = -Math.sin(yaw) * sway, pz = Math.cos(yaw) * sway;
    return { x: this.x + px, y: this.y + fin * 0.25 + 0.05 * Math.sin(bt * 0.6), z: this.z + pz, yaw, pitch, roll: 0.018 * Math.sin(bt * 0.52) + this.yawRate * -0.12 };
  }
}
