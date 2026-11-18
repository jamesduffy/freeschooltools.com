import type { View } from "./diver";
import type { Life } from "./life";
import { FISH_STRIDE_DYN } from "./life";
import { barrelSponge, branchCoral, brainCoral, coverMat, fanCoral, fishMesh, jellyMesh, mantaMesh, rockMesh, STRIDE, terrainMesh, tubeSponge, wreckMesh, type Mesh } from "./meshes";
import { mulberry32 } from "./noise";
import * as S from "./shaders";
import { CANOPY_N, INST_STRIDE, type PropKind, type World } from "./world";

/** The WebGL2 drawing code. One scene, drawn back to front in a handful of passes:
 *  water -> floor, rocks, corals, wreck -> kelp, grass -> fish, mantas -> sea surface -> jellyfish -> light shafts -> specks, bubbles. */

export type Level = { name: string; kelp: number; grass: number; props: number; detail: number; snow: number; caustic: number; scaleMax: number; dpr: number; life: number; aa: boolean };
export const LEVELS: Level[] = [
  { name: "High", kelp: 1, grass: 1, props: 1, detail: 1, snow: 5000, caustic: 512, scaleMax: 1, dpr: 2, life: 1, aa: true },
  { name: "Medium", kelp: 0.6, grass: 0.55, props: 0.6, detail: 0.6, snow: 2500, caustic: 256, scaleMax: 0.85, dpr: 1.5, life: 0.65, aa: true },
  { name: "Low", kelp: 0.3, grass: 0.25, props: 0.3, detail: 0, snow: 1000, caustic: 128, scaleMax: 0.7, dpr: 1, life: 0.35, aa: false },
];

const SUN = (() => { const v = [0.32, 0.9, 0.22]; const l = Math.hypot(...v); return v.map((x) => x / l) as [number, number, number]; })();

class Prog {
  readonly p: WebGLProgram;
  private readonly cache = new Map<string, WebGLUniformLocation | null>();
  constructor(private readonly gl: WebGL2RenderingContext, vs: string, fs: string, readonly name: string) {
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`${name} shader: ${gl.getShaderInfoLog(s)}`);
      return s;
    };
    this.p = gl.createProgram()!;
    gl.attachShader(this.p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(this.p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(this.p);
    if (!gl.getProgramParameter(this.p, gl.LINK_STATUS)) throw new Error(`${name} link: ${gl.getProgramInfoLog(this.p)}`);
  }
  u(n: string) { let l = this.cache.get(n); if (l === undefined) { l = this.gl.getUniformLocation(this.p, n); this.cache.set(n, l); } return l; }
  f(n: string, v: number) { const l = this.u(n); if (l) this.gl.uniform1f(l, v); }
  v2(n: string, a: number, b: number) { const l = this.u(n); if (l) this.gl.uniform2f(l, a, b); }
  v3(n: string, a: number, b: number, c: number) { const l = this.u(n); if (l) this.gl.uniform3f(l, a, b, c); }
}

type Draw = { vao: WebGLVertexArrayObject; n: number; type: number };

export class OceanRenderer {
  readonly gl: WebGL2RenderingContext;
  level = 0;
  scale = 1;
  triangles = 0;
  private progs: Record<string, Prog> = {};
  private vp = new Float32Array(16);
  private tex: { caus: WebGLTexture; canopy: WebGLTexture };
  private fbo: WebGLFramebuffer;
  private causSize = 0;
  private w = 1; private h = 1;
  private mood = 0;
  private empty: WebGLVertexArrayObject;
  private terrain!: Draw;
  private props: { kind: PropKind; draw: Draw; count: number; detail: number; sway: number; twoSided: number }[] = [];
  private wreck!: Draw; private wreckInst!: WebGLBuffer;
  private kelp!: Draw & { buf: WebGLBuffer; count: number }; private grass!: Draw & { buf: WebGLBuffer; count: number };
  private fish!: Record<"fish" | "slender", { vao: WebGLVertexArrayObject; n: number; dyn: WebGLBuffer; sta: WebGLBuffer }>;
  private manta!: { vao: WebGLVertexArrayObject; n: number; buf: WebGLBuffer };
  private jelly!: { vao: WebGLVertexArrayObject; n: number; buf: WebGLBuffer };
  private surface!: WebGLVertexArrayObject;
  private shafts!: { vao: WebGLVertexArrayObject; count: number };
  private snow!: { vao: WebGLVertexArrayObject; count: number };
  private bubbles!: { vao: WebGLVertexArrayObject; count: number };
  private lost = false;

  constructor(readonly canvas: HTMLCanvasElement, private readonly world: World, private life: Life, level = 0) {
    const lv = LEVELS[level]!;
    const gl = canvas.getContext("webgl2", { antialias: lv.aa, alpha: false, depth: true, powerPreference: "high-performance", preserveDrawingBuffer: false });
    if (!gl) throw new Error("WebGL 2 is not available");
    this.gl = gl;
    this.level = level;
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this.lost = true; });
    const mk = (n: string, vs: string, fs: string) => { this.progs[n] = new Prog(gl, vs, fs, n); };
    mk("bg", S.BG_VS, S.BG_FS); mk("solid", S.SOLID_VS, S.SOLID_FS); mk("kelp", S.KELP_VS, S.KELP_FS); mk("fish", S.FISH_VS, S.FISH_FS);
    mk("manta", S.MANTA_VS, S.MANTA_FS); mk("jelly", S.JELLY_VS, S.JELLY_FS); mk("surf", S.SURF_VS, S.SURF_FS); mk("shaft", S.SHAFT_VS, S.SHAFT_FS);
    mk("snow", S.SNOW_VS, S.SNOW_FS); mk("bub", S.BUB_VS, S.BUB_FS); mk("caus", S.CAUS_VS, S.CAUS_FS);
    this.empty = gl.createVertexArray()!;

    // textures: caustics (redrawn each frame) and the kelp canopy map
    const caus = gl.createTexture()!, canopy = gl.createTexture()!;
    this.tex = { caus, canopy };
    gl.bindTexture(gl.TEXTURE_2D, canopy);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, CANOPY_N, CANOPY_N, 0, gl.RED, gl.UNSIGNED_BYTE, world.canopy);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.fbo = gl.createFramebuffer()!;
    this.setCausticSize(lv.caustic);

    this.buildGeometry();
  }

  private setCausticSize(n: number) {
    const gl = this.gl;
    this.causSize = n;
    gl.bindTexture(gl.TEXTURE_2D, this.tex.caus);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, n, n, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex.caus, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private buf(target: number, data: ArrayBufferView | ArrayBuffer, usage: number = this.gl.STATIC_DRAW) {
    const gl = this.gl, b = gl.createBuffer()!;
    gl.bindBuffer(target, b); gl.bufferData(target, data as ArrayBufferView, usage);
    return b;
  }

  /** A vertex array for a standard solid mesh, with up to three instance attributes taken from `inst` (12 floats each). */
  private solidVao(m: Mesh, inst: WebGLBuffer | null): Draw {
    const gl = this.gl, vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    this.buf(gl.ARRAY_BUFFER, m.vb);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, STRIDE, 12);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, STRIDE, 24);
    if (inst) {
      gl.bindBuffer(gl.ARRAY_BUFFER, inst);
      for (let k = 0; k < 3; k++) { gl.enableVertexAttribArray(3 + k); gl.vertexAttribPointer(3 + k, 4, gl.FLOAT, false, INST_STRIDE * 4, k * 16); gl.vertexAttribDivisor(3 + k, 1); }
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buf(gl.ELEMENT_ARRAY_BUFFER, m.ib));
    gl.bindVertexArray(null);
    this.triangles += m.n / 3;
    return { vao, n: m.n, type: m.ib instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT };
  }

  private buildGeometry() {
    const gl = this.gl, w = this.world;
    this.terrain = this.solidVao(terrainMesh(), null);

    const shapes: Record<string, () => Mesh> = {
      rock0: () => rockMesh(1), rock1: () => rockMesh(2), rock2: () => rockMesh(3),
      branch0: () => branchCoral(10, 0), branch1: () => branchCoral(21, 1), branch2: () => branchCoral(32, 2),
      fan: fanCoral, brain: brainCoral, barrel: barrelSponge, tube: tubeSponge, mat: coverMat,
    };
    const look: Record<string, [number, number, number]> = { // detail, sway, two-sided
      rock0: [1, 0, 0], rock1: [1, 0, 0], rock2: [1, 0, 0], branch0: [0.3, 0.7, 0], branch1: [0.3, 0.7, 0], branch2: [0.3, 0.9, 0], fan: [0.1, 1.2, 1], brain: [0.4, 0, 0], barrel: [0.6, 0, 0], tube: [0.3, 0.4, 0], mat: [0.5, 0, 0],
    };
    for (const kind of Object.keys(shapes) as PropKind[]) {
      const data = w.props[kind];
      if (!data.length) continue;
      const inst = this.buf(gl.ARRAY_BUFFER, data);
      const [detail, sway, two] = look[kind]!;
      this.props.push({ kind, draw: this.solidVao(shapes[kind]!(), inst), count: data.length / INST_STRIDE, detail, sway, twoSided: two });
    }
    this.wreckInst = this.buf(gl.ARRAY_BUFFER, new Float32Array([w.wreck.x, w.wreck.y, w.wreck.z, 1, w.wreck.yaw, 1, 0, 0, 0.9, 0.85, 0.8, 0]));
    this.wreck = this.solidVao(wreckMesh(), this.wreckInst);

    // kelp and grass: ribbons
    const ribbon = (segs: number): Draw => {
      const v: number[] = [], idx: number[] = [];
      for (let s = 0; s <= segs; s++) v.push(-1, s / segs, 1, s / segs);
      for (let s = 0; s < segs; s++) { const a = s * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      this.buf(gl.ARRAY_BUFFER, new Float32Array(v));
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buf(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx)));
      gl.bindVertexArray(null);
      return { vao, n: idx.length, type: gl.UNSIGNED_SHORT };
    };
    const inst2 = (d: Draw, data: Float32Array) => {
      const b = this.buf(gl.ARRAY_BUFFER, data);
      gl.bindVertexArray(d.vao); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      for (let k = 0; k < 2; k++) { gl.enableVertexAttribArray(3 + k); gl.vertexAttribPointer(3 + k, 4, gl.FLOAT, false, 32, k * 16); gl.vertexAttribDivisor(3 + k, 1); }
      gl.bindVertexArray(null);
      return b;
    };
    const kd = ribbon(16), gd = ribbon(4);
    this.kelp = { ...kd, buf: inst2(kd, w.kelp), count: w.kelp.length / 8 };
    this.grass = { ...gd, buf: inst2(gd, w.grass), count: w.grass.length / 8 };

    // fish: two body shapes, positions refreshed every frame
    const fm = { fish: fishMesh(false), slender: fishMesh(true) };
    this.fish = {} as typeof this.fish;
    for (const shape of ["fish", "slender"] as const) {
      const m = fm[shape], vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      this.buf(gl.ARRAY_BUFFER, m.vb);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, STRIDE, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, STRIDE, 24);
      const dyn = this.buf(gl.ARRAY_BUFFER, this.life.dyn[shape], gl.DYNAMIC_DRAW);
      for (let k = 0; k < 2; k++) { gl.enableVertexAttribArray(3 + k); gl.vertexAttribPointer(3 + k, 4, gl.FLOAT, false, 32, k * 16); gl.vertexAttribDivisor(3 + k, 1); }
      const sta = this.buf(gl.ARRAY_BUFFER, this.life.sta[shape]);
      for (let k = 0; k < 2; k++) { gl.enableVertexAttribArray(5 + k); gl.vertexAttribPointer(5 + k, 4, gl.FLOAT, false, 32, k * 16); gl.vertexAttribDivisor(5 + k, 1); }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buf(gl.ELEMENT_ARRAY_BUFFER, m.ib));
      gl.bindVertexArray(null);
      this.fish[shape] = { vao, n: m.n, dyn, sta };
    }

    const dynMesh = (m: Mesh, data: Float32Array) => {
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      this.buf(gl.ARRAY_BUFFER, m.vb);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, STRIDE, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, STRIDE, 24);
      const b = this.buf(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      for (let k = 0; k < 2; k++) { gl.enableVertexAttribArray(3 + k); gl.vertexAttribPointer(3 + k, 4, gl.FLOAT, false, 32, k * 16); gl.vertexAttribDivisor(3 + k, 1); }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buf(gl.ELEMENT_ARRAY_BUFFER, m.ib));
      gl.bindVertexArray(null);
      return { vao, n: m.n, buf: b };
    };
    this.manta = dynMesh(mantaMesh(), this.life.mantaData);
    this.jelly = dynMesh(jellyMesh(), this.life.jellyData);

    // sea surface: one big square that follows the camera
    this.surface = gl.createVertexArray()!;
    gl.bindVertexArray(this.surface);
    this.buf(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]));
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    gl.bindVertexArray(null);

    // sunbeams: long thin quads, spread over the reef
    const rnd = mulberry32(77), shaftData: number[] = [];
    for (let i = 0; i < 120; i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * 125; shaftData.push(Math.cos(a) * d, Math.sin(a) * d, 2.5 + rnd() * 6, rnd()); }
    const sv = gl.createVertexArray()!;
    gl.bindVertexArray(sv);
    this.buf(gl.ARRAY_BUFFER, new Float32Array([-1, 0, 1, 0, 1, 1, -1, 0, 1, 1, -1, 1]));
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    this.buf(gl.ARRAY_BUFFER, new Float32Array(shaftData));
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 16, 0); gl.vertexAttribDivisor(3, 1);
    gl.bindVertexArray(null);
    this.shafts = { vao: sv, count: 120 };

    // drifting specks
    const sn = new Float32Array(5000 * 4);
    for (let i = 0; i < sn.length; i++) sn[i] = rnd();
    const nv = gl.createVertexArray()!;
    gl.bindVertexArray(nv); this.buf(gl.ARRAY_BUFFER, sn);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
    gl.bindVertexArray(null);
    this.snow = { vao: nv, count: 5000 };

    // vent bubbles
    const bd: number[] = [];
    for (let v = 0; v < w.vents.length; v += 3) for (let k = 0; k < 90; k++) bd.push(w.vents[v]!, w.vents[v + 1]!, w.vents[v + 2]!, rnd() * 3);
    const bv = gl.createVertexArray()!;
    gl.bindVertexArray(bv); this.buf(gl.ARRAY_BUFFER, new Float32Array(bd));
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
    gl.bindVertexArray(null);
    this.bubbles = { vao: bv, count: bd.length / 4 };
  }

  /** Swap in a new set of animals (after a detail change). */
  setLife(life: Life) {
    const gl = this.gl;
    this.life = life;
    for (const shape of ["fish", "slender"] as const) {
      const f = this.fish[shape];
      gl.bindBuffer(gl.ARRAY_BUFFER, f.dyn); gl.bufferData(gl.ARRAY_BUFFER, life.dyn[shape], gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, f.sta); gl.bufferData(gl.ARRAY_BUFFER, life.sta[shape], gl.STATIC_DRAW);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.jelly.buf); gl.bufferData(gl.ARRAY_BUFFER, life.jellyData, gl.DYNAMIC_DRAW);
  }

  setLevel(level: number) {
    this.level = level;
    const lv = LEVELS[level]!;
    if (lv.caustic !== this.causSize) this.setCausticSize(lv.caustic);
  }

  /** Match the drawing buffer to the screen. `scale` lowers the resolution when the computer is struggling. */
  resize(scale = this.scale) {
    const lv = LEVELS[this.level]!;
    this.scale = scale;
    const dpr = Math.min(window.devicePixelRatio || 1, lv.dpr) * scale;
    const w = Math.max(2, Math.round(this.canvas.clientWidth * dpr)), h = Math.max(2, Math.round(this.canvas.clientHeight * dpr));
    if (w !== this.canvas.width || h !== this.canvas.height) { this.canvas.width = w; this.canvas.height = h; }
    this.w = w; this.h = h;
  }

  get isLost() { return this.lost || this.gl.isContextLost(); }

  private common(p: Prog, camPos: [number, number, number], t: number) {
    const gl = this.gl;
    gl.useProgram(p.p);
    const m = p.u("uVP"); if (m) gl.uniformMatrix4fv(m, false, this.vp);
    p.v3("uCam", camPos[0], camPos[1], camPos[2]);
    p.f("uTime", t);
    p.v3("uSun", SUN[0], SUN[1], SUN[2]);
    p.f("uMood", this.mood);
    const a = p.u("uCaus"); if (a) gl.uniform1i(a, 0);
    const b = p.u("uCanopy"); if (b) gl.uniform1i(b, 1);
  }

  draw(view: View, t: number, dt: number) {
    const gl = this.gl;
    if (this.isLost) return;
    const lv = LEVELS[this.level]!;
    this.mood = Math.min(1, this.mood + dt * 0.5);
    const cam: [number, number, number] = [view.x, view.y, view.z];

    // ---- camera matrices
    const cp = Math.cos(view.pitch), fx = Math.cos(view.yaw) * cp, fy = Math.sin(view.pitch), fz = Math.sin(view.yaw) * cp;
    let rx = -fz, ry = 0, rz = fx; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;
    let ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
    const cr = Math.cos(view.roll), sr = Math.sin(view.roll);
    const rx2 = rx * cr + ux * sr, ry2 = ry * cr + uy * sr, rz2 = rz * cr + uz * sr;
    const ux2 = -rx * sr + ux * cr, uy2 = -ry * sr + uy * cr, uz2 = -rz * sr + uz * cr;
    rx = rx2; ry = ry2; rz = rz2; ux = ux2; uy = uy2; uz = uz2;
    const aspect = this.w / this.h, fov = (aspect < 1 ? 74 : 62) * Math.PI / 180, tanH = Math.tan(fov / 2), near = 0.15, far = 420;
    const P = [1 / (tanH * aspect), 0, 0, 0, 0, 1 / tanH, 0, 0, 0, 0, -(far + near) / (far - near), -1, 0, 0, -2 * far * near / (far - near), 0];
    const V = [rx, ux, -fx, 0, ry, uy, -fy, 0, rz, uz, -fz, 0, -(rx * cam[0] + ry * cam[1] + rz * cam[2]), -(ux * cam[0] + uy * cam[1] + uz * cam[2]), (fx * cam[0] + fy * cam[1] + fz * cam[2]), 1];
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0; for (let k = 0; k < 4; k++) s += P[k * 4 + r]! * V[c * 4 + k]!;
      this.vp[c * 4 + r] = s;
    }

    // ---- the caustic pattern, redrawn at a gentle rate
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.causSize, this.causSize);
    const cp2 = this.progs.caus!;
    gl.useProgram(cp2.p); cp2.f("uT", t); cp2.f("uSize", this.causSize);
    gl.bindVertexArray(this.empty); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex.caus); gl.generateMipmap(gl.TEXTURE_2D);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tex.canopy);
    gl.activeTexture(gl.TEXTURE0);

    // ---- the scene
    gl.viewport(0, 0, this.w, this.h);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    const bg = this.progs.bg!;
    this.common(bg, cam, t);
    bg.v3("uRight", rx, ry, rz); bg.v3("uUp", ux, uy, uz); bg.v3("uFwd", fx, fy, fz); bg.v2("uTan", tanH * aspect, tanH);
    gl.bindVertexArray(this.empty); gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE);

    // floor
    const so = this.progs.solid!;
    this.common(so, cam, t);
    so.f("uTwoSided", 1);
    so.f("uDetail", lv.detail); so.f("uSway", 0); so.f("uTerrain", 1);
    gl.bindVertexArray(this.terrain.vao);
    gl.vertexAttrib4f(3, 0, 0, 0, 1); gl.vertexAttrib4f(4, 0, 1, 0, 0); gl.vertexAttrib4f(5, 1, 1, 1, 0);
    gl.drawElements(gl.TRIANGLES, this.terrain.n, this.terrain.type, 0);
    // wreck
    so.f("uTerrain", 0); so.f("uDetail", lv.detail * 0.6);
    gl.bindVertexArray(this.wreck.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, this.wreck.n, this.wreck.type, 0, 1);
    // rocks, corals, sponges
    for (const p of this.props) {
      so.f("uDetail", p.detail * lv.detail); so.f("uSway", p.sway); so.f("uTwoSided", 1);
      gl.bindVertexArray(p.draw.vao);
      const n = Math.max(1, Math.floor(p.count * lv.props));
      gl.drawElementsInstanced(gl.TRIANGLES, p.draw.n, p.draw.type, 0, n);
    }

    // kelp and grass
    const kp = this.progs.kelp!;
    this.common(kp, cam, t);
    kp.f("uGlint", lv.detail > 0 ? 1 : 0.5);
    kp.f("uStiff", 1); kp.v3("uColA", .09, .2, .04); kp.v3("uColB", .55, .5, .1);
    gl.bindVertexArray(this.kelp.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, this.kelp.n, this.kelp.type, 0, Math.floor(this.kelp.count * lv.kelp));
    kp.f("uStiff", 0.35); kp.v3("uColA", .2, .5, .14); kp.v3("uColB", .6, .85, .28); kp.f("uGlint", 0);
    gl.bindVertexArray(this.grass.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, this.grass.n, this.grass.type, 0, Math.floor(this.grass.count * lv.grass));

    // fish: refresh their positions first
    const fp = this.progs.fish!;
    this.common(fp, cam, t);
    for (const shape of ["fish", "slender"] as const) {
      const f = this.fish[shape], n = this.life.count[shape];
      if (!n) continue;
      gl.bindVertexArray(f.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, f.dyn);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.life.dyn[shape], 0, n * FISH_STRIDE_DYN);
      gl.drawElementsInstanced(gl.TRIANGLES, f.n, gl.UNSIGNED_SHORT, 0, n);
    }
    // mantas
    const mp = this.progs.manta!;
    this.common(mp, cam, t);
    gl.bindVertexArray(this.manta.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.manta.buf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.life.mantaData);
    gl.drawElementsInstanced(gl.TRIANGLES, this.manta.n, gl.UNSIGNED_SHORT, 0, this.life.mantas.length);

    // the sea surface, seen from below
    const sp = this.progs.surf!;
    this.common(sp, cam, t);
    gl.bindVertexArray(this.surface); gl.drawArrays(gl.TRIANGLES, 0, 6);

    // see-through things
    gl.enable(gl.BLEND); gl.depthMask(false);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const jp = this.progs.jelly!;
    this.common(jp, cam, t);
    gl.bindVertexArray(this.jelly.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.jelly.buf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.life.jellyData);
    gl.drawElementsInstanced(gl.TRIANGLES, this.jelly.n, this.jelly.n > 65535 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0, this.life.jelly.length);

    const bp = this.progs.bub!;
    this.common(bp, cam, t); bp.f("uPx", this.h * 0.9 / Math.tan(fov / 2) * 0.5);
    gl.bindVertexArray(this.bubbles.vao); gl.drawArrays(gl.POINTS, 0, this.bubbles.count);

    gl.blendFunc(gl.ONE, gl.ONE);
    const sh = this.progs.shaft!;
    this.common(sh, cam, t);
    gl.bindVertexArray(this.shafts.vao); gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.shafts.count);
    const sn = this.progs.snow!;
    this.common(sn, cam, t); sn.f("uPx", this.h * 0.9 / Math.tan(fov / 2) * 0.5); sn.f("uBright", 0.9 * Math.exp(-Math.max(-cam[1], 0) * 0.02) + 0.1);
    gl.bindVertexArray(this.snow.vao); gl.drawArrays(gl.POINTS, 0, Math.min(this.snow.count, lv.snow));

    gl.depthMask(true); gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }
}
