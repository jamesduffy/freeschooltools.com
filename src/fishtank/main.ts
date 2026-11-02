import "./fishtank.css";
import { h, s } from "../shared/dom";
import { ALL_ART, FLOOR_ART, spriteSheet, useSvg } from "./art";
import { FLOOR, ROSTER, type Spec } from "./roster";
import { hasExited, newDrift, scareFish, scareWalker, sendAway, stepFish, stepWalker, walkerExited, type Bounds, type FloorKind, type Fish, type Walker } from "./sim";

/** Fish Tank: a touch toy. Tap or drag and nearby fish dart away; crabs, starfish and hermit crabs walk the sand.
 *  Everything is drawn in code. No sound, no storage, no network. */

/** Between 3 and 6 things are in the tank at once, fish and sand creatures together (a school counts as one).
 *  The number drifts at random. Each thing swims or walks in from one side, crosses the tank in a straight line without turning
 *  around, leaves by the far side, and is replaced by something else a few seconds later. At most two big fish at a time. */
const MIN_THINGS = 3, MAX_THINGS = 6, MAX_BIG = 2, BIG = 0.38;
const GAP: [number, number] = [0.3, 2.5], RETARGET: [number, number] = [15, 40];
const MAX_STAY = 150; // safety: anything still on screen after this long is sent off

const SVGNS = "http://www.w3.org/2000/svg";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

type Slot = { views: FishView[]; walker?: WalkView; id?: string; big: boolean; phase: "in" | "present" | "out" | "gone"; timer: number };
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
  let slots: Slot[] = [];
  const randomTarget = () => MIN_THINGS + Math.floor(Math.random() * (MAX_THINGS - MIN_THINGS + 1));
  let target = MIN_THINGS, targetTimer = 0;
  const activeCount = () => slots.filter((sl) => sl.phase !== "gone").length;
  /** The number on screen wanders. If it drops, the one due to leave soonest goes a little sooner. */
  function updateTarget(dt: number) {
    targetTimer -= dt;
    if (targetTimer > 0) return;
    target = randomTarget(); targetTimer = rnd(...RETARGET);
    if (activeCount() > target) {
      // the thing closest to its exit goes on its way a little sooner (floor creatures just keep walking)
      const stayers = slots.filter((sl) => sl.phase === "present" && sl.views.length > 0);
      stayers.sort((a, b) => Math.min(...a.views.map((v) => (v.f.heading > 0 ? bounds.w - v.f.x : v.f.x))) - Math.min(...b.views.map((v) => (v.f.heading > 0 ? bounds.w - v.f.x : v.f.x))));
      if (stayers[0]) sendOff(stayers[0]);
    }
  }

  /** `empty`: start with nothing in the water, so the first fish swim in (used when the page first opens). */
  function build(empty = false) {
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

    // things that come and go: fish and sand creatures share the same few slots
    for (const sl of slots) { for (const v of sl.views) v.el.remove(); sl.walker?.el.remove(); }
    slots = Array.from({ length: MAX_THINGS }, () => ({ views: [], big: false, phase: "gone" as const, timer: 0 }));
    target = randomTarget(); targetTimer = rnd(...RETARGET);
    if (empty) slots.forEach((sl, i) => { sl.timer = 0.6 + i * rnd(1.2, 3.5); }); // empty water; they arrive one after another
    else slots.slice(0, target).forEach((sl) => spawn(sl, true));

    // plants in front
    const kelp = (x: number, hgt: number, color: string, d: number) => {
      const a = hgt * S, b = a * 0.18;
      const svg = s("svg", { viewBox: "0 0 40 200", class: "deco kelp", style: `left:${x}%;bottom:5%;width:${b}px;height:${a}px;animation-delay:${d}s;z-index:2000`, "aria-hidden": "true" },
        s("path", { d: "M18 200 Q-4 150 18 110 Q40 70 14 30 Q12 14 22 0 Q30 40 30 80 Q8 120 30 160 Q30 184 24 200Z", fill: color }));
      return svg;
    };
    tank.append(kelp(12, 0.5, "#3f8f6a", -1), kelp(16, 0.34, "#58a77c", -3), kelp(60, 0.42, "#3f8f6a", -2), kelp(92, 0.55, "#4d9f75", -4), kelp(88, 0.3, "#58a77c", -5));
  }

  type Pick = { type: "fish"; spec: Spec } | { type: "floor"; spec: (typeof FLOOR)[number] };
  function pickSomething(): Pick {
    const active = new Set(slots.map((sl) => sl.id));
    const bigNow = slots.filter((sl) => sl.big).length;
    const pool: (Pick & { weight: number })[] = [
      ...ROSTER.filter((r) => !active.has(r.id) && (r.width < BIG || bigNow < MAX_BIG)).map((spec) => ({ type: "fish" as const, spec, weight: spec.weight })),
      ...FLOOR.filter((f) => !active.has(f.kind)).map((spec) => ({ type: "floor" as const, spec, weight: spec.weight })),
    ];
    let roll = Math.random() * pool.reduce((n, p) => n + p.weight, 0);
    for (const p of pool) { roll -= p.weight; if (roll <= 0) return p; }
    return pool[pool.length - 1]!;
  }

  /** Put something new in a slot: already there (at load) or arriving from a side of the screen. */
  function spawn(slot: Slot, onscreen: boolean) {
    const pick = pickSomething();
    const side = Math.random() < 0.5 ? -1 : 1;
    slot.views = []; slot.walker = undefined;
    if (pick.type === "floor") {
      const spec = pick.spec, art = FLOOR_ART[spec.kind];
      const w = spec.width * S, hgt = w * (art.h / art.w);
      const el = h("div", { class: "walker", style: `width:${w}px;height:${hgt}px` }, inlineSvg(spec.kind));
      tank.append(el);
      const c: Walker = { kind: spec.kind, x: onscreen ? rnd(w, W - w) : side < 0 ? -w : W + w, y: Math.random(), dir: onscreen ? (Math.random() < 0.5 ? 1 : -1) : (-side as 1 | -1), state: "walk", timer: rnd(2, 6), walk: spec.walk * S, runMult: spec.run, half: w / 2 };
      if (!onscreen) c.mode = "in";
      slot.walker = { c, el, w, h: hgt };
      slot.id = spec.kind; slot.big = false;
    } else {
      const spec = pick.spec, art = ALL_ART[spec.id];
      const w = spec.width * S, hgt = w * (art.h / art.w);
      const cruise = S * (0.15 - 0.12 * spec.width) * (reduce ? 0.6 : 1);
      const bx = onscreen ? rnd(w, W - w) : side < 0 ? -w * 1.2 : W + w * 1.2;
      const by = rnd(hgt, Math.max(hgt + 1, bounds.floorTop - hgt));
      const heading: -1 | 1 = onscreen ? (Math.random() < 0.5 ? 1 : -1) : (-side as 1 | -1);
      for (let i = 0; i < spec.count; i++) {
        const el = h("div", { class: "fish", style: `width:${w}px;height:${hgt}px;z-index:${Math.round(1000 - w)}` }, useSvg(spec.id, art));
        tank.append(el);
        const f: Fish = { x: bx, y: by, vx: heading * cruise, vy: 0, cruise: cruise * rnd(0.85, 1.15), half: { w: w / 2, h: hgt / 2 }, heading, ty: by, retarget: rnd(1, 4), upright: !!spec.upright };
        if (spec.school && i > 0) {
          const dx = rnd(-w * 1.6, w * 1.6), dy = rnd(-w * 0.9, w * 0.9);
          f.follow = { leader: 0, dx, dy };
          f.x = bx + dx + (onscreen ? 0 : side * Math.abs(dx)); f.y = Math.min(bounds.floorTop - hgt, Math.max(hgt, by + dy));
        } else newDrift(f, bounds);
        if (!onscreen) f.mode = "in";
        slot.views.push({ f, el, w, h: hgt, dir: heading, angle: 0, phase: rnd(0, 6.28) });
      }
      slot.id = spec.id; slot.big = !spec.school && spec.width >= BIG;
    }
    slot.phase = onscreen ? "present" : "in";
    slot.timer = MAX_STAY;
  }

  const arrived = (sl: Slot) => (sl.walker ? !sl.walker.c.mode : !!sl.views[0] && !sl.views[0].f.mode);
  const departed = (sl: Slot) => (sl.walker ? walkerExited(sl.walker.c, bounds) : sl.views.length > 0 && sl.views.every((v) => hasExited(v.f, bounds)));

  /** Send a slot's fish toward the side they are already heading to, so they leave without turning around. */
  function sendOff(sl: Slot) { sl.phase = "out"; for (const v of sl.views) sendAway(v.f, bounds); }

  function lifecycle(slot: Slot, dt: number) {
    if (slot.phase === "in" && arrived(slot)) slot.phase = "present";
    else if (slot.phase === "present" || slot.phase === "out") {
      slot.timer -= dt;
      if (slot.phase === "present" && slot.timer <= 0) sendOff(slot);
      // the rest of a school follows its leader out
      if (slot.views.length > 1 && hasExited(slot.views[0]!.f, bounds)) for (const v of slot.views) if (v.f.mode !== "out") sendAway(v.f, bounds);
      if (departed(slot)) {
        for (const v of slot.views) v.el.remove();
        slot.walker?.el.remove();
        slot.views = []; slot.walker = undefined; slot.id = undefined; slot.big = false; slot.phase = "gone"; slot.timer = rnd(...GAP);
      }
    } else if (slot.phase === "gone") {
      slot.timer -= dt;
      if (slot.timer <= 0 && activeCount() < target) spawn(slot, false);
    }
  }

  const floorY = (v: WalkView) => bounds.floorTop + (H - bounds.floorTop) * (0.18 + 0.62 * v.c.y);
  const radius = () => S * 0.4;

  // Tap effects are capped, so a flurry of fast taps can never pile up hundreds of animated elements
  const MAX_FX = { ripple: 4, bubble: 12 };
  const liveFx = { ripple: 0, bubble: 0 };
  function addFx(kind: "ripple" | "bubble", style: string) {
    if (liveFx[kind] >= MAX_FX[kind]) return;
    liveFx[kind]++;
    const el = h("span", { class: kind, style });
    let gone = false;
    const done = () => { if (gone) return; gone = true; liveFx[kind]--; el.remove(); };
    el.addEventListener("animationend", done, { once: true });
    setTimeout(done, 1800); // in case the animation never finishes (for example, a tab that was hidden)
    tank.append(el);
  }
  function bubbles(x: number, y: number) {
    for (let i = 0; i < 3; i++) {
      const sz = rnd(8, 18);
      addFx("bubble", `left:${x + rnd(-24, 24)}px;top:${y + rnd(-14, 14)}px;width:${sz}px;height:${sz}px;animation-delay:${i * 0.07}s`);
    }
  }
  function scare(x: number, y: number, strength: number) {
    const R = radius();
    for (const sl of slots) {
      for (const v of sl.views) scareFish(v.f, x, y, R, strength);
      if (sl.walker) scareWalker(sl.walker.c, x, y, R * 1.1, floorY(sl.walker));
    }
  }

  let lastDrag = 0, lastTap = 0;
  const TAP_FX_GAP = 80; // ms: faster taps still scare the fish, but only the first of each burst makes ripples, bubbles and a buzz
  tank.addEventListener("pointerdown", (e) => {
    const r = tank.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    scare(x, y, 1);
    const now = performance.now();
    if (now - lastTap < TAP_FX_GAP) return;
    lastTap = now;
    addFx("ripple", `left:${x}px;top:${y}px`);
    bubbles(x, y);
    try { navigator.vibrate?.(8); } catch { /* not supported */ }
  });
  tank.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" && e.buttons === 0) return;
    const now = performance.now();
    if (now - lastDrag < 60) return;
    lastDrag = now;
    const r = tank.getBoundingClientRect();
    scare(e.clientX - r.left, e.clientY - r.top, 0.35);
  });
  tank.addEventListener("contextmenu", (e) => e.preventDefault());
  // keep a phone from zooming, scrolling or bouncing the page when tapped fast
  for (const type of ["gesturestart", "gesturechange", "dblclick"]) document.addEventListener(type, (e) => e.preventDefault());
  tank.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

  // ---- main loop ----
  let last = performance.now();
  let frameErrors = 0;
  function frame(now: number) {
    requestAnimationFrame(frame); // always schedule the next frame first, so one bad frame can never stop the tank
    try { step(now); frameErrors = 0; }
    catch {
      // recover by rebuilding the tank; if that keeps failing, reload the page
      if (++frameErrors > 5) { location.reload(); return; }
      try { build(); } catch { /* try again next frame */ }
    }
  }
  function step(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    updateTarget(dt);
    for (const sl of slots) {
      lifecycle(sl, dt);
      const group = sl.views.map((x) => x.f);
      for (const v of sl.views) {
      stepFish(v.f, dt, bounds, group);
      v.dir = v.f.heading;
      const sp = Math.hypot(v.f.vx, v.f.vy);
      const wig = Math.sin(t * (4 + sp / v.f.cruise * 2) + v.phase) * Math.min(0.09, 0.03 + sp / v.f.cruise * 0.01);
      const want = v.f.upright ? wig * 0.6 : v.dir * Math.max(-0.5, Math.min(0.5, Math.atan2(v.f.vy, Math.max(Math.abs(v.f.vx), 1)))) + wig;
      v.angle += (want - v.angle) * Math.min(1, dt * 8);
      const bob = reduce ? 0 : Math.sin(t * 1.3 + v.phase) * 3;
      v.el.style.transform = `translate3d(${(v.f.x - v.w / 2).toFixed(1)}px,${(v.f.y - v.h / 2 + bob).toFixed(1)}px,0) rotate(${v.angle.toFixed(3)}rad) scaleX(${v.dir})`;
      }
    }
    for (const sl of slots) {
      const v = sl.walker;
      if (!v) continue;
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
  }

  build(true);
  requestAnimationFrame((n) => { last = n; frame(n); });
  // coming back to the app after it was hidden: carry on from now, and make sure the tank is still there
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    last = performance.now();
    if (!tank.isConnected || !tank.querySelector(".sand")) build();
  });
  window.addEventListener("pageshow", () => { last = performance.now(); });
  let rt: number | undefined;
  window.addEventListener("resize", () => { window.clearTimeout(rt); rt = window.setTimeout(() => { if (tank.clientWidth !== W || tank.clientHeight !== H) build(); }, 200); });
}

start();
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("/fishtank/sw.js", { scope: "/fishtank/" }).catch(() => { /* offline mode just will not be available */ });
}
