/** Original flat vector art for the Flowers theme. Every flower and creature is defined once as a symbol and reused.
 *  Soft rounded shapes, a limited palette from the shared palette, and no outlines at all. */
import { s } from "../shared/dom";
import { paletteHex } from "../shared/palette";
import { MORE_SYMBOL_IDS, moreSymbols } from "./art-more";

import { COLORS, ID } from "./art-base";
export { COLORS, ID };

const PINK = paletteHex("pink"), CORAL = paletteHex("coral"), ORANGE = paletteHex("orange"), SUN = paletteHex("sun");
const VIOLET = paletteHex("violet"), MINT = paletteHex("mint");

type A = Record<string, string | number>;
const g = (a: A, ...k: SVGElement[]) => s("g", a, ...k);
const path = (d: string, fill: string, extra: A = {}) => s("path", { d, fill, ...extra });
const ellipse = (cx: number, cy: number, rx: number, ry: number, fill: string, extra: A = {}) => s("ellipse", { cx, cy, rx, ry, fill, ...extra });
const circle = (cx: number, cy: number, r: number, fill: string, extra: A = {}) => s("circle", { cx, cy, r, fill, ...extra });
const ring = (n: number, make: (deg: number) => SVGElement) => Array.from({ length: n }, (_, k) => make((k * 360) / n));

// ---- flowers: a bud and a bloom each, centred where the stem ends -------------------
function daisyBloom() {
  return g({ id: ID("daisy-bloom") },
    ...ring(14, (d) => ellipse(0, -25, 8.5, 22, PINK, { transform: `rotate(${d})` })),
    ...ring(14, (d) => ellipse(0, -21, 3, 12, "#FAC3DD", { transform: `rotate(${d})` })),
    circle(0, 0, 13, SUN), circle(0, 0, 7, ORANGE), circle(-3, -3, 2.5, "#FBE8A2"));
}
function daisyBud() {
  return g({ id: ID("daisy-bud") },
    ellipse(0, -8, 11, 17, PINK), ellipse(-3, -12, 3.5, 8, "#FAC3DD"),
    path("M-13 0 Q-14 -10 -6 -14 Q-9 -4 0 4 Q9 -4 6 -14 Q14 -10 13 0 Q0 14 -13 0Z", COLORS.leafDark));
}
function sunflowerBloom() {
  const seeds = [[0, 0], [8, 5], [-8, 5], [6, -8], [-6, -8], [0, 13]] as const;
  return g({ id: ID("sunflower-bloom") },
    ...ring(12, (d) => ellipse(0, -35, 11, 20, ORANGE, { transform: `rotate(${d})` })),
    ...ring(12, (d) => ellipse(0, -32, 10.5, 19, SUN, { transform: `rotate(${d + 15})` })),
    circle(0, 0, 25, COLORS.brown), circle(0, 0, 17, COLORS.brownDark),
    ...seeds.map(([x, y]) => circle(x, y, 2.4, COLORS.seed)));
}
function sunflowerBud() {
  return g({ id: ID("sunflower-bud") },
    circle(0, -4, 15, SUN), circle(0, 0, 17, COLORS.leafDark),
    ...ring(7, (d) => path("M-5 -14 L0 -26 L5 -14Z", COLORS.stem, { transform: `rotate(${d})` })),
    circle(0, 0, 11, COLORS.leaf));
}
function tulipBloom() {
  return g({ id: ID("tulip-bloom") },
    path("M0 8 C-27 6 -30 -26 -21 -52 C-11 -42 -4 -28 0 -10Z", COLORS.coralDark),
    path("M0 8 C27 6 30 -26 21 -52 C11 -42 4 -28 0 -10Z", COLORS.coralDark),
    path("M-18 -1 C-21 -30 -11 -48 0 -58 C11 -48 21 -30 18 -1 C11 12 -11 12 -18 -1Z", CORAL),
    path("M-5 -8 C-8 -26 -3 -40 0 -46 C3 -40 8 -26 5 -8 C2 -4 -2 -4 -5 -8Z", "#F9B3A8"),
    ellipse(0, 8, 9, 4.5, COLORS.leafDark));
}
function tulipBud() {
  return g({ id: ID("tulip-bud") },
    path("M-11 5 C-15 -14 -7 -30 0 -38 C7 -30 15 -14 11 5 C5 11 -5 11 -11 5Z", CORAL),
    path("M-3 -6 C-5 -18 -2 -27 0 -31 C2 -27 5 -18 3 -6Z", "#F9B3A8"),
    path("M-11 5 C-12 -3 -6 -6 0 2 C6 -6 12 -3 11 5 C5 11 -5 11 -11 5Z", COLORS.leafDark));
}
function bellBloom() {
  return g({ id: ID("bell-bloom") },
    s("path", { d: "M0 0 C0 -16 22 -16 22 4", fill: "none", stroke: COLORS.stem, "stroke-width": 5, "stroke-linecap": "round" }),
    g({ transform: "translate(22 4)" },
      path("M-6 0 C-7 14 -17 24 -23 38 Q-12 46 0 40 Q12 46 23 38 C17 24 7 14 6 0Z", VIOLET),
      path("M-3 4 C-3 16 -9 26 -12 36 Q-7 40 -2 38 C-2 26 -2 14 -3 4Z", "#CDB8F2"),
      ellipse(0, 40, 22, 5, COLORS.violetDark),
      circle(0, 45, 3.4, SUN),
      ellipse(0, 2, 7, 4, COLORS.leafDark)));
}
function bellBud() {
  return g({ id: ID("bell-bud") },
    s("path", { d: "M0 0 C0 -16 22 -16 22 4", fill: "none", stroke: COLORS.stem, "stroke-width": 5, "stroke-linecap": "round" }),
    g({ transform: "translate(22 4)" },
      path("M-8 0 C-12 14 -6 26 0 30 C6 26 12 14 8 0Z", VIOLET),
      path("M-8 0 C-8 -4 8 -4 8 0 C4 6 -4 6 -8 0Z", COLORS.leafDark)));
}

function leaf() {
  return g({ id: ID("leaf") },
    path("M0 0 C12 -18 38 -22 58 -12 C42 4 16 10 0 0Z", COLORS.leaf),
    path("M0 0 C12 -18 38 -22 58 -12 C46 -7 30 -6 0 0Z", COLORS.leafDark, { opacity: 0.45 }),
    s("path", { d: "M4 -1 C22 -8 40 -11 52 -11", fill: "none", stroke: COLORS.stem, "stroke-width": 1.6, "stroke-linecap": "round" }));
}

function petal() {
  return g({ id: ID("petal") }, path("M0 0 C8 -6 12 -14 4 -20 C-4 -16 -8 -6 0 0Z", "var(--p, #F29BC7)"));
}

// ---- creatures ---------------------------------------------------------------------
function ladybug() {
  const spots = [[-4.5, -3], [4.5, -3], [-5, 4], [5, 4], [0, 8]] as const;
  return g({ id: ID("ladybug") },
    s("path", { d: "M-3 -10 L-6 -17 M3 -10 L6 -17", stroke: COLORS.ink, "stroke-width": 1.4, "stroke-linecap": "round", fill: "none" }),
    circle(0, -10, 5.2, COLORS.ink),
    ellipse(0, 3, 10, 12, COLORS.red),
    path("M-10 3 C-10 -9 10 -9 10 3 C10 -2 -10 -2 -10 3Z", "#F06B5C", { opacity: 0.6 }),
    s("path", { d: "M0 -8 L0 15", stroke: COLORS.ink, "stroke-width": 1.5, fill: "none" }),
    ...spots.map(([x, y]) => circle(x, y, 2.3, COLORS.ink)),
    circle(-2, -10, 1.2, "#fff"), circle(2, -10, 1.2, "#fff"));
}
function butterfly() {
  return g({ id: ID("butterfly") },
    g({ class: "cg-flap-x" },
      path("M0 -2 C-6 -30 -40 -36 -40 -14 C-40 2 -14 6 0 -2Z", "var(--w, #F5A55B)"),
      path("M0 -2 C6 -30 40 -36 40 -14 C40 2 14 6 0 -2Z", "var(--w, #F5A55B)"),
      path("M0 2 C-6 16 -28 28 -28 12 C-28 4 -12 0 0 2Z", "var(--w2, #F28B7D)"),
      path("M0 2 C6 16 28 28 28 12 C28 4 12 0 0 2Z", "var(--w2, #F28B7D)"),
      circle(-24, -16, 5, "#fff", { opacity: 0.8 }), circle(24, -16, 5, "#fff", { opacity: 0.8 }),
      circle(-18, 12, 3, "#fff", { opacity: 0.7 }), circle(18, 12, 3, "#fff", { opacity: 0.7 })),
    ellipse(0, 2, 3, 13, COLORS.ink),
    s("path", { d: "M-1 -10 C-6 -22 -9 -24 -11 -23 M1 -10 C6 -22 9 -24 11 -23", stroke: COLORS.ink, "stroke-width": 1.4, fill: "none", "stroke-linecap": "round" }));
}
function bee() {
  return g({ id: ID("bee") },
    g({ class: "cg-flap-y" }, ellipse(-3, -11, 6, 11, "#DDF2FA", { opacity: 0.85, transform: "rotate(-25 -3 -2)" }), ellipse(5, -11, 6, 11, "#DDF2FA", { opacity: 0.85, transform: "rotate(15 5 -2)" })),
    ellipse(0, 0, 15, 10.5, SUN),
    ellipse(-3, 0, 2.6, 10, COLORS.ink), ellipse(5, 0, 2.6, 9.4, COLORS.ink),
    circle(-14, -1, 6.5, COLORS.ink), circle(-16, -3, 1.4, "#fff"),
    path("M14 -2 L21 0 L14 2Z", COLORS.ink),
    s("path", { d: "M-16 -6 L-20 -12 M-13 -7 L-14 -13", stroke: COLORS.ink, "stroke-width": 1.2, fill: "none", "stroke-linecap": "round" }));
}
function hummingbird() {
  return g({ id: ID("hummingbird") },
    path("M30 6 C44 10 52 22 60 36 C46 30 38 24 26 14Z", COLORS.leafDark),
    path("M28 4 C42 2 56 8 64 20 C50 18 38 16 26 10Z", MINT),
    ellipse(8, 6, 28, 15, MINT),
    path("M-18 8 C-8 22 14 24 28 14 C14 12 -6 12 -18 8Z", "#F9E9B0"),
    circle(-18, -4, 12, "#52B98E"),
    path("M-22 4 C-20 14 -14 14 -10 8 C-14 6 -18 4 -22 4Z", CORAL),
    circle(-21, -6, 2.6, COLORS.ink), circle(-22, -7, 0.9, "#fff"),
    s("path", { d: "M-30 -4 L-72 -12", stroke: COLORS.ink, "stroke-width": 2.4, "stroke-linecap": "round", fill: "none" }),
    g({ class: "cg-flap-r" },
      path("M6 -4 C-2 -34 24 -48 46 -44 C34 -28 24 -14 12 -2Z", "#7FD9B8", { opacity: 0.9 }),
      path("M6 -4 C2 -26 18 -40 34 -42 C26 -28 20 -14 12 -2Z", "#B9EBD7", { opacity: 0.8 })));
}

/** All the shared symbols in one hidden SVG, added to the page once. Scenes point at these with <use>. */
export function buildDefs(): SVGSVGElement {
  const stops = (list: [number, string, number?][]) => list.map(([o, c, op]) => s("stop", { offset: `${o}%`, "stop-color": c, "stop-opacity": op ?? 1 }));
  const defs = s("defs", {},
    s("linearGradient", { id: ID("sky"), x1: 0, y1: 0, x2: 0, y2: 1 }, ...stops([[0, "#6FC1F0"], [60, "#B7E3F7"], [100, "#E6F6FB"]])),
    s("linearGradient", { id: ID("soil"), x1: 0, y1: 0, x2: 0, y2: 1 }, ...stops([[0, "#92643F"], [100, "#684528"]])),
    s("linearGradient", { id: ID("grass"), x1: 0, y1: 0, x2: 0, y2: 1 }, ...stops([[0, "#7CC25E"], [100, "#5FAE55"]])),
    s("radialGradient", { id: ID("glow"), cx: "50%", cy: "58%", r: "70%" }, ...stops([[0, "#FFF7C2", 0.95], [55, "#FFE9A0", 0.5], [100, "#FFE9A0", 0]])),
    s("radialGradient", { id: ID("sunhalo"), cx: "50%", cy: "50%", r: "50%" }, ...stops([[0, "#FFF3B0", 0.9], [100, "#FFF3B0", 0]])),
    daisyBloom(), daisyBud(), sunflowerBloom(), sunflowerBud(), tulipBloom(), tulipBud(), bellBloom(), bellBud(),
    leaf(), petal(), ladybug(), butterfly(), bee(), hummingbird(), ...moreSymbols());
  return s("svg", { width: 0, height: 0, "aria-hidden": "true", focusable: "false", style: "position:absolute", id: "cg-defs" }, defs) as SVGSVGElement;
}

/** The ids of the flower and creature symbols, for size checks. */
export const SYMBOL_IDS = ["daisy-bloom", "daisy-bud", "sunflower-bloom", "sunflower-bud", "tulip-bloom", "tulip-bud", "bell-bloom", "bell-bud", "leaf", "petal", "ladybug", "butterfly", "bee", "hummingbird", ...MORE_SYMBOL_IDS].map(ID);
