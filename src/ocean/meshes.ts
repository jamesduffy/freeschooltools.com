// Procedural geometry. Every shape in the ocean is built here from maths: no model files.
// This file builds raw number arrays for the GPU. The numeric code reads typed arrays freely, so strict
// "possibly undefined" checks on array reads are turned off for this file only.
// @ts-nocheck
import { clamp, mulberry32, smoothstep, vnoise, fbm } from "./noise";
import { WORLD_RADIUS, groundHeight, groundSlope } from "./world";

/** Vertex layout shared by every solid mesh: position (3 floats), normal (3 floats), colour (4 bytes). Stride 28. */
export const STRIDE = 28;

export type Mesh = { vb: ArrayBuffer; ib: Uint16Array | Uint32Array; n: number; verts: number };

class Builder {
  pos: number[] = []; col: number[] = []; idx: number[] = [];
  get count() { return this.pos.length / 3; }
  vert(x: number, y: number, z: number, r: number, g: number, b: number, a = 1) {
    this.pos.push(x, y, z); this.col.push(r, g, b, a); return this.count - 1;
  }
  tri(a: number, b: number, c: number) { this.idx.push(a, b, c); }
  quad(a: number, b: number, c: number, d: number) { this.idx.push(a, b, c, a, c, d); }
  /** Rows of vertices joined into a surface. wrap closes each row into a ring. */
  grid(rows: number, cols: number, first: number, wrap: boolean, flip = false) {
    const c1 = wrap ? cols : cols - 1;
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < c1; i++) {
      const a = first + j * cols + i, b = first + j * cols + ((i + 1) % cols), c = first + (j + 1) * cols + ((i + 1) % cols), d = first + (j + 1) * cols + i;
      if (flip) this.quad(a, d, c, b); else this.quad(a, b, c, d);
    }
  }
  finish(): Mesh {
    const nv = this.count, nrm = new Float32Array(nv * 3);
    for (let t = 0; t < this.idx.length; t += 3) {
      const a = this.idx[t] * 3, b = this.idx[t + 1] * 3, c = this.idx[t + 2] * 3;
      const ux = this.pos[b] - this.pos[a], uy = this.pos[b + 1] - this.pos[a + 1], uz = this.pos[b + 2] - this.pos[a + 2];
      const vx = this.pos[c] - this.pos[a], vy = this.pos[c + 1] - this.pos[a + 1], vz = this.pos[c + 2] - this.pos[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const o of [a, b, c]) { nrm[o] += nx; nrm[o + 1] += ny; nrm[o + 2] += nz; }
    }
    const vb = new ArrayBuffer(nv * STRIDE), f = new Float32Array(vb), u8 = new Uint8Array(vb);
    for (let i = 0; i < nv; i++) {
      const l = Math.hypot(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]) || 1;
      f[i * 7] = this.pos[i * 3]; f[i * 7 + 1] = this.pos[i * 3 + 1]; f[i * 7 + 2] = this.pos[i * 3 + 2];
      f[i * 7 + 3] = nrm[i * 3] / l; f[i * 7 + 4] = nrm[i * 3 + 1] / l; f[i * 7 + 5] = nrm[i * 3 + 2] / l;
      for (let k = 0; k < 4; k++) u8[i * STRIDE + 24 + k] = Math.round(clamp(this.col[i * 4 + k], 0, 1) * 255);
    }
    const ib = nv > 65535 ? new Uint32Array(this.idx) : new Uint16Array(this.idx);
    return { vb, ib, n: this.idx.length, verts: nv };
  }
}

const n3 = (x: number, y: number, z: number, s = 0) => (vnoise(x + z * 0.7, y + z * 1.3, s) + vnoise(y * 0.9 - x * 0.4 + 13, z + x * 1.1, s + 5)) * 0.5;
const rot = (x: number, z: number, a: number): [number, number] => [x * Math.cos(a) - z * Math.sin(a), x * Math.sin(a) + z * Math.cos(a)];

/** A lumpy rock: a sphere pushed in and out by noise, with a flat-ish base. */
export function rockMesh(seed: number): Mesh {
  const b = new Builder(), N = 28, M = 18, rnd = mulberry32(seed);
  const sx = 0.9 + rnd() * 0.5, sz = 0.9 + rnd() * 0.5, sy = 0.55 + rnd() * 0.45;
  for (let j = 0; j <= M; j++) {
    const v = j / M, phi = v * Math.PI;
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2;
      let x = Math.sin(phi) * Math.cos(th), y = Math.cos(phi), z = Math.sin(phi) * Math.sin(th);
      const k = 1.8;
      let d = 0.75 + 0.5 * n3(x * k + seed, y * k, z * k, seed) + 0.28 * n3(x * 4 + 9, y * 4, z * 4 + seed, 3) + 0.1 * n3(x * 9, y * 9 + seed, z * 9, 4);
      // flat facets: round the noise into steps now and then
      d = d * 0.8 + 0.2 * Math.round(d * 5) / 5;
      x *= d * sx; z *= d * sz; y *= d * sy;
      if (y < -0.35) y = -0.35 + (y + 0.35) * 0.1;
      const c = 0.8 + 0.2 * n3(x * 3, y * 3, z * 3, 7);
      b.vert(x, y, z, c, c * 0.97, c * 0.93, 1);
    }
  }
  b.grid(M + 1, N, 0, true, true);
  return b.finish();
}

/** A tube from a to b, tapering from r0 to r1. */
function tube(b: Builder, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r0: number, r1: number, seg: number, c0: number, c1: number, hue: [number, number, number]) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz) || 1;
  const fx = dx / L, fy = dy / L, fz = dz / L;
  // any vector not parallel to f
  let ux = 0, uy = 1, uz = 0; if (Math.abs(fy) > 0.9) { ux = 1; uy = 0; }
  let sx = fy * uz - fz * uy, sy = fz * ux - fx * uz, sz = fx * uy - fy * ux;
  const sl = Math.hypot(sx, sy, sz); sx /= sl; sy /= sl; sz /= sl;
  const tx = fy * sz - fz * sy, ty = fz * sx - fx * sz, tz = fx * sy - fy * sx;
  const first = b.count;
  for (let ring = 0; ring < 2; ring++) {
    const r = ring ? r1 : r0, px = ring ? bx : ax, py = ring ? by : ay, pz = ring ? bz : az, c = ring ? c1 : c0;
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      b.vert(px + (sx * ca + tx * sa) * r, py + (sy * ca + ty * sa) * r, pz + (sz * ca + tz * sa) * r, c * hue[0], c * hue[1], c * hue[2], 1);
    }
  }
  b.grid(2, seg, first, true, false);
}

/** Branching coral: a little tree of tubes with pale tips. */
export function branchCoral(seed: number, style: number): Mesh {
  const b = new Builder(), rnd = mulberry32(seed);
  const depthMax = style === 1 ? 5 : 4, kids = style === 2 ? 3 : 2;
  const grow = (x: number, y: number, z: number, dx: number, dy: number, dz: number, len: number, rad: number, depth: number) => {
    const ex = x + dx * len, ey = y + dy * len, ez = z + dz * len;
    const last = depth === depthMax;
    tube(b, x, y, z, ex, ey, ez, rad, last ? rad * 0.35 : rad * 0.72, 7, 0.55 + depth * 0.1, last ? 1.15 : 0.62 + (depth + 1) * 0.1, [1, 1, 1]);
    if (last) return;
    const n = depth === 0 && style === 2 ? 4 : kids + (rnd() < 0.3 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const spread = style === 1 ? 0.55 : 0.8, a = rnd() * Math.PI * 2;
      let nx = dx + Math.cos(a) * spread * (0.6 + rnd() * 0.6), nz = dz + Math.sin(a) * spread * (0.6 + rnd() * 0.6), ny = dy * 0.9 + 0.25;
      const l = Math.hypot(nx, ny, nz);
      grow(ex, ey, ez, nx / l, ny / l, nz / l, len * (0.74 + rnd() * 0.12), rad * 0.7, depth + 1);
    }
  };
  grow(0, -0.05, 0, 0, 1, 0, style === 2 ? 0.36 : 0.45, style === 1 ? 0.07 : 0.095, 0);
  return b.finish();
}

/** A flat lace fan, drawn as a mesh with holes cut by the shader (alpha < 0.7 marks it). */
export function fanCoral(): Mesh {
  const b = new Builder(), R = 14, C = 20;
  for (let j = 0; j <= R; j++) {
    const v = j / R;
    for (let i = 0; i <= C; i++) {
      const u = i / C * 2 - 1, a = u * 1.15;
      const r = 0.08 + v * 1.0;
      const x = Math.sin(a) * r, y = 0.18 + Math.cos(a) * r - 0.2 + v * 0.0;
      const z = Math.sin(v * 3 + u * 2) * 0.05 + v * v * 0.12;
      const c = 0.7 + 0.5 * v;
      b.vert(x, y, z, c, c, c, 0.4);
    }
  }
  b.grid(R + 1, C + 1, 0, false, false);
  // short stalk
  tube(b, 0, -0.1, 0, 0, 0.3, 0.02, 0.05, 0.035, 6, 0.6, 0.7, [1, 1, 1]);
  return b.finish();
}

/** Brain coral: a dome carved with winding grooves. */
export function brainCoral(): Mesh {
  const b = new Builder(), N = 30, M = 14;
  for (let j = 0; j <= M; j++) {
    const phi = (j / M) * Math.PI * 0.5;
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2;
      const x = Math.sin(phi) * Math.cos(th), y = Math.cos(phi), z = Math.sin(phi) * Math.sin(th);
      const g = Math.abs(Math.sin((n3(x * 3, y * 3, z * 3, 2) * 14)));
      const d = 0.92 + 0.08 * g;
      const c = 0.6 + 0.5 * g;
      b.vert(x * d * 0.9, y * d * 0.55 - 0.02, z * d * 0.9, c, c * 0.95, c * 0.85, 1);
    }
  }
  b.grid(M + 1, N, 0, true, false);
  return b.finish();
}

/** Lathe a profile [radius, height, shade] around the y axis. */
function lathe(b: Builder, prof: [number, number, number][], seg: number, ox = 0, oz = 0, wob = 0, seed = 0) {
  const first = b.count;
  for (const [r, y, c] of prof) {
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const w = 1 + wob * (n3(Math.cos(a) * 2 + seed, y * 3, Math.sin(a) * 2, 8) - 0.5);
      b.vert(ox + Math.cos(a) * r * w, y, oz + Math.sin(a) * r * w, c, c, c, 1);
    }
  }
  b.grid(prof.length, seg, first, true, true);
}

export function barrelSponge(): Mesh {
  const b = new Builder();
  lathe(b, [[0.0, -0.05, 0.5], [0.34, 0.0, 0.55], [0.5, 0.18, 0.8], [0.55, 0.5, 0.9], [0.5, 0.82, 0.95], [0.46, 0.96, 1.0], [0.38, 0.95, 0.8], [0.32, 0.78, 0.35], [0.18, 0.45, 0.2], [0.0, 0.4, 0.15]], 22, 0, 0, 0.35, 3);
  return b.finish();
}

export function tubeSponge(): Mesh {
  const b = new Builder(), rnd = mulberry32(11);
  for (let k = 0; k < 6; k++) {
    const a = k * 2.4, d = k === 0 ? 0 : 0.18 + rnd() * 0.12, h = 0.5 + rnd() * 0.7, r = 0.06 + rnd() * 0.04;
    lathe(b, [[r * 1.3, -0.03, 0.55], [r * 1.1, h * 0.3, 0.8], [r, h * 0.8, 0.95], [r * 1.15, h, 1.05], [r * 0.7, h - 0.03, 0.3], [r * 0.5, h * 0.6, 0.2], [0, h * 0.5, 0.2]], 10, Math.cos(a) * d, Math.sin(a) * d, 0.1, k);
  }
  return b.finish();
}

/** A low bumpy cushion of colour: anemone / magenta ground cover. */
export function coverMat(): Mesh {
  const b = new Builder(), N = 20, M = 5;
  for (let j = 0; j <= M; j++) {
    const v = j / M;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = Math.sin(v * Math.PI * 0.5 + 0.0) ;
      const rr = (1 - v * v) * 0.9 + 0.001;
      const bump = 0.8 + 0.5 * n3(Math.cos(a) * 3, v * 3, Math.sin(a) * 3, 21);
      const c = 0.7 + 0.5 * bump * (0.4 + v);
      b.vert(Math.cos(a) * rr * bump, v * 0.22 * bump + (r * 0.0), Math.sin(a) * rr * bump, c, c, c, 1);
    }
  }
  b.grid(M + 1, N, 0, true, false);
  return b.finish();
}

/** A fish pointing along +x, length 1 (nose at +0.5). Colour bytes carry: r = how far back along the body, g = 255 on loose fins, b = 255 on the tail. */
export function fishMesh(slender: boolean): Mesh {
  const b = new Builder(), N = 14, M = 22;
  const H = slender ? 0.1 : 0.2, W = slender ? 0.08 : 0.1;
  for (let j = 0; j <= M; j++) {
    const u = j / M;                       // 0 nose .. 1 tail root
    const x = 0.5 - u * 0.82;
    const prof = slender ? Math.pow(Math.sin(Math.PI * Math.pow(u * 0.96 + 0.02, 0.75)), 0.8) * (1 - 0.45 * u) : Math.pow(Math.sin(Math.PI * Math.pow(u * 0.97 + 0.015, 0.62)), 0.85) * (1 - 0.65 * u * u);
    const h = H * 2 * prof, w = W * 2 * prof;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      b.vert(x, Math.sin(a) * h * (Math.sin(a) > 0 ? 1.0 : 0.85), Math.cos(a) * w, u * 0.8, 0, 0, 1);
    }
  }
  b.grid(M + 1, N, 0, true, true);
  const fin = (pts: number[][], tail = false) => {
    const first = b.count;
    for (const [x, y, z, u] of pts) b.vert(x, y, z, u, 1, tail ? 1 : 0, 1);
    for (let t = 1; t < pts.length - 1; t++) { b.tri(first, first + t, first + t + 1); b.tri(first, first + t + 1, first + t); }
  };
  const root = -0.32;
  // tail: forked
  fin([[root, 0, 0, 0.8], [-0.6, 0.2, 0, 1], [-0.5, 0, 0, 0.95], [-0.6, -0.2, 0, 1]], true);
  // dorsal
  if (slender) { fin([[0.12, H * 1.8, 0, 0.3], [-0.12, H * 3.2, 0, 0.45], [-0.2, H * 1.2, 0, 0.5]]); fin([[-0.22, H * 1.0, 0, 0.6], [-0.3, H * 1.8, 0, 0.7], [-0.32, H * 0.5, 0, 0.75]]); }
  else fin([[0.28, H * 1.95, 0, 0.18], [0.12, H * 2.9, 0, 0.35], [-0.1, H * 2.6, 0, 0.5], [-0.28, H * 0.9, 0, 0.7]]);
  // anal fin
  fin([[-0.05, -H * 1.5, 0, 0.5], [-0.14, -H * 2.2, 0, 0.6], [-0.26, -H * 0.8, 0, 0.7]]);
  // pectoral fins, one each side
  for (const s of [1, -1]) fin([[0.2, -0.02, s * W * 1.5, 0.25], [0.1, -0.08, s * W * 3.6, 0.3], [0.05, -0.0, s * W * 1.7, 0.35]]);
  return b.finish();
}

/** Manta ray: x across the wings (-1..1), z forward, y up. Colour bytes: a = 255 on the body, r = how far out along the wing. */
export function mantaMesh(): Mesh {
  const b = new Builder(), C = 36, R = 12;
  for (let j = 0; j <= R; j++) {
    const v = j / R; // 0 leading edge .. 1 trailing edge
    for (let i = 0; i <= C; i++) {
      const u = (i / C) * 2 - 1, au = Math.abs(u);
      // wing outline: swept back, rounded tip
      const lead = 0.42 - 0.62 * Math.pow(au, 1.5) + 0.18 * (1 - au) * (1 - au);
      const trail = -0.22 + 0.02 * (1 - au) + 0.0 * au - 0.5 * Math.pow(au, 2.4);
      const z = lead + (trail - lead) * v;
      const thick = 0.14 * Math.pow(1 - au, 0.8) * Math.sin(Math.PI * Math.min(1, v * 1.1 + 0.05)) + 0.004;
      b.vert(u, thick, z, au, 0, 0, 1);
    }
  }
  const top = 0;
  b.grid(R + 1, C + 1, top, false, true);
  // belly copy, slightly lower
  const bf = b.count;
  for (let j = 0; j <= R; j++) for (let i = 0; i <= C; i++) { const k = (j * (C + 1) + i); b.vert(b.pos[k * 3], -b.pos[k * 3 + 1] * 0.55, b.pos[k * 3 + 2], b.col[k * 4], 0, 0, 1); }
  b.grid(R + 1, C + 1, bf, false, false);
  // head lobes
  for (const s of [-1, 1]) {
    const f = b.count;
    b.vert(s * 0.12, 0.02, 0.4, 0.05, 0, 0, 1); b.vert(s * 0.2, 0.0, 0.72, 0.05, 0, 0, 1); b.vert(s * 0.05, -0.02, 0.4, 0.05, 0, 0, 1);
    b.tri(f, f + 1, f + 2); b.tri(f, f + 2, f + 1);
  }
  // tail
  const tf = b.count;
  b.vert(-0.035, 0.01, -0.2, 0, 0, 0, 1); b.vert(0.035, 0.01, -0.2, 0, 0, 0, 1); b.vert(0, 0.005, -1.5, 0, 0, 0, 1);
  b.tri(tf, tf + 1, tf + 2); b.tri(tf, tf + 2, tf + 1);
  return b.finish();
}

/** Jellyfish bell + tentacles. Colour bytes: r = 0 at the rim .. 1 at the crown for the bell; g = 255 on tentacles (r = how far down). */
export function jellyMesh(): Mesh {
  const b = new Builder(), N = 20, M = 9;
  for (let j = 0; j <= M; j++) {
    const v = j / M, phi = v * Math.PI * 0.5;
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2;
      const r = Math.sin(phi) * (1 + 0.1 * Math.sin(th * 8) * (1 - v));
      b.vert(Math.cos(th) * r, Math.cos(phi) * 0.8 - 0.1 + (v > 0.97 ? 0 : 0), Math.sin(th) * r, v, 0, 0, 1);
    }
  }
  b.grid(M + 1, N, 0, true, true);
  // frilly oral arms and thin tentacles, as thin strips
  const rnd = mulberry32(3);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 + rnd() * 0.3, r0 = 0.85 * (k % 2 ? 1 : 0.35), len = (k % 2 ? 1.6 : 1.0) + rnd() * 0.6;
    const S = 10, first = b.count;
    for (let s = 0; s <= S; s++) {
      const v = s / S;
      for (const side of [-1, 1]) {
        const w = (k % 2 ? 0.012 : 0.05) * (1 - v * 0.6);
        b.vert(Math.cos(a) * r0 + Math.cos(a + 1.57) * w * side, -0.1 - v * len, Math.sin(a) * r0 + Math.sin(a + 1.57) * w * side, v, 1, 0, 1);
      }
    }
    for (let s = 0; s < S; s++) { const q = first + s * 2; b.quad(q, q + 1, q + 3, q + 2); b.quad(q, q + 2, q + 3, q + 1); }
  }
  return b.finish();
}

/** The sunken ship: a lofted hull open at the top, ribs, a deck, broken masts and a bowsprit. Local x is along the ship. */
export function wreckMesh(): Mesh {
  const b = new Builder(), rnd = mulberry32(99);
  const L = 26, S = 30, P = 14;
  const wood = (v: number) => 0.45 + 0.3 * v;
  const beam = (s: number) => 4.6 * Math.pow(Math.sin(Math.PI * Math.pow(clamp(s, 0.001, 0.999), 0.75)), 0.7);
  const keel = (s: number) => -3.2 * (0.5 + 0.5 * Math.sin(Math.PI * clamp(s, 0, 1))) + 0.5 * Math.pow(s, 4);
  const sheer = (s: number) => 1.6 + 2.4 * Math.pow(Math.abs(s - 0.45) * 2, 2) - (s > 0.97 ? 3 : 0);
  // hull planking, port and starboard, as one open shell
  for (let j = 0; j <= S; j++) {
    const s = j / S, x = (0.5 - s) * L, w = beam(s), y0 = keel(s) * 0.7, y1 = sheer(s);
    // broken away along the top toward the stern
    const broken = s > 0.55 ? (s - 0.55) * 4 * (0.4 + 0.6 * (vnoise(s * 9, 3, 4))) : 0;
    for (let i = 0; i <= P; i++) {
      const u = i / P * 2 - 1;           // -1 port .. 1 starboard
      const a = (1 - Math.abs(u)) ;
      const z = u * w * (0.35 + 0.65 * Math.pow(Math.abs(u), 0.7)) * 1;
      const yy = y0 + (y1 - broken) * Math.pow(Math.abs(u), 1.4) + (y0 * (1 - Math.pow(Math.abs(u), 1.4)) * 0);
      const plank = 0.78 + 0.22 * Math.sin((yy + 4) * 9 + n3(s * 4, u * 3, 0, 2) * 3);
      b.vert(x, Math.max(y0 + (yy - y0) * 1, y0) - 0.0, z, wood(plank) , wood(plank) * 0.78, wood(plank) * 0.55, 1);
      void a;
    }
  }
  b.grid(S + 1, P + 1, 0, false, false);
  // ribs standing up above the broken planking
  for (let k = 0; k < 11; k++) {
    const s = 0.52 + k * 0.042, x = (0.5 - s) * L, w = beam(s), top = 0.7 + rnd() * 2.4;
    for (const side of [-1, 1]) tube(b, x, keel(s) * 0.7 + 0.5, side * w * 0.5, x, sheer(s) - 1.0 + top, side * w * 0.98, 0.1, 0.07, 5, 0.9, 0.85, [0.55, 0.38, 0.22]);
  }
  // deck beams across
  for (let k = 0; k < 8; k++) { const s = 0.08 + k * 0.05, x = (0.5 - s) * L, w = beam(s); tube(b, x, sheer(s) - 0.4, -w * 0.95, x, sheer(s) - 0.4, w * 0.95, 0.12, 0.12, 5, 0.7, 0.7, [0.5, 0.35, 0.2]); }
  // masts: one stump, one snapped and leaning
  tube(b, 4.2, -0.5, 0, 4.4, 8, 0.3, 0.32, 0.2, 8, 0.65, 0.7, [0.55, 0.4, 0.25]);
  tube(b, 4.4, 8, 0.3, 5.8, 10.4, 1.9, 0.2, 0.14, 8, 0.65, 0.7, [0.5, 0.36, 0.22]);
  tube(b, -2.6, 0, 0, -3.8, 6, -0.5, 0.26, 0.16, 8, 0.6, 0.7, [0.5, 0.36, 0.22]);
  tube(b, 4.4, 6.2, -0.6, 4.4, 6.2, 2.6, 0.1, 0.1, 6, 0.6, 0.6, [0.5, 0.36, 0.22]);
  // bowsprit
  tube(b, 12.2, 1.6, 0, 17.8, 3.4, 0, 0.22, 0.12, 7, 0.65, 0.7, [0.55, 0.4, 0.25]);
  return b.finish();
}

/** The sea floor: a grid over the whole world, coloured sand / rock / reef. */
export function terrainMesh(): Mesh {
  const b = new Builder(), N = 250, half = WORLD_RADIUS + 6;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1) * 2 - 1) * half, z = (j / (N - 1) * 2 - 1) * half;
      const y = groundHeight(x, z), slope = groundSlope(x, z);
      const rockiness = clamp(smoothstep(0.35, 0.95, slope) + smoothstep(-26, -8, y) * 0.55 + (fbm(x * 0.07, z * 0.07, 2, 61) - 0.5) * 0.5, 0, 1);
      const sandy = 0.9 + 0.2 * fbm(x * 0.5, z * 0.5, 2, 62);
      const reef = smoothstep(-24, -8, y) * (fbm(x * 0.05 + 4, z * 0.05, 2, 63));
      const sr = 0.8 * sandy, sg = 0.72 * sandy, sb = 0.54 * sandy;
      const rr = 0.4 + 0.12 * reef * 2, rg = 0.38 + 0.14 * reef * 2, rb = 0.33 - 0.02 * reef;
      b.vert(x, y, z, sr + (rr - sr) * rockiness, sg + (rg - sg) * rockiness, sb + (rb - sb) * rockiness, 1);
    }
  }
  b.grid(N, N, 0, false, true);
  return b.finish();
}
