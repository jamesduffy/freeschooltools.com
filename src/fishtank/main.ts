import "./fishtank.css";
import { h, s } from "../shared/dom";
import { ALL_ART, FLOOR_ART, spriteSheet, useSvg, type FishId } from "./art";
import { scareFish, scareWalker, stepFish, stepWalker, type Bounds, type FloorKind, type Fish, type Walker } from "./sim";

/** Fish Tank: a touch toy. Tap or drag and nearby fish dart away; crabs, starfish and hermit crabs walk the sand.
 *  Everything is drawn in code. No sound, no storage, no network. */

type Spec = { id: FishId; width: number; count: number; upright?: boolean; school?: boolean };
// width is a fraction of the shorter screen side, so fish are a sensible size on a phone or a tablet
const ROSTER: Spec[] = [
  { id: "minnows", width: 0.1, count: 8, school: true },
  { id: "tetra", width: 0.085, count: 7, school: true },
  { id: "butterflyfish", width: 0.2, count: 2 }, { id: "angelfish", width: 0.16, count: 2 },
  { id: "pufferfish", width: 0.18, count: 1 }, { id: "boxfish", width: 0.16, count: 1 }, { id: "lionfish", width: 0.22, count: 1 },
  { id: "seahorse", width: 0.11, count: 2, upright: true }, { id: "jellyfish", width: 0.15, count: 2, upright: true },
  { id: "octopus", width: 0.18, count: 1, upright: true }, { id: "squid", width: 0.3, count: 1 }, { id: "anglerfish", width: 0.22, count: 1 },
  { id: "turtle", width: 0.3, count: 1 }, { id: "dolphin", width: 0.38, count: 1 }, { id: "swordfish", width: 0.42, count: 1 },
  { id: "hammerhead", width: 0.42, count: 1 }, { id: "orca", width: 0.5, count: 1 }, { id: "manta", width: 0.42, count: 1 },
  { id: "whaleshark", width: 0.5, count: 1 },
];
const FLOOR: { kind: FloorKind; width: number; count: number; walk: number; run: number }[] = [
  { kind: "crab", width: 0.2, count: 2, walk: 0.1, run: 7 },
  { kind: "starfish", width: 0.13, count: 2, walk: 0.02, run: 5 },
  { kind: "hermit", width: 0.16, count: 2, walk: 0.045, run: 4 },
];

const SVGNS = "http://www.w3.org/2000/svg";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

type FishView = { f: Fish; el: HTMLElement; w: number; h: number; dir: 1 | -1; angle: number; phase: number };
type WalkView = { c: Walker; el: HTMLElement; w: number; h: number };

function inlineSvg(kind: FloorKind): SVGElement {
  const a = FLOOR_ART[kind];
  const doc = new DOMParser().parseFromString(`<svg xmlns="${SVGNS}">${a.body}</svg>`, "image/svg+xml");
  const svg = s("svg", { viewBox: `0 0 ${a.w} ${a.h}`, class: kind, "aria-hidden": "true", focusable: "false" });
  svg.append(...[...doc.documentElement.children].map((n) => document.importNode(n, true)));
  return svg;
}

function start() {
  const app = document.getElementById("app")!;
  const tank = h("div", { class: "tank", role: "img", "aria-label": "A fish tank. Tap or drag on the screen and the fish swim away." });
  app.replaceChildren(spriteSheet(), tank);

  let W = 0, H = 0, S = 0, bounds: Bounds = { w: 0, h: 0, floorTop: 0 };
  let fish: FishView[] = [], walkers: WalkView[] = [];

  function build() {
    W = tank.clientWidth; H = tank.clientHeight; S = Math.min(W, H);
    bounds = { w: W, h: H, floorTop: H * 0.8 };
    tank.replaceChildren();
    // scenery
    const rays = h("div", { class: "rays" });
    for (const [x, rot] of [[8, -12], [32, -8], [58, -14], [82, -9]] as const) rays.append(h("div", { class: "ray", style: `left:${x}%;transform:rotate(${rot}deg)` }));
    tank.append(rays, h("div", { class: "sand" }), h("div", { class: "sand2" }));
    for (let i = 0; i < 6; i++) {
      const sz = rnd(6, 12);
      tank.append(h("span", { class: "ambient", style: `left:${rnd(4, 96)}%;width:${sz}px;height:${sz}px;animation-duration:${rnd(14, 26)}s;animation-delay:${-rnd(0, 20)}s` }));
    }
    const rock = (x: number, w: number, c: string) => h("div", { class: "deco", style: `left:${x}%;bottom:7%;width:${w * S}px;height:${w * S * 0.6}px;background:${c};border-radius:50% 50% 40% 40% / 70% 70% 30% 30%` });
    tank.append(rock(6, 0.22, "#7d8c96"), rock(72, 0.28, "#8b9aa4"), rock(80, 0.16, "#6c7b85"));

    // fish
    fish = [];
    for (const spec of ROSTER) {
      const art = ALL_ART[spec.id];
      const w = spec.width * S, hgt = w * (art.h / art.w);
      const cruise = S * (0.15 - 0.12 * spec.width) * (reduce ? 0.6 : 1);
      const leaderIndex = fish.length;
      for (let i = 0; i < spec.count; i++) {
        const el = h("div", { class: "fish", style: `width:${w}px;height:${hgt}px;z-index:${Math.round(1000 - w)}` }, useSvg(spec.id, art));
        tank.append(el);
        const f: Fish = {
          x: rnd(w, W - w), y: rnd(hgt, bounds.floorTop - hgt), vx: 0, vy: 0, cruise: cruise * rnd(0.85, 1.15),
          half: { w: w / 2, h: hgt / 2 }, tx: 0, ty: 0, retarget: rnd(0, 3), upright: !!spec.upright,
        };
        if (spec.school && i > 0) f.follow = { leader: leaderIndex, dx: rnd(-w * 1.6, w * 1.6), dy: rnd(-w * 0.9, w * 0.9) };
        else stepFish(f, 0, bounds);
        fish.push({ f, el, w, h: hgt, dir: Math.random() < 0.5 ? 1 : -1, angle: 0, phase: rnd(0, 6.28) });
      }
    }
    // keep followers near their leader at the start
    for (const v of fish) if (v.f.follow) { const l = fish[v.f.follow.leader]!.f; v.f.x = l.x + v.f.follow.dx; v.f.y = Math.min(bounds.floorTop - v.h, Math.max(v.h, l.y + v.f.follow.dy)); }

    // floor creatures
    walkers = [];
    for (const spec of FLOOR) for (let i = 0; i < spec.count; i++) {
      const art = FLOOR_ART[spec.kind];
      const w = spec.width * S, hgt = w * (art.h / art.w);
      const el = h("div", { class: "walker", style: `width:${w}px;height:${hgt}px` }, inlineSvg(spec.kind));
      tank.append(el);
      const c: Walker = { kind: spec.kind, x: rnd(w, W - w), y: Math.random(), dir: Math.random() < 0.5 ? 1 : -1, state: "walk", timer: rnd(1, 5), walk: spec.walk * S, runMult: spec.run, half: w / 2 };
      walkers.push({ c, el, w, h: hgt });
    }

    // plants in front
    const kelp = (x: number, hgt: number, color: string, d: number) => {
      const a = hgt * S, b = a * 0.18;
      const svg = s("svg", { viewBox: "0 0 40 200", class: "deco kelp", style: `left:${x}%;bottom:5%;width:${b}px;height:${a}px;animation-delay:${d}s;z-index:2000`, "aria-hidden": "true" },
        s("path", { d: "M18 200 Q-4 150 18 110 Q40 70 14 30 Q12 14 22 0 Q30 40 30 80 Q8 120 30 160 Q30 184 24 200Z", fill: color }));
      return svg;
    };
    tank.append(kelp(12, 0.5, "#3f8f6a", -1), kelp(16, 0.34, "#58a77c", -3), kelp(60, 0.42, "#3f8f6a", -2), kelp(92, 0.55, "#4d9f75", -4), kelp(88, 0.3, "#58a77c", -5));
  }

  const floorY = (v: WalkView) => bounds.floorTop + (H - bounds.floorTop) * (0.18 + 0.62 * v.c.y);
  const radius = () => S * 0.6;

  function bubbles(x: number, y: number) {
    for (let i = 0; i < 4; i++) {
      const sz = rnd(8, 18);
      const b = h("span", { class: "bubble", style: `left:${x + rnd(-24, 24)}px;top:${y + rnd(-14, 14)}px;width:${sz}px;height:${sz}px;animation-delay:${i * 0.07}s` });
      tank.append(b);
      setTimeout(() => b.remove(), 1600);
    }
  }
  function scare(x: number, y: number, strength: number) {
    const R = radius();
    for (const v of fish) scareFish(v.f, x, y, R, strength);
    for (const v of walkers) scareWalker(v.c, x, y, R * 1.1, floorY(v));
  }

  let lastDrag = 0;
  tank.addEventListener("pointerdown", (e) => {
    const r = tank.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    tank.append(h("span", { class: "ripple", style: `left:${x}px;top:${y}px` }));
    const rip = tank.lastElementChild; setTimeout(() => rip?.remove(), 800);
    bubbles(x, y);
    scare(x, y, 1);
    try { navigator.vibrate?.(8); } catch { /* not supported */ }
  });
  tank.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" && e.buttons === 0) return;
    const now = performance.now();
    if (now - lastDrag < 60) return;
    lastDrag = now;
    const r = tank.getBoundingClientRect();
    scare(e.clientX - r.left, e.clientY - r.top, 0.55);
  });
  tank.addEventListener("contextmenu", (e) => e.preventDefault());

  // ---- main loop ----
  let last = performance.now();
  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    for (const v of fish) {
      stepFish(v.f, dt, bounds, fish.map((x) => x.f));
      if (Math.abs(v.f.vx) > v.f.cruise * 0.3) v.dir = v.f.vx >= 0 ? 1 : -1;
      const sp = Math.hypot(v.f.vx, v.f.vy);
      const wig = Math.sin(t * (4 + sp / v.f.cruise * 2) + v.phase) * Math.min(0.09, 0.03 + sp / v.f.cruise * 0.01);
      const want = v.f.upright ? wig * 0.6 : v.dir * Math.max(-0.5, Math.min(0.5, Math.atan2(v.f.vy, Math.max(Math.abs(v.f.vx), 1)))) + wig;
      v.angle += (want - v.angle) * Math.min(1, dt * 8);
      const bob = reduce ? 0 : Math.sin(t * 1.3 + v.phase) * 3;
      v.el.style.transform = `translate3d(${(v.f.x - v.w / 2).toFixed(1)}px,${(v.f.y - v.h / 2 + bob).toFixed(1)}px,0) rotate(${v.angle.toFixed(3)}rad) scaleX(${v.dir})`;
    }
    for (const v of walkers) {
      stepWalker(v.c, dt, bounds);
      const sc = 0.85 + 0.3 * v.c.y;
      const moving = v.c.state === "walk" || v.c.state === "run";
      v.el.classList.toggle("moving", moving);
      v.el.classList.toggle("running", v.c.state === "run");
      v.el.classList.toggle("hiding", v.c.state === "hide");
      const flip = v.c.kind === "hermit" ? v.c.dir : 1;
      v.el.style.zIndex = String(Math.round(1500 + v.c.y * 100));
      v.el.style.transform = `translate3d(${(v.c.x - v.w / 2).toFixed(1)}px,${(floorY(v) - v.h * sc).toFixed(1)}px,0) scale(${(sc * flip).toFixed(3)},${sc.toFixed(3)})`;
      v.el.style.transformOrigin = "50% 0";
    }
    requestAnimationFrame(frame);
  }

  build();
  requestAnimationFrame((n) => { last = n; frame(n); });
  let rt: number | undefined;
  window.addEventListener("resize", () => { window.clearTimeout(rt); rt = window.setTimeout(() => { if (tank.clientWidth !== W || tank.clientHeight !== H) build(); }, 200); });
}

start();
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("/fishtank/sw.js", { scope: "/fishtank/" }).catch(() => { /* offline mode just will not be available */ });
}
