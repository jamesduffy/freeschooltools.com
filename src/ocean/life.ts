import { clamp, mulberry32, smoothstep, vnoise } from "./noise";
import { PLAY_RADIUS, groundFast, type Poi } from "./world";

/** The animals. Schools of fish follow simple flocking rules (stay close, line up, don't crowd, swerve around rock and
 *  around the diver) while a slow "anchor" wanders around the reef and tugs the school with it. Mantas glide on wide
 *  loops. Jellyfish drift. Nothing here touches graphics: it only fills number arrays the renderer uploads. */

export type Shape = "fish" | "slender";
export type Species = {
  id: string; name: string; shape: Shape;
  size: [number, number];            // body length, metres
  school: number;                    // fish per school
  schools: number;                   // how many schools
  y: [number, number];               // preferred depth band (m, negative)
  hug: number;                       // 0..1: stays near the floor
  speed: number;                     // cruising speed, m/s
  c1: [number, number, number]; c2: [number, number, number];
  pattern: number;                   // see the fish shader
  tight: number;                     // 0.5 loose .. 2 tight ball
};

export const SPECIES: Species[] = [
  { id: "anthias", name: "a school of orange anthias", shape: "fish", size: [0.16, 0.22], school: 110, schools: 2, y: [-24, -9], hug: 0.2, speed: 0.9, c1: [1.0, 0.36, 0.08], c2: [1.0, 0.75, 0.3], pattern: 0, tight: 1.4 },
  { id: "chromis", name: "a school of blue chromis", shape: "fish", size: [0.15, 0.2], school: 130, schools: 2, y: [-28, -10], hug: 0.15, speed: 0.95, c1: [0.1, 0.4, 0.95], c2: [0.55, 0.85, 1.0], pattern: 0, tight: 1.3 },
  { id: "sardine", name: "a silver baitfish ball", shape: "slender", size: [0.2, 0.26], school: 180, schools: 1, y: [-26, -8], hug: 0.0, speed: 1.5, c1: [0.62, 0.72, 0.8], c2: [0.95, 0.98, 1.0], pattern: 5, tight: 2.0 },
  { id: "tang", name: "blue tangs", shape: "fish", size: [0.3, 0.38], school: 7, schools: 3, y: [-22, -7], hug: 0.55, speed: 0.6, c1: [0.0, 0.25, 0.9], c2: [1.0, 0.85, 0.1], pattern: 4, tight: 0.8 },
  { id: "butterfly", name: "yellow butterflyfish", shape: "fish", size: [0.24, 0.3], school: 2, schools: 5, y: [-20, -6], hug: 0.7, speed: 0.4, c1: [1.0, 0.82, 0.1], c2: [0.1, 0.1, 0.1], pattern: 1, tight: 0.6 },
  { id: "sergeant", name: "striped sergeant fish", shape: "fish", size: [0.22, 0.28], school: 24, schools: 2, y: [-26, -8], hug: 0.65, speed: 0.55, c1: [0.9, 0.9, 0.55], c2: [0.05, 0.05, 0.08], pattern: 1, tight: 1.0 },
  { id: "wrasse", name: "wrasse", shape: "slender", size: [0.2, 0.3], school: 5, schools: 4, y: [-24, -7], hug: 0.7, speed: 0.55, c1: [0.1, 0.65, 0.35], c2: [1.0, 0.45, 0.1], pattern: 2, tight: 0.6 },
  { id: "snapper", name: "yellow snappers", shape: "fish", size: [0.4, 0.5], school: 16, schools: 2, y: [-28, -12], hug: 0.2, speed: 0.8, c1: [0.95, 0.8, 0.2], c2: [0.9, 0.9, 0.8], pattern: 2, tight: 1.0 },
  { id: "barracuda", name: "barracuda", shape: "slender", size: [0.9, 1.3], school: 9, schools: 1, y: [-24, -10], hug: 0.0, speed: 0.9, c1: [0.45, 0.55, 0.62], c2: [0.9, 0.95, 0.97], pattern: 3, tight: 0.9 },
  { id: "grouper", name: "a giant grouper", shape: "fish", size: [1.1, 1.5], school: 1, schools: 2, y: [-34, -16], hug: 0.95, speed: 0.25, c1: [0.45, 0.35, 0.22], c2: [0.8, 0.6, 0.35], pattern: 3, tight: 0.5 },
  { id: "shark", name: "a reef shark", shape: "slender", size: [1.9, 2.5], school: 1, schools: 3, y: [-30, -12], hug: 0.5, speed: 0.75, c1: [0.4, 0.45, 0.5], c2: [0.85, 0.88, 0.9], pattern: 6, tight: 0.5 },
];

class Fish {
  x = 0; y = 0; z = 0; vx = 0; vy = 0; vz = 0; size = 0.1; phase = 0; sp = 1;
}
class School {
  readonly fish: Fish[] = [];
  ax = 0; ay = 0; az = 0; // anchor
  ah = 0;                  // anchor heading
  cx = 0; cy = 0; cz = 0;  // centroid
  constructor(readonly sp: Species, readonly seed: number) {}
}

export type Manta = { cx: number; cz: number; ax: number; az: number; w: number; p: number; y: number; span: number; ph: number };

export const FISH_STRIDE_DYN = 8;   // x y z size | dx dy dz phase
export const FISH_STRIDE_STA = 8;   // r g b pattern | r2 g2 b2 speed

export class Life {
  readonly schools: School[] = [];
  readonly mantas: Manta[] = [];
  readonly jelly: { x: number; y: number; z: number; s: number; ph: number; vx: number; vz: number }[] = [];
  /** One fish number array per shape, ready to upload. */
  readonly dyn: Record<Shape, Float32Array>;
  readonly sta: Record<Shape, Float32Array>;
  readonly count: Record<Shape, number> = { fish: 0, slender: 0 };
  readonly mantaData = new Float32Array(8 * 8);   // x y z span | yaw pitch roll phase
  readonly jellyData: Float32Array;               // x y z size | phase 0 0 0
  readonly pois: Poi[] = [];
  private readonly rnd: () => number;
  private readonly slots: Record<Shape, Fish[]> = { fish: [], slender: [] };
  private t = 0;

  constructor(seed = 5, scale = 1) {
    this.rnd = mulberry32(seed);
    const r = this.rnd;
    const lerpR = (a: number, b: number) => a + (b - a) * r();
    for (const sp of SPECIES) {
      for (let s = 0; s < sp.schools; s++) {
        const sc = new School(sp, Math.floor(r() * 1000));
        const a = r() * Math.PI * 2, d = 10 + r() * 60;
        sc.ax = Math.cos(a) * d; sc.az = Math.sin(a) * d;
        sc.ay = lerpR(sp.y[0], sp.y[1]); sc.ah = r() * 6.28;
        const n = Math.max(1, Math.round(sp.school * (sp.school > 4 ? scale : 1)));
        for (let i = 0; i < n; i++) {
          const f = new Fish();
          f.x = sc.ax + (r() - 0.5) * 6; f.y = sc.ay + (r() - 0.5) * 3; f.z = sc.az + (r() - 0.5) * 6;
          f.size = lerpR(sp.size[0], sp.size[1]); f.phase = r() * 6.28; f.sp = 0.85 + r() * 0.3;
          const h = r() * 6.28; f.vx = Math.cos(h) * sp.speed; f.vz = Math.sin(h) * sp.speed;
          sc.fish.push(f); this.slots[sp.shape].push(f);
        }
        this.schools.push(sc);
      }
    }
    this.dyn = { fish: new Float32Array(this.slots.fish.length * FISH_STRIDE_DYN), slender: new Float32Array(this.slots.slender.length * FISH_STRIDE_DYN) };
    this.sta = { fish: new Float32Array(this.slots.fish.length * FISH_STRIDE_STA), slender: new Float32Array(this.slots.slender.length * FISH_STRIDE_STA) };
    const cur: Record<Shape, number> = { fish: 0, slender: 0 };
    for (const sc of this.schools) {
      const sp = sc.sp;
      for (let q = 0; q < sc.fish.length; q++) {
        const o = cur[sp.shape]++ * FISH_STRIDE_STA, a = this.sta[sp.shape];
        // each fish is a slightly different shade of its species colour
        const j = (r() - 0.5) * 0.12;
        a[o] = clamp(sp.c1[0] * (1 + j), 0, 1.4); a[o + 1] = clamp(sp.c1[1] * (1 + j), 0, 1.4); a[o + 2] = clamp(sp.c1[2] * (1 + j), 0, 1.4); a[o + 3] = sp.pattern;
        a[o + 4] = sp.c2[0]; a[o + 5] = sp.c2[1]; a[o + 6] = sp.c2[2]; a[o + 7] = sp.speed;
      }
    }
    this.count.fish = this.slots.fish.length; this.count.slender = this.slots.slender.length;

    for (let i = 0; i < 5; i++) {
      this.mantas.push({ cx: lerpR(-35, 35), cz: lerpR(-35, 35), ax: lerpR(24, 46), az: lerpR(18, 38), w: lerpR(0.05, 0.085) * (r() < 0.5 ? -1 : 1), p: r() * 6.28, y: lerpR(-17, -9), span: lerpR(3.2, 5.2), ph: r() * 6.28 });
    }
    const nJ = Math.round(26 * scale);
    for (let i = 0; i < nJ; i++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * 85;
      this.jelly.push({ x: Math.cos(a) * d, y: lerpR(-28, -8), z: Math.sin(a) * d, s: lerpR(0.25, 0.8), ph: r() * 6.28, vx: lerpR(-0.1, 0.1), vz: lerpR(-0.1, 0.1) });
    }
    this.jellyData = new Float32Array(this.jelly.length * 8);
    this.update(0.01, 0, 0, 0);
  }

  /** Step all animals by dt. (cx, cy, cz) is the diver, whom the fish politely avoid. */
  update(dtRaw: number, cx: number, cy: number, cz: number): void {
    const dt = Math.min(dtRaw, 0.1);
    this.t += dt;
    const t = this.t;
    this.pois.length = 0;

    for (const sc of this.schools) {
      const sp = sc.sp, fish = sc.fish;
      // ---- anchor: wanders slowly, stays in its depth band, off the rock, away from the wall
      sc.ah += (vnoise(t * 0.05 + sc.seed, sc.seed, 3) - 0.5) * 0.9 * dt;
      const ar = Math.hypot(sc.ax, sc.az);
      if (ar > PLAY_RADIUS - 12) sc.ah += clamp(Math.atan2(-sc.az, -sc.ax) - sc.ah + (Math.floor((Math.atan2(-sc.az, -sc.ax) - sc.ah) / 6.2832 + 0.5) * -6.2832), -1, 1) * dt * 1.5;
      const aspeed = sp.speed * 0.8;
      sc.ax += Math.cos(sc.ah) * aspeed * dt; sc.az += Math.sin(sc.ah) * aspeed * dt;
      const gA = groundFast(sc.ax, sc.az);
      const wantY = clamp(sp.y[0] + (sp.y[1] - sp.y[0]) * (0.5 + 0.5 * Math.sin(t * 0.03 + sc.seed)), gA + 1.5 + sp.size[1] * 2, -3);
      const hugY = gA + 2.5 + (sp.size[1] > 0.8 ? 1.5 : 0);
      sc.ay += ((wantY * (1 - sp.hug) + hugY * sp.hug) - sc.ay) * Math.min(1, dt * 0.4);
      // keep the anchor out of rock walls ahead
      const lead = groundFast(sc.ax + Math.cos(sc.ah) * 8, sc.az + Math.sin(sc.ah) * 8);
      if (lead > sc.ay - 1) sc.ah += 0.8 * dt * (vnoise(t * 0.2, sc.seed, 1) > 0.5 ? 1 : -1);

      // ---- school centroid
      let mx = 0, my = 0, mz = 0, mvx = 0, mvy = 0, mvz = 0;
      for (const f of fish) { mx += f.x; my += f.y; mz += f.z; mvx += f.vx; mvy += f.vy; mvz += f.vz; }
      const n = fish.length;
      mx /= n; my /= n; mz /= n; mvx /= n; mvy /= n; mvz /= n;
      sc.cx = mx; sc.cy = my; sc.cz = mz;
      const spread = Math.sqrt(n) * 0.22 * sp.size[1] * 18 / sp.tight + 1.2; // comfortable school radius

      for (const f of fish) {
        let ax = 0, ay = 0, az = 0;
        // pull toward the anchor and the school's middle
        const toAx = sc.ax - f.x, toAy = sc.ay - f.y, toAz = sc.az - f.z;
        const da = Math.hypot(toAx, toAy, toAz) + 1e-3;
        const pullA = n === 1 ? 0.5 : 0.12 * smoothstep(spread, spread * 4, da);
        ax += toAx / da * pullA * sp.speed * 2; ay += toAy / da * pullA * sp.speed * 2; az += toAz / da * pullA * sp.speed * 2;
        if (n > 1) {
          const toMx = mx - f.x, toMy = my - f.y, toMz = mz - f.z, dm = Math.hypot(toMx, toMy, toMz) + 1e-3;
          const c = 0.5 * smoothstep(spread * 0.4, spread * 1.6, dm);
          ax += toMx / dm * c * sp.speed; ay += toMy / dm * c * sp.speed; az += toMz / dm * c * sp.speed;
          // line up with the group
          ax += (mvx - f.vx) * 0.9; ay += (mvy - f.vy) * 0.9; az += (mvz - f.vz) * 0.9;
          // personal space: look at a few neighbours only, so big schools stay cheap
          const step = Math.max(1, Math.floor(n / 14)), start = (Math.floor(t * 7) + sc.seed) % step;
          const sep = f.size * 2.6;
          for (let j = start; j < n; j += step) {
            const o = fish[j]!;
            if (o === f) continue;
            const dx = f.x - o.x, dy = f.y - o.y, dz = f.z - o.z, d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < sep * sep && d2 > 1e-6) { const d = Math.sqrt(d2), k = (sep - d) / sep * 3 * step * 0.6; ax += dx / d * k; ay += dy / d * k; az += dz / d * k; }
          }
        }
        // the diver is a big, slow animal: give it room
        const dx = f.x - cx, dy = f.y - cy, dz = f.z - cz, dd = Math.hypot(dx, dy, dz);
        const room = 3.5 + f.size * 5;
        if (dd < room && dd > 1e-3) { const k = (room - dd) / room * 2.8 * (sp.size[1] > 0.8 ? 0.4 : 1); ax += dx / dd * k; ay += dy / dd * k * 0.5; az += dz / dd * k; }
        // rock: look ahead, steer up and aside
        const sp0 = Math.hypot(f.vx, f.vz) + 0.2;
        const lx = f.x + f.vx / sp0 * (1.5 + f.size * 4), lz = f.z + f.vz / sp0 * (1.5 + f.size * 4);
        const gAhead = groundFast(lx, lz), gHere = groundFast(f.x, f.z);
        const clear = 0.6 + f.size * 1.2;
        if (gAhead + clear > f.y) { ay += 2.4; ax -= f.vz / sp0 * 1.2; az += f.vx / sp0 * 1.2; }
        if (f.y < gHere + clear) ay += (gHere + clear - f.y) * 3;
        if (f.y > -2) ay -= (f.y + 2) * 3;
        // depth band: gentle pull back into it
        const lo = Math.min(sp.y[0], gHere + 1), hi = sp.y[1] + 4;
        if (f.y > hi) ay -= (f.y - hi) * 0.25; else if (f.y < lo) ay += (lo - f.y) * 0.25;
        // reef wall
        const fr = Math.hypot(f.x, f.z);
        if (fr > PLAY_RADIUS + 8) { ax -= f.x / fr * (fr - PLAY_RADIUS - 8) * 0.3; az -= f.z / fr * (fr - PLAY_RADIUS - 8) * 0.3; }
        // a bit of individual wobble
        ax += Math.sin(t * 0.7 + f.phase * 3) * 0.12; az += Math.cos(t * 0.6 + f.phase * 2) * 0.12; ay += Math.sin(t * 0.5 + f.phase) * 0.05;

        f.vx += ax * dt; f.vy += ay * dt; f.vz += az * dt;
        // cruise speed and a gentler pitch than yaw
        const sp1 = Math.hypot(f.vx, f.vy, f.vz) + 1e-6;
        const target = sp.speed * f.sp * (1 + 0.25 * Math.sin(t * 0.4 + f.phase));
        const lim = clamp(target / sp1, 0.9, 1.15) * (sp1 > target * 1.6 ? target * 1.6 / sp1 : 1);
        f.vx *= lim; f.vy *= lim * 0.985; f.vz *= lim;
        f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
        f.phase += dt * (3 + sp1 * 3.2 / (0.2 + f.size));
      }
      if (n === 1 || sp.id === "sardine" || sp.id === "barracuda" || sp.id === "anthias" || sp.id === "chromis" || sp.id === "tang" || sp.id === "snapper") {
        this.pois.push({ x: mx, y: my, z: mz, name: sp.name, kind: sp.id, r: spread });
      }
    }

    // ---- write instance data
    const cur: Record<Shape, number> = { fish: 0, slender: 0 };
    for (const sc of this.schools) {
      const shape = sc.sp.shape, a = this.dyn[shape];
      for (const f of sc.fish) {
        const o = cur[shape]++ * FISH_STRIDE_DYN;
        const sp = Math.hypot(f.vx, f.vy, f.vz) + 1e-6;
        a[o] = f.x; a[o + 1] = f.y; a[o + 2] = f.z; a[o + 3] = f.size;
        a[o + 4] = f.vx / sp; a[o + 5] = f.vy / sp; a[o + 6] = f.vz / sp; a[o + 7] = f.phase;
      }
    }

    // ---- mantas: wide gliding loops, banking into the turns
    for (let i = 0; i < this.mantas.length; i++) {
      const m = this.mantas[i]!;
      const ang = m.p + t * m.w;
      const x = m.cx + Math.cos(ang) * m.ax, z = m.cz + Math.sin(ang * 1.0) * m.az;
      const vx = -Math.sin(ang) * m.ax * m.w, vz = Math.cos(ang) * m.az * m.w;
      const g = groundFast(x, z);
      const y = Math.max(m.y + Math.sin(t * 0.07 + m.ph) * 2.5, g + 4.5);
      const yaw = Math.atan2(vz, vx);
      const turn = Math.sign(m.w) * 0.32;
      const o = i * 8, a = this.mantaData;
      a[o] = x; a[o + 1] = y; a[o + 2] = z; a[o + 3] = m.span; a[o + 4] = yaw; a[o + 5] = Math.sin(t * 0.07 + m.ph) * 0.06; a[o + 6] = turn; a[o + 7] = m.ph + t * 1.0;
      if (Math.hypot(vx, vz) > 0) this.pois.push({ x, y, z, name: "a giant manta ray", kind: "manta", r: m.span });
    }

    // ---- jellyfish: drift on the current, bobbing
    for (let i = 0; i < this.jelly.length; i++) {
      const j = this.jelly[i]!;
      j.x += j.vx * dt + Math.sin(t * 0.1 + j.ph) * 0.05 * dt; j.z += j.vz * dt;
      j.y += Math.sin(t * 0.21 + j.ph) * 0.12 * dt;
      const g = groundFast(j.x, j.z);
      if (j.y < g + 2.5) j.y += (g + 2.5 - j.y) * Math.min(1, dt);
      if (j.y > -4) j.y = -4;
      const rr = Math.hypot(j.x, j.z);
      if (rr > PLAY_RADIUS) { j.x *= -0.9; j.z *= -0.9; }
      const o = i * 8;
      this.jellyData[o] = j.x; this.jellyData[o + 1] = j.y; this.jellyData[o + 2] = j.z; this.jellyData[o + 3] = j.s; this.jellyData[o + 4] = j.ph + t * 1.6;
    }
    if (this.jelly.length) {
      let best = 0, bd = 1e9;
      for (let i = 0; i < this.jelly.length; i += 1) { const j = this.jelly[i]!; const d = Math.hypot(j.x - cx, j.z - cz); if (d < bd) { bd = d; best = i; } }
      const j = this.jelly[best]!;
      this.pois.push({ x: j.x, y: j.y, z: j.z, name: "a drifting jellyfish", kind: "jelly", r: 1 });
    }
  }

  fishCount(): number { return this.count.fish + this.count.slender; }
}

