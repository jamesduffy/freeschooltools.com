/** Builds the animated garden picture as SVG and updates it when the total changes. Growth is done with CSS transforms. */
import { s } from "../shared/dom";
import { paletteHex } from "../shared/palette";
import { arrivedCreatures, bonusBlooms, bonusGrowth, plantShape, spotGrowths, SPOTS } from "./growth";
import { COLORS, ID, buildDefs } from "./art-flowers";
import { bonusLayout, critterPlans, H, TYPE_INFO, W, plantLayout, type CritterPlan, type Plant } from "./layout";
import type { ThemeConfig } from "./theme";

type A = Record<string, string | number>;
const g = (a: A, ...k: SVGElement[]) => s("g", a, ...k);
const use = (name: string, a: A = {}) => s("use", { href: `#${ID(name)}`, ...a });
const ell = (cx: number, cy: number, rx: number, ry: number, fill: string, extra: A = {}) => s("ellipse", { cx, cy, rx, ry, fill, ...extra });
const style = (el: SVGElement, css: string) => { el.setAttribute("style", css); return el; };

export function ensureDefs(): void {
  if (!document.getElementById("cg-defs")) document.body.prepend(buildDefs());
}

export const prefersReducedMotion = (): boolean => {
  try { return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};

export type SceneChange = { arrived: string[]; bonusAppeared: boolean };
export type Scene = {
  el: SVGSVGElement;
  /** Moves the picture to a new total. Pass animate: true to fly new creatures in. */
  update(total: number, goal: number, opts?: { animate?: boolean }): SceneChange;
  celebrate(): void;
};

// ---- static backdrop --------------------------------------------------------------
function fringe(y: number, amp: number, step: number): string {
  let d = `M0 ${y}`;
  for (let x = 0; x < W; x += step) d += ` Q${x + step * 0.25} ${y - amp * (1 + ((x / step) % 3) * 0.35)} ${x + step * 0.5} ${y - amp * 0.2} T${x + step} ${y}`;
  return `${d} L${W} ${H + 120} L0 ${H + 120}Z`;
}

function cloud(x: number, y: number, k: number, dur: number, delay: number): SVGElement {
  return g({ transform: `translate(${x} ${y}) scale(${k})` },
    style(g({ class: "cg-cloud" }, ell(0, 0, 72, 26, "#fff"), ell(-38, -10, 36, 26, "#fff"), ell(6, -26, 40, 32, "#fff"), ell(48, -8, 34, 24, "#fff")),
      `animation-duration:${dur}s;animation-delay:${delay}s;opacity:.94`));
}

function sun(): SVGElement {
  const rays = Array.from({ length: 12 }, (_, i) => s("rect", { x: -5, y: -118, width: 10, height: 34, rx: 5, fill: paletteHex("sun"), transform: `rotate(${i * 30})`, opacity: 0.85 }));
  return g({ transform: "translate(1340 150)" },
    s("circle", { r: 170, fill: `url(#${ID("sunhalo")})` }),
    g({ class: "cg-rays" }, ...rays),
    s("circle", { r: 68, fill: "#FFD84A" }), s("circle", { r: 54, fill: "#FFE680" }));
}

function backdrop(): SVGElement[] {
  const pebbles = [[120, 850, 9, "#7A5232"], [300, 880, 7, "#A8703F"], [520, 835, 8, "#7A5232"], [700, 885, 10, "#5E3A22"], [910, 842, 7, "#A8703F"], [1090, 878, 9, "#7A5232"], [1290, 838, 8, "#5E3A22"], [1480, 872, 10, "#A8703F"], [40, 880, 6, "#5E3A22"], [1560, 836, 7, "#7A5232"]] as const;
  const tufts = [180, 560, 940, 1360].map((x) => g({ transform: `translate(${x} 800)` }, s("path", { d: "M-10 0 Q-12 -22 -4 -30 Q-2 -14 0 0Z M0 0 Q2 -28 10 -34 Q10 -14 8 0Z M8 0 Q16 -16 24 -18 Q18 -6 14 0Z", fill: "#5FAE55" })));
  return [
    s("rect", { width: W, height: H, fill: `url(#${ID("sky")})` }),
    g({ transform: "translate(0 -95)" },
    s("path", { d: `M0 700 C200 636 420 650 640 700 C860 746 1000 640 1200 662 C1400 684 1500 704 ${W} 690 L${W} ${H + 120} L0 ${H + 120}Z`, fill: "#C3E5A8" }),
    s("path", { d: `M0 742 C250 698 500 730 800 746 C1100 762 1350 700 ${W} 736 L${W} ${H + 120} L0 ${H + 120}Z`, fill: "#A8D88B" }),
    s("path", { d: fringe(776, 14, 26), fill: `url(#${ID("grass")})` }),
    s("path", { d: `M0 802 Q200 788 400 799 T800 798 T1200 798 T${W} 796 L${W} ${H + 120} L0 ${H + 120}Z`, fill: `url(#${ID("soil")})` }),
    ...pebbles.map(([x, y, r, c]) => ell(x, y, r, r * 0.55, c, { opacity: 0.7 })),
    ...tufts),
  ];
}

// ---- one plant ----------------------------------------------------------------------
type PlantView = { root: SVGElement; setGrowth(g: number): void; follow: SVGElement; stemLen: number };

function seedMarks(): SVGElement {
  return g({ class: "cg-seeds" },
    ell(0, 3, 17, 6, "#6C4528"), ell(-9, 0, 4.2, 2.6, "#E2BE8A"), ell(2, -2, 4.2, 2.6, "#D4A96E"), ell(11, 1, 4.2, 2.6, "#E2BE8A"));
}

function buildPlant(p: Plant, withHost: boolean): PlantView {
  const len = TYPE_INFO[p.type].stem;
  const f = p.flip;
  const stem = s("path", { d: `M0 0 C${4 * f} ${-len * 0.3} ${-5 * f} ${-len * 0.62} 0 ${-len}`, fill: "none", stroke: COLORS.stem, "stroke-width": 6.5, "stroke-linecap": "round" });
  const stemG = g({ class: "cg-t" }, stem,
    use("leaf", { transform: `translate(0 ${-len * 0.3}) rotate(-12) scale(${1.05})` }),
    use("leaf", { transform: `translate(0 ${-len * 0.5}) scale(-1 1) rotate(-18) scale(0.9)` }));
  const bud = g({ class: "cg-t" }, use(`${p.type}-bud`));
  const bloom = g({ class: "cg-t" }, use(`${p.type}-bloom`));
  const head = g({ class: "cg-t" }, bud, bloom);
  const follow = g({ class: "cg-t" });
  const sway = style(g({ class: "cg-sway" }, stemG, ...(withHost ? [follow] : []), head), `--amp:${p.swayAmp}deg;animation-duration:${p.swayDur}s;animation-delay:${p.swayDelay}s`);
  const seeds = g({ class: "cg-t" }, seedMarks());
  const root = g({ class: "cg-plant", transform: `translate(${p.x} ${p.y}) scale(${p.scale * f} ${p.scale})` }, seeds, sway);
  return {
    root, follow, stemLen: len,
    setGrowth(gr: number) {
      const sh = plantShape(gr);
      stemG.style.transform = `scale(1, ${sh.stem})`;
      stemG.style.opacity = gr > 0 ? "1" : "0";
      head.style.transform = `translate(0px, ${-len * sh.stem}px) scale(${sh.headScale})`;
      head.style.opacity = String(sh.headOpacity);
      bloom.style.opacity = String(sh.bloom);
      bloom.style.transform = `scale(${0.55 + 0.45 * sh.bloom})`;
      bud.style.opacity = String(1 - sh.bloom);
      bud.style.transform = `scale(${1 - 0.25 * sh.bloom})`;
      seeds.style.opacity = String(Math.max(0, 1 - gr * 6));
      follow.style.transform = `translate(0px, ${-len * sh.stem * 0.55}px)`;
    },
  };
}

// ---- creatures ------------------------------------------------------------------------
type CritterView = { kind: string; n: number; plan: CritterPlan; wrap: SVGElement; arrive: SVGElement; visible: boolean };

function buildCritter(kind: string, n: number, plan: CritterPlan): CritterView {
  const art = (() => {
    if (kind === "ladybug") return use("ladybug", { transform: "translate(7 0) scale(1.15)" });
    if (kind === "butterfly") return style(use("butterfly", { transform: "scale(1.25)" }), `--w:${plan.color ?? "#F5A55B"};--w2:${plan.color === "#8CA6F2" ? "#B493EA" : "#F28B7D"}`);
    if (kind === "bee") return use("bee", { transform: "scale(1.4)" });
    return use("hummingbird", { transform: "scale(0.95)" });
  })();
  const loop = style(g({ class: `cg-loop cg-${kind}` }, art), `animation-duration:${plan.dur}s;animation-delay:${plan.delay}s;--tx:${(plan.tx ?? 0) * plan.flip}px;--ty:${plan.ty ?? 0}px`);
  const arrive = style(g({ class: "cg-arrive" }, loop), `--fx:${plan.fx}px;--fy:${plan.fy}px`);
  const wrap = plan.host !== undefined ? g({ class: "cg-critter off" }, arrive) : g({ class: "cg-critter off", transform: `translate(${plan.x} ${plan.y}) scale(${plan.flip} 1)` }, arrive);
  return { kind, n, plan, wrap, arrive, visible: false };
}

// ---- the scene --------------------------------------------------------------------------
export function createScene(theme: ThemeConfig, opts: { still?: boolean; label?: string } = {}): Scene {
  ensureDefs();
  const plants: PlantView[] = [];
  const plantLayer = g({});
  const layouts = Array.from({ length: SPOTS }, (_, i) => plantLayout(i));
  const critters: CritterView[] = [];
  const plans = theme.creatures.map((c) => ({ c, plans: critterPlans(c.kind, c.count) }));
  const hostSpots = new Set(plans.flatMap(({ plans: ps }) => ps.map((pl) => pl.host).filter((h): h is number => h !== undefined)));

  const order = layouts.map((p, i) => ({ p, i })).sort((a, b) => a.p.y - b.p.y);
  for (const { p, i } of order) { const v = buildPlant(p, hostSpots.has(i)); plants[i] = v; plantLayer.append(v.root); }
  const bonusViews = theme.bonus.map((_, k) => { const v = buildPlant(bonusLayout(k), false); v.root.classList.add("off"); plantLayer.append(v.root); return v; });

  const critterLayer = g({});
  for (const { c, plans: ps } of plans) {
    ps.forEach((plan, n) => {
      const cv = buildCritter(c.kind, n, plan);
      critters.push(cv);
      if (plan.host !== undefined) plants[plan.host]!.follow.append(cv.wrap); else critterLayer.append(cv.wrap);
    });
  }

  const glow = s("rect", { class: "cg-glow", width: W, height: H, fill: `url(#${ID("glow")})` });
  const petals = g({});
  const svg = s("svg", {
    class: `cg-scene${opts.still ? " still" : ""}`, viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMax slice",
    ...(opts.label ? { role: "img", "aria-label": opts.label } : { "aria-hidden": "true" }),
  },
    ...backdrop(), sun(),
    cloud(300, 130, 1, 80, -10), cloud(760, 215, 0.8, 100, -50), cloud(1010, 95, 0.9, 90, -30),
    plantLayer, critterLayer, glow, petals) as SVGSVGElement;

  let prevBonus = 0;
  let first = true;
  let celebrateTimer: number | undefined;

  const scene: Scene = {
    el: svg,
    update(total, goal, o = {}) {
      const gs = spotGrowths(total, goal);
      gs.forEach((gr, i) => plants[i]!.setGrowth(gr));
      const nb = bonusBlooms(total, goal, theme.bonus);
      bonusViews.forEach((v, k) => { const bg = bonusGrowth(k, total, goal, theme.bonus); v.setGrowth(bg); v.root.classList.toggle("off", bg === 0); });
      const here = arrivedCreatures(total, goal, theme.creatures);
      const arrived = new Set<string>();
      for (const c of critters) {
        const vis = c.n < (here[c.kind] ?? 0);
        if (vis && !c.visible && !first && o.animate && !opts.still) {
          arrived.add(c.kind);
          c.arrive.classList.remove("arriving");
          c.wrap.classList.remove("off");
          void c.arrive.getBoundingClientRect();
          c.arrive.classList.add("arriving");
        } else if (vis && !c.visible && !first) arrived.add(c.kind);
        if (!vis) c.arrive.classList.remove("arriving");
        c.wrap.classList.toggle("off", !vis);
        c.visible = vis;
      }
      svg.classList.toggle("reached", total >= goal);
      const bonusAppeared = !first && nb > prevBonus;
      prevBonus = nb;
      first = false;
      return { arrived: [...arrived], bonusAppeared };
    },
    celebrate() {
      svg.classList.add("celebrating");
      window.clearTimeout(celebrateTimer);
      if (!opts.still && !prefersReducedMotion()) {
        petals.replaceChildren();
        const colors = [paletteHex("pink"), paletteHex("sun"), paletteHex("coral"), paletteHex("violet"), paletteHex("orange")];
        for (let i = 0; i < 14; i++) {
          const x = 90 + ((i * 109) % 1420);
          const inner = style(g({ class: "cg-petal" }, use("petal", { transform: "scale(1.7)" })),
            `--p:${colors[i % colors.length]};--dx:${((i % 5) - 2) * 38}px;--rot:${360 + (i % 4) * 140}deg;animation-duration:${4.2 + (i % 4) * 0.45}s;animation-delay:${(i % 6) * 0.28}s`);
          petals.append(g({ transform: `translate(${x} -40)` }, inner));
        }
      }
      celebrateTimer = window.setTimeout(() => { svg.classList.remove("celebrating"); petals.replaceChildren(); }, 7500);
    },
  };
  return scene;
}
