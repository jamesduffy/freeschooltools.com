// All shaders are written here as text and compiled in the browser. Nothing is downloaded.
//
// The water look follows the ideas used by the MIT-licensed "Abyssal Garden" demo by Maksymilian Dendura
// (github.com/Noniv/abyssal-garden): light is absorbed per colour channel with depth, so red dies first and
// everything fades toward deep blue; a small animated caustic texture is projected along the sun; sun
// shafts fall from the surface; kelp sways in a current. This version is rewritten for WebGL2 so it runs on
// ordinary school computers, not only on WebGPU browsers.

const HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
`;

/** Shared by every fragment shader: water colour, absorption fog, sunlight, caustics, tone mapping. */
const WATER = `
uniform vec3 uCam; uniform float uTime; uniform vec3 uSun; uniform float uMood;
uniform sampler2D uCaus; uniform sampler2D uCanopy;
const vec3 SIG = vec3(.058, .0235, .0195);   // how fast red, green, blue light is absorbed (per metre)
const vec3 KDZ = vec3(.034, .023, .018);     // how fast the glow of the water itself dims with depth
const vec3 SUNC = vec3(1.0, .93, .78) * 3.0;

vec3 scatterCol(float y) { return vec3(.05, .58, .92) * exp(-KDZ * max(-y, 0.) * 1.0) * uMood; }
// what you see looking out into empty water in direction dir
vec3 bgColor(vec3 dir, float camY) {
  float k = mix(.3, 1.3, smoothstep(-.8, .95, dir.y));
  vec3 c = scatterCol(camY) * k;
  float dep = max(-camY, 0.);
  float sd = max(dot(dir, uSun), 0.);
  c += vec3(.5, .78, .85) * pow(sd, 5.) * .55 * exp(-.045 * dep) * uMood;
  c += vec3(.8, .95, 1.) * pow(sd, 60.) * .9 * exp(-.04 * dep) * uMood;
  return c;
}
vec3 fogIt(vec3 col, vec3 wp) {
  vec3 v = wp - uCam; float d = length(v);
  vec3 dir = v / max(d, 1e-3);
  vec3 T = exp(-SIG * d * .42);
  float s = 1. - exp(-d * .024);
  return col * T * (1. - s) + bgColor(dir, uCam.y) * s;
}
vec3 sunAt(vec3 wp) { return SUNC * exp(-SIG * max(-wp.y, 0.)) * uMood; }
vec3 skyAt(vec3 wp) { return vec3(.24, .66, 1.0) * 1.35 * exp(-KDZ * max(-wp.y, 0.) * 1.2) * uMood; }
float canopyShade(vec3 wp) {
  float c = texture(uCanopy, (wp.xz + 128.) / 256.).r;
  return 1. - .85 * c * smoothstep(-5., -14., wp.y);
}
float causticAt(vec3 wp) {
  float D = max(-wp.y, 0.);
  vec2 q = wp.xz + uSun.xz / max(uSun.y, .2) * D;
  float a = texture(uCaus, q * .16 + vec2(uTime * .006, 0.)).r;
  float b = texture(uCaus, q * .29 + vec2(.37, -uTime * .005)).r;
  return (a * .6 + b * .6) * 2.2 * exp(-D * .045);
}
// light arriving at a surface point with normal n
vec3 lightAt(vec3 wp, vec3 n, float occl) {
  float ndl = max(dot(n, uSun), 0.);
  float cs = canopyShade(wp);
  vec3 sun = sunAt(wp) * ndl * (.5 + causticAt(wp)) * cs;
  float up = n.y * .5 + .5;
  vec3 amb = skyAt(wp) * (.18 + .55 * up) * (.45 + .55 * cs) * occl;
  return sun + amb;
}
vec3 tone(vec3 c) {
  c = 1. - exp(-c * 1.25);
  return pow(c, vec3(1. / 2.15));
}
float hash11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise3(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  float a = hash21(i.xy + i.z * 37.), b = hash21(i.xy + vec2(1, 0) + i.z * 37.), c = hash21(i.xy + vec2(0, 1) + i.z * 37.), d = hash21(i.xy + vec2(1, 1) + i.z * 37.);
  float a2 = hash21(i.xy + (i.z + 1.) * 37.), b2 = hash21(i.xy + vec2(1, 0) + (i.z + 1.) * 37.), c2 = hash21(i.xy + vec2(0, 1) + (i.z + 1.) * 37.), d2 = hash21(i.xy + vec2(1, 1) + (i.z + 1.) * 37.);
  return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(a2, b2, f.x), mix(c2, d2, f.x), f.y), f.z);
}
`;

const UNI_VERT = `uniform mat4 uVP; uniform vec3 uCam; uniform float uTime;`;

// ---------------------------------------------------------------- the background: water seen in every direction
export const BG_VS = HEAD + `
uniform vec3 uRight, uUp, uFwd; uniform vec2 uTan;
out vec3 vDir;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) * 2. - 1.;
  vDir = uFwd + p.x * uTan.x * uRight + p.y * uTan.y * uUp;
  gl_Position = vec4(p, 1., 1.);
}`;
export const BG_FS = HEAD + WATER + `
in vec3 vDir; out vec4 o;
void main() {
  vec3 d = normalize(vDir);
  vec3 c = bgColor(d, uCam.y);
  // fine banding-breaker noise
  c += (hash21(gl_FragCoord.xy + fract(uTime) * 91.) - .5) * .004;
  o = vec4(tone(c), 1.);
}`;

// ---------------------------------------------------------------- solid things: floor, rocks, corals, sponges, wreck
export const SOLID_VS = HEAD + UNI_VERT + `
layout(location = 0) in vec3 aPos; layout(location = 1) in vec3 aNrm; layout(location = 2) in vec4 aCol;
layout(location = 3) in vec4 iPos;  // xyz, scale
layout(location = 4) in vec4 iRot;  // yaw, squash, seed
layout(location = 5) in vec4 iTint; // rgb, glow
uniform float uSway;
out vec3 vWp; out vec3 vN; out vec4 vCol; out vec3 vLocal; out vec4 vTint;
void main() {
  vec3 p = aPos; p.y *= iRot.y; p *= iPos.w;
  float h = max(aPos.y, 0.);
  float s = uSway * h * iPos.w * .045;
  p.x += sin(uTime * .8 + iRot.z + h * 2.) * s; p.z += cos(uTime * .6 + iRot.z * 1.3 + h * 1.6) * s;
  float c = cos(iRot.x), sn = sin(iRot.x);
  p = vec3(c * p.x + sn * p.z, p.y, -sn * p.x + c * p.z);
  vN = vec3(c * aNrm.x + sn * aNrm.z, aNrm.y, -sn * aNrm.x + c * aNrm.z);
  vWp = p + iPos.xyz; vCol = aCol; vLocal = aPos; vTint = iTint;
  gl_Position = uVP * vec4(vWp, 1.);
}`;
export const SOLID_FS = HEAD + WATER + `
in vec3 vWp; in vec3 vN; in vec4 vCol; in vec3 vLocal; in vec4 vTint;
uniform float uDetail; uniform float uTwoSided; uniform float uTerrain;
out vec4 o;
float dn(vec3 p) { return vnoise3(p * 1.7) * .55 + vnoise3(p * 4.1) * .3 + vnoise3(p * 9.3) * .15; }
void main() {
  vec3 n = normalize(vN);
  if (uTwoSided > .5 && !gl_FrontFacing) n = -n;
  if (vCol.a < .7) { // lace fan: cut holes
    vec2 q = vLocal.xy * 16.;
    float lat = min(abs(sin(q.x + sin(q.y * .7))), abs(sin(q.y * 1.3 - q.x * .5)));
    if (lat > .55) discard;
  }
  vec3 alb = vCol.rgb * vTint.rgb;
  float d = uDetail > 0. ? dn(vWp) : .5;
  if (uTerrain > .5) {
    float slope = 1. - clamp(n.y, 0., 1.);
    float n1 = vnoise3(vWp * .35), n2 = vnoise3(vWp * 1.3 + 5.), n3 = vnoise3(vWp * .09 + 11.);
    vec3 sand = vec3(.9, .8, .6) * (.82 + .3 * n1 + .1 * n2);
    sand *= .93 + .1 * sin((vWp.x * .8 + vWp.z * .45) * 2.6 + n3 * 9.);
    vec3 rock = mix(vec3(.5, .42, .36), vec3(.33, .35, .35), n1) * (.78 + .5 * n2);
    rock *= .92 + .12 * sin(vWp.y * 2.4 + n3 * 8. + n1 * 2.);
    float algae = smoothstep(.5, .9, n.y) * smoothstep(-36., -10., vWp.y) * smoothstep(.35, .7, n3);
    rock = mix(rock, vec3(.28, .4, .18), algae * .55);
    float rk = smoothstep(.16, .4, slope + (n3 - .5) * .35 + smoothstep(-24., -6., vWp.y) * .12);
    alb = mix(sand, rock, rk);
  }
  float grain = uDetail;
  alb *= 1. + grain * (d - .5) * 1.1;
  if (grain > 0.) { // bump from the noise, using screen-space derivatives
    vec3 dpx = dFdx(vWp), dpy = dFdy(vWp);
    vec3 r1 = cross(dpy, n), r2 = cross(n, dpx);
    float det = dot(dpx, r1);
    vec3 g = sign(det) * (dFdx(d) * r1 + dFdy(d) * r2);
    n = normalize(abs(det) * n - g * grain * .35);
  }
  float occl = mix(1., smoothstep(-.4, .5, n.y) * .5 + .5, .35);
  vec3 L = lightAt(vWp, n, occl);
  vec3 col = alb * L + alb * vTint.w * .55 * (.8 + .2 * sin(uTime * .8 + vWp.x));
  o = vec4(tone(fogIt(col, vWp)), 1.);
}`;

// ---------------------------------------------------------------- kelp and seagrass ribbons
export const KELP_VS = HEAD + UNI_VERT + `
layout(location = 0) in vec2 aSeg;  // across (-1..1), along (0..1)
layout(location = 3) in vec4 iBase; // xyz, height
layout(location = 4) in vec4 iPar;  // phase, width, hue, seed
uniform float uStiff;
out vec3 vWp; out vec3 vN; out vec2 vUV; out float vHue; out float vV;
void main() {
  float v = aSeg.y, H = iBase.w, t = uTime;
  float bend = v * v * (1.4 - .4 * v);
  float swell = sin(t * .32 + iBase.x * .035 + iBase.z * .03) + .5 * sin(t * .21 + iBase.x * .06 - iBase.z * .045);
  float local = sin(t * .75 + iPar.x + v * 2.6) * .5 + sin(t * 1.3 + iPar.x * 2. + v * 4.) * .15;
  float amp = H * uStiff;
  vec2 cur = vec2(.8, .35);
  vec3 p = vec3(0., v * H, 0.);
  p.xz += cur * (bend * amp * (.16 + .1 * swell)) + vec2(local * .05, local * .03) * bend * amp;
  p.y -= bend * amp * .03;
  float yaw = iPar.w * 6.2832 + v * 1.4 * sin(iPar.w * 11.);
  vec3 across = vec3(cos(yaw), 0., sin(yaw));
  float w = iPar.y * (1. - pow(v, 2.2) * .35) * (1. - smoothstep(.8, 1., v)) * (.75 + .25 * sin(v * 26. + iPar.w * 30.)) * (v < .03 ? .3 : 1.);
  p += across * aSeg.x * w;
  vN = vec3(-sin(yaw), .25, cos(yaw));
  vWp = p + iBase.xyz; vUV = vec2(aSeg.x * .5 + .5, v * H); vHue = iPar.z; vV = v;
  gl_Position = uVP * vec4(vWp, 1.);
}`;
export const KELP_FS = HEAD + WATER + `
in vec3 vWp; in vec3 vN; in vec2 vUV; in float vHue; in float vV;
uniform vec3 uColA; uniform vec3 uColB; uniform float uGlint;
out vec4 o;
void main() {
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  // blades very close to the camera fade out in a dither, so they never block the view
  float dc = length(vWp - uCam);
  if (dc < 3.5 && hash21(gl_FragCoord.xy) > dc / 3.5 - .15) discard;
  vec3 alb = mix(uColA, uColB, vHue) * (.55 + .7 * vV);
  alb *= .85 + .3 * sin(vUV.x * 6.283 * 1.0) * .5;
  // light shines through the blade: lit from either side
  float ndl = abs(dot(n, uSun)) * .75 + .25;
  float cs = canopyShade(vWp);
  vec3 sun = sunAt(vWp) * ndl * (.55 + .7 * causticAt(vWp)) * mix(1., cs, .5);
  vec3 col = alb * (sun + skyAt(vWp) * .5);
  // tiny gold and green sparkles that wink as the blade moves
  vec2 g = vec2(vUV.x * 5., vUV.y * 9.);
  vec2 cell = floor(g);
  vec2 off = vec2(hash21(cell + 7.), hash21(cell + 13.));
  float sp = step(.8, hash21(cell + vHue * 91.)) * smoothstep(.2, .0, length(fract(g) - (.25 + .5 * off)));
  float tw = .5 + .5 * sin(uTime * (1.2 + hash21(cell) * 2.) + hash21(cell + 4.) * 30.);
  col += (mix(vec3(1., .8, .2), vec3(.4, 1., .5), hash21(cell + 2.))) * sp * tw * uGlint * exp(-max(-vWp.y, 0.) * .02) * 1.4;
  o = vec4(tone(fogIt(col, vWp)), 1.);
}`;

// ---------------------------------------------------------------- fish
export const FISH_VS = HEAD + UNI_VERT + `
layout(location = 0) in vec3 aPos; layout(location = 1) in vec3 aNrm; layout(location = 2) in vec4 aCol;
layout(location = 3) in vec4 iA; // xyz, size
layout(location = 4) in vec4 iB; // direction xyz, phase
layout(location = 5) in vec4 iC; // colour, pattern
layout(location = 6) in vec4 iD; // colour 2, speed
out vec3 vWp; out vec3 vN; out vec3 vLocal; out vec4 vC; out vec4 vD; out vec4 vCol; out float vPh;
void main() {
  vec3 f = normalize(iB.xyz);
  vec3 side = cross(f, vec3(0., 1., 0.)); float sl = length(side);
  side = sl < .02 ? vec3(0., 0., 1.) : side / sl;
  vec3 up = cross(side, f);
  vec3 p = aPos;
  // swimming: a wave runs down the body, strongest at the tail
  float u = aCol.r * 1.25;
  float amp = .05 + .02 * iD.w;
  p.z += sin(iB.w - u * 7.) * amp * smoothstep(.25, 1., u) * (aCol.b > .5 ? 1.6 : 1.) ;
  p.z += sin(iB.w - u * 5.) * .01;
  // loose fins flutter
  if (aCol.g > .5) p.z += sin(iB.w * 1.3 + p.x * 9.) * .025 * (abs(p.y) + abs(p.z) * 3.);
  vec3 w = (f * p.x + up * p.y + side * p.z) * iA.w;
  vec3 nn = f * aNrm.x + up * aNrm.y + side * aNrm.z;
  vWp = iA.xyz + w; vN = nn; vLocal = aPos; vC = iC; vD = iD; vCol = aCol; vPh = iB.w;
  gl_Position = uVP * vec4(vWp, 1.);
}`;
export const FISH_FS = HEAD + WATER + `
in vec3 vWp; in vec3 vN; in vec3 vLocal; in vec4 vC; in vec4 vD; in vec4 vCol; in float vPh;
out vec4 o;
void main() {
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  float lx = vLocal.x, ly = vLocal.y, lz = vLocal.z;
  float pat = vC.a;
  vec3 c1 = vC.rgb, c2 = vD.rgb;
  float belly = smoothstep(.0, -.12, ly);
  vec3 alb = mix(c1, mix(c1, c2, .85), belly * (pat > 4.5 ? 1. : .45));
  if (pat > .5 && pat < 1.5) { float st = smoothstep(.55, .75, abs(sin(lx * 15. + .6))) ; alb = mix(c1, c2, st * smoothstep(-.4, .1, lx)); }
  else if (pat > 1.5 && pat < 2.5) { alb = mix(alb, c2, (1. - smoothstep(.0, .045, abs(ly - .01 - lx * .04))) * smoothstep(-.4, .1, lx)); }
  else if (pat > 2.5 && pat < 3.5) { float sp = smoothstep(.6, .8, vnoise3(vec3(lx * 22., ly * 38., lz * 30.))); alb = mix(alb, alb * .35, sp * .8); }
  else if (pat > 3.5 && pat < 4.5) { float fin = smoothstep(-.28, -.36, lx); alb = mix(c1, c2, fin); alb *= 1. - .8 * smoothstep(.02, .0, abs(ly + lx * .1 - .05)) * .5; }
  else if (pat > 4.5 && pat < 5.5) { alb = mix(c2, c1, smoothstep(-.02, .12, ly)); }
  else if (pat > 5.5) { alb = mix(c2, c1, smoothstep(.02, -.1, -ly + .02)); alb = mix(c1, c2, smoothstep(.0, -.09, ly)); }
  // fins are paler and a bit see-through looking
  alb = mix(alb, mix(alb, c2, .5) * 1.1, vCol.g * .6);
  // eye
  float eye = smoothstep(.026, .015, length(vec2(lx - .39, ly - .025))) * step(.0, abs(lz) - .02);
  alb = mix(alb, vec3(.02), eye);
  vec3 L = lightAt(vWp, n, 1.);
  float rim = pow(1. - abs(dot(n, normalize(uCam - vWp))), 3.);
  vec3 col = alb * (L * 1.15 + skyAt(vWp) * .25);
  if (pat > 4.5 && pat < 5.5) { // baitfish flash as they turn
    float fl = pow(.5 + .5 * sin(vPh * .6 + lx * 3. + vWp.x), 8.);
    col += vec3(.7, .85, 1.) * fl * sunAt(vWp) * .5;
  }
  col += rim * skyAt(vWp) * .5;
  o = vec4(tone(fogIt(col, vWp)), 1.);
}`;

// ---------------------------------------------------------------- manta rays
export const MANTA_VS = HEAD + UNI_VERT + `
layout(location = 0) in vec3 aPos; layout(location = 1) in vec3 aNrm; layout(location = 2) in vec4 aCol;
layout(location = 3) in vec4 iA; // xyz, span
layout(location = 4) in vec4 iB; // yaw, pitch, roll, phase
out vec3 vWp; out vec3 vN; out vec3 vLocal; out float vTopSide;
void main() {
  vec3 f = vec3(cos(iB.x), 0., sin(iB.x));
  vec3 r = vec3(f.z, 0., -f.x);
  vec3 up = vec3(0., 1., 0.);
  float cr = cos(iB.z), sr = sin(iB.z);
  vec3 r2 = r * cr + up * sr, u2 = -r * sr + up * cr;
  vec3 p = aPos;
  float au = aCol.r;
  p.y += sin(iB.w - au * 2.4) * .3 * pow(au, 1.3);
  p.z += cos(iB.w - au * 2.4) * .05 * au;
  float s = iA.w * .5;
  vec3 w = (r2 * p.x + u2 * p.y + f * p.z) * s;
  vec3 n0 = aNrm;
  vN = r2 * n0.x + u2 * n0.y + f * n0.z;
  vWp = iA.xyz + w; vLocal = aPos; vTopSide = aNrm.y;
  gl_Position = uVP * vec4(vWp, 1.);
}`;
export const MANTA_FS = HEAD + WATER + `
in vec3 vWp; in vec3 vN; in vec3 vLocal; in float vTopSide;
out vec4 o;
void main() {
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  bool upper = dot(normalize(vN), vec3(0., 1., 0.)) * (gl_FrontFacing ? 1. : -1.) > -0.05;
  vec3 dark = vec3(.035, .05, .075), pale = vec3(.86, .88, .9);
  vec3 alb = upper ? dark : pale;
  // pale shoulder patches on the back, dark spots on the belly
  if (upper) { float sh = smoothstep(.25, .12, abs(abs(vLocal.x) - .24)) * smoothstep(.45, .1, abs(vLocal.z - .1)); alb = mix(alb, pale * .8, sh * .8); }
  else { float sp = smoothstep(.7, .85, vnoise3(vec3(vLocal.x * 14., vLocal.z * 14., 1.))) * smoothstep(.55, .0, abs(vLocal.x)); alb = mix(alb, dark, sp * .6); }
  vec3 L = lightAt(vWp, n, 1.);
  vec3 col = alb * (L * 1.2 + skyAt(vWp) * .2);
  o = vec4(tone(fogIt(col, vWp)), 1.);
}`;

// ---------------------------------------------------------------- jellyfish
export const JELLY_VS = HEAD + UNI_VERT + `
layout(location = 0) in vec3 aPos; layout(location = 1) in vec3 aNrm; layout(location = 2) in vec4 aCol;
layout(location = 3) in vec4 iA; // xyz, size
layout(location = 4) in vec4 iB; // phase
out vec3 vWp; out vec3 vN; out float vV; out float vTent; out float vHue;
void main() {
  float ph = iB.x;
  float pulse = sin(ph);
  vec3 p = aPos;
  bool tent = aCol.g > .5;
  if (!tent) { p.xz *= 1. + .16 * pulse * (1. - aCol.r * .3); p.y *= 1. - .14 * pulse; }
  else {
    float v = aCol.r;
    p.xz *= 1. + .16 * pulse * (1. - v);
    p.x += sin(ph - v * 3.5) * .12 * v; p.z += cos(ph * .8 - v * 3.) * .12 * v;
    p.y += .1 * pulse * (1. - v);
  }
  vWp = iA.xyz + p * iA.w; vN = aNrm; vV = aCol.r; vTent = aCol.g; vHue = fract(iA.x * .13 + iA.z * .07);
  gl_Position = uVP * vec4(vWp, 1.);
}`;
export const JELLY_FS = HEAD + WATER + `
in vec3 vWp; in vec3 vN; in float vV; in float vTent; in float vHue;
out vec4 o;
void main() {
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 view = normalize(uCam - vWp);
  float fres = pow(1. - abs(dot(n, view)), 2.2);
  vec3 tint = mix(vec3(.75, .45, 1.), vec3(.35, .9, 1.), vHue);
  vec3 glow = tint * (.5 + 1.1 * fres) * (vTent > .5 ? 1.1 : 1.) + vec3(1., .9, .95) * max(dot(n, uSun), 0.) * .3;
  glow *= exp(-max(-vWp.y, 0.) * .02) * 1.2;
  float a = vTent > .5 ? .55 * (1. - vV * .6) : (.18 + .6 * fres) * (.5 + .5 * smoothstep(0., .5, vV + .15));
  vec3 c = fogIt(glow, vWp);
  o = vec4(tone(c), a);
}`;

// ---------------------------------------------------------------- the sea surface, seen from below
export const SURF_VS = HEAD + `
uniform mat4 uVP; uniform vec3 uCam;
layout(location = 0) in vec2 aXZ;
out vec3 vWp;
void main() { vWp = vec3(uCam.x + aXZ.x * 420., 0., uCam.z + aXZ.y * 420.); gl_Position = uVP * vec4(vWp, 1.); }`;
export const SURF_FS = HEAD + WATER + `
in vec3 vWp; out vec4 o;
vec2 waves(vec2 p, float t) {
  vec2 s = vec2(0.);
  const vec3 K[6] = vec3[6](vec3(.9, .4, .9), vec3(-.5, 1.1, .7), vec3(1.7, -.9, .45), vec3(-2.3, -1.4, .3), vec3(3.1, 2.2, .2), vec3(.4, -3.7, .15));
  for (int i = 0; i < 6; i++) { vec3 k = K[i]; float ph = dot(k.xy, p) * .35 + t * (.5 + .3 * float(i)) * (mod(float(i), 2.) < 1. ? 1. : -1.) + float(i) * 1.7; s += k.xy * k.z * cos(ph); }
  return s;
}
void main() {
  vec3 v = vWp - uCam; float d = length(v); vec3 dir = v / d;
  vec2 g = waves(vWp.xz, uTime) * .032;
  vec3 n = normalize(vec3(-g.x, 1., -g.y));
  float ci = dot(dir, n);
  float sin2t = 1.77 * (1. - ci * ci);
  vec3 refl = reflect(dir, n);
  float k = smoothstep(.8, 1.03, sin2t);
  float ct = sqrt(max(1. - sin2t, 0.));
  vec3 t = normalize(dir * 1.33 - n * (1.33 * ci - ct)); // refracted direction into the air
  vec3 sky = mix(vec3(.55, .78, .95), vec3(.25, .55, .95), smoothstep(.0, 1., t.y)) * 2.2;
  float sd = max(dot(t, uSun), 0.);
  sky += vec3(1., .95, .8) * (pow(sd, 120.) * 18. + pow(sd, 8.) * .6);
  float F = pow(1. - ci, 5.) * .9 + .04;
  vec3 sea = bgColor(refl, uCam.y) * 1.1 + vec3(.04, .22, .3) * .5 * uMood;
  vec3 c = mix(sky, sea, clamp(max(k, F * 2.5), 0., 1.));
  c *= uMood;
  float dep = max(-uCam.y, 0.);
  c *= exp(-SIG * dep * .35);       // the window to the sky dims a bit with depth
  c = fogIt(c, vWp);
  o = vec4(tone(c), 1.);
}`;

// ---------------------------------------------------------------- shafts of sunlight
export const SHAFT_VS = HEAD + UNI_VERT + `
layout(location = 0) in vec2 aQ;    // across -1..1, along 0..1
layout(location = 3) in vec4 iS;    // x, z, width, seed
uniform vec3 uSun;
out vec2 vQ; out float vSeed; out float vD; out float vY;
void main() {
  float len = 70.;
  vec3 axis = -uSun;                                 // light travels away from the sun
  vec3 top = vec3(iS.x, 1., iS.y) + uSun * 0.;
  vec3 pt = top + axis * (aQ.y * len / max(uSun.y, .3));
  vec3 side = normalize(cross(axis, pt - uCam));
  vec3 wp = pt + side * aQ.x * iS.z * (1. + aQ.y * .6);
  vQ = aQ; vSeed = iS.w; vD = length(wp - uCam); vY = wp.y;
  gl_Position = uVP * vec4(wp, 1.);
}`;
export const SHAFT_FS = HEAD + WATER + `
in vec2 vQ; in float vSeed; in float vD; in float vY;
out vec4 o;
void main() {
  float across = 1. - abs(vQ.x);
  float edge = smoothstep(0., .55, across);
  float streak = vnoise3(vec3(vQ.x * 3.5 + vSeed * 40., vQ.y * .6 + uTime * .05, vSeed * 9. + uTime * .08));
  streak = .35 + .9 * streak + .35 * sin(vQ.x * 9. + vSeed * 17. + uTime * .3);
  float depth = max(-vY, 0.);
  float fade = exp(-depth * .052) * smoothstep(0., .16, vQ.y) * smoothstep(1., .55, vQ.y);
  float near = smoothstep(4., 26., vD);
  float camDepth = max(-uCam.y, 0.);
  float a = edge * edge * max(streak, 0.) * fade * near * (.55 + .6 * exp(-camDepth * .02));
  vec3 col = vec3(.45, .85, 1.) * a * .11 * uMood;
  o = vec4(col, 1.);
}`;

// ---------------------------------------------------------------- drifting specks and bubbles
export const SNOW_VS = HEAD + UNI_VERT + `
layout(location = 0) in vec4 aP; // x y z seed
uniform float uPx;
out float vA; out float vTw;
void main() {
  vec3 box = vec3(46., 26., 46.);
  vec3 drift = vec3(.12 + sin(aP.w * 9. + uTime * .1) * .05, -.04 + sin(uTime * .3 + aP.w * 20.) * .03, .05) * uTime;
  vec3 q = mod(aP.xyz * box + drift - uCam + box * .5, box) - box * .5 + uCam;
  float d = length(q - uCam);
  gl_Position = uVP * vec4(q, 1.);
  gl_PointSize = clamp(uPx * (.02 + aP.w * .03) / max(d, .5), 1., 5.);
  vA = smoothstep(60., 6., d) * smoothstep(.5, 2., d) * (.25 + .75 * aP.w);
  vTw = .6 + .4 * sin(uTime * 2.3 + aP.w * 50.);
}`;
export const SNOW_FS = HEAD + `
in float vA; in float vTw; uniform float uBright; out vec4 o;
void main() { vec2 p = gl_PointCoord - .5; float r = length(p); float a = smoothstep(.5, .1, r) * vA * vTw; o = vec4(vec3(.55, .85, 1.) * a * uBright, 1.); }`;

export const BUB_VS = HEAD + UNI_VERT + `
layout(location = 0) in vec4 aE; // vent x y z, seed
uniform float uPx;
out float vA; out float vSz;
void main() {
  float sp = .5 + .6 * fract(aE.w * 7.13);
  float H = -aE.y;
  float ph = mod(uTime * sp * .9 + aE.w * 31., H * .9);
  vec3 p = vec3(aE.x, aE.y + .3 + ph, aE.z);
  p.x += sin(ph * 1.7 + aE.w * 20.) * (.12 + ph * .01) * (.3 + fract(aE.w * 3.1));
  p.z += cos(ph * 1.3 + aE.w * 11.) * (.12 + ph * .01) * (.3 + fract(aE.w * 5.7));
  float size = (.035 + .06 * fract(aE.w * 11.7)) * (1. + ph * .015);
  float d = length(p - uCam);
  gl_Position = uVP * vec4(p, 1.);
  gl_PointSize = clamp(uPx * size / max(d, .5), 2., 28.);
  vA = smoothstep(70., 8., d) * (1. - smoothstep(H * .75, H * .9, ph));
  vSz = d;
}`;
export const BUB_FS = HEAD + WATER + `
in float vA; in float vSz; out vec4 o;
void main() {
  vec2 p = gl_PointCoord * 2. - 1.; float r = length(p);
  if (r > 1.) discard;
  float rim = smoothstep(.6, .95, r) * (1. - smoothstep(.95, 1., r));
  float hi = smoothstep(.35, .0, length(p - vec2(-.35, -.4)));
  vec3 base = bgColor(normalize(vec3(p.x, p.y * -1., .5)), uCam.y);
  vec3 c = base * .35 + vec3(.6, .85, 1.) * (rim * .8 + hi * 1.2) * exp(-max(-uCam.y, 0.) * .02);
  float a = (rim * .7 + hi * .9 + .06) * vA;
  o = vec4(tone(c), a);
}`;

// ---------------------------------------------------------------- caustic texture, redrawn every frame
export const CAUS_VS = HEAD + `
void main() { vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2) * 2. - 1.; gl_Position = vec4(p, 0., 1.); }`;
export const CAUS_FS = HEAD + `
uniform float uT; uniform float uSize; out vec4 o;
void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  vec2 p = mod(uv * 6.2831853, 6.2831853) - 250., i = p;
  float c = 1., inten = .005, t0 = uT * .5 + 23.;
  for (int n = 0; n < 5; n++) {
    float t = t0 * (1. - 3.5 / float(n + 1));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1. / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
  }
  c /= 5.;
  c = 1.17 - pow(c, 1.4);
  o = vec4(vec3(clamp(pow(abs(c), 8.), 0., 1.)), 1.);
}`;
