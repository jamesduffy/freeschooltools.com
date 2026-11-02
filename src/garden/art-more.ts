/** More original flat vector art for the Flowers theme: 10 flowers (a bud and a bloom each) and 12 creatures.
 *  Same style as art-flowers.ts: soft rounded shapes, no outlines, each defined once as a symbol and reused.
 *  Flowers are centred where the stem ends and open upward. Creatures face left. */
import { s } from "../shared/dom";
import { paletteHex } from "../shared/palette";
import { COLORS, ID } from "./art-base";

type A = Record<string, string | number>;
const g = (a: A, ...k: SVGElement[]) => s("g", a, ...k);
const path = (d: string, fill: string, extra: A = {}) => s("path", { d, fill, ...extra });
const ellipse = (cx: number, cy: number, rx: number, ry: number, fill: string, extra: A = {}) => s("ellipse", { cx, cy, rx, ry, fill, ...extra });
const circle = (cx: number, cy: number, r: number, fill: string, extra: A = {}) => s("circle", { cx, cy, r, fill, ...extra });
const ring = (n: number, make: (deg: number) => SVGElement, offset = 0) => Array.from({ length: n }, (_, k) => make(offset + (k * 360) / n));
const stroke = (d: string, color: string, w: number) => s("path", { d, fill: "none", stroke: color, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round" });

const PINK = paletteHex("pink"), ORANGE = paletteHex("orange"), SUN = paletteHex("sun");
const VIOLET = paletteHex("violet"), MINT = paletteHex("mint"), SKY = paletteHex("sky");
const INK = COLORS.ink;
const RED = "#D8483B", RED2 = "#F06B5C", GREEN = COLORS.leafDark;

// ---- flowers --------------------------------------------------------------------------
const poppyBloom = () => g({ id: ID("poppy-bloom") },
  ...ring(4, (d) => ellipse(0, -22, 21, 25, RED, { transform: `rotate(${d})` }), 45),
  ...ring(4, (d) => ellipse(0, -20, 12, 16, RED2, { transform: `rotate(${d})`, opacity: 0.7 }), 45),
  circle(0, 0, 9, INK), ...ring(8, (d) => circle(0, -13, 1.8, INK, { transform: `rotate(${d})` })), circle(0, 0, 4, "#5B6B7A"));
const poppyBud = () => g({ id: ID("poppy-bud") }, ellipse(0, -11, 9, 14, "#8AA85A"), path("M-6 -20 Q0 -30 6 -20 Q0 -23 -6 -20Z", RED), stroke("M-6 -4 L-9 -2 M6 -4 L9 -2 M0 -23 L0 -28", "#6F8F46", 1.4));

const daffodilBloom = () => g({ id: ID("daffodil-bloom") },
  ...ring(6, (d) => path("M0 0 C-13 -14 -9 -40 0 -52 C9 -40 13 -14 0 0Z", SUN, { transform: `rotate(${d})` })),
  ...ring(6, (d) => path("M0 -6 C-5 -18 -3 -34 0 -42 C3 -34 5 -18 0 -6Z", "#FBE9A0", { transform: `rotate(${d})`, opacity: 0.8 })),
  path("M-12 -7 L-10 -22 Q0 -26 10 -22 L12 -7 Q0 3 -12 -7Z", ORANGE), ellipse(0, -22, 10, 4, "#F08B2E"), ellipse(0, -21, 6, 2.2, "#C86A1E"));
const daffodilBud = () => g({ id: ID("daffodil-bud") }, path("M-7 2 C-11 -14 -3 -30 3 -40 C8 -28 10 -12 7 2Z", SUN), path("M-8 4 C-8 -6 -2 -10 0 -12 C2 -8 8 -6 8 4 C4 8 -4 8 -8 4Z", "#D9C98A"));

const cosmosBloom = () => g({ id: ID("cosmos-bloom") },
  ...ring(8, (d) => path("M0 0 C-14 -10 -16 -32 -9 -42 L-4 -37 L0 -43 L4 -37 L9 -42 C16 -32 14 -10 0 0Z", PINK, { transform: `rotate(${d})` })),
  ...ring(8, (d) => path("M0 -4 C-6 -12 -7 -26 -4 -34 C-1 -26 0 -14 0 -4Z", "#FAC3DD", { transform: `rotate(${d})` })),
  circle(0, 0, 8, SUN), circle(0, 0, 4.5, ORANGE));
const cosmosBud = () => g({ id: ID("cosmos-bud") }, circle(0, -8, 9, "#E57FB2"), path("M-9 -4 C-9 -14 9 -14 9 -4 C5 3 -5 3 -9 -4Z", GREEN), stroke("M0 -17 L0 -10", "#C85F99", 1.6));

const lavenderBloom = () => g({ id: ID("lavender-bloom") },
  stroke("M0 0 L0 -58", COLORS.stem, 3),
  ...Array.from({ length: 9 }, (_, i) => g({}, ellipse(-5, -8 - i * 6, 5, 3.6, i % 2 ? VIOLET : "#9575D6", { transform: `rotate(-24 -5 ${-8 - i * 6})` }), ellipse(5, -11 - i * 6, 5, 3.6, i % 2 ? "#9575D6" : VIOLET, { transform: `rotate(24 5 ${-11 - i * 6})` }))),
  ellipse(0, -62, 3.4, 5, VIOLET));
const lavenderBud = () => g({ id: ID("lavender-bud") }, stroke("M0 0 L0 -30", COLORS.stem, 3), ...Array.from({ length: 5 }, (_, i) => g({}, ellipse(-3.4, -5 - i * 5, 3.2, 2.6, "#8FA68A"), ellipse(3.4, -8 - i * 5, 3.2, 2.6, "#7E9A7A"))), ellipse(0, -33, 2.6, 4, "#B49AE2"));

const roseBloom = () => g({ id: ID("rose-bloom") },
  ...ring(5, (d) => ellipse(0, -18, 15, 17, "#C9392E", { transform: `rotate(${d})` })),
  circle(0, -2, 24, RED), circle(0, -3, 17, RED2), circle(1, -4, 11, RED),
  stroke("M-12 -2 C-12 -14 12 -14 12 -2 C12 8 -8 8 -8 -2 C-8 -10 6 -10 6 -2 C6 3 -2 3 -2 -2", "#A8281F", 2.4),
  circle(-9, -12, 5, "#F58A7E", { opacity: 0.6 }));
const roseBud = () => g({ id: ID("rose-bud") },
  path("M-9 2 C-14 -12 -6 -30 0 -38 C6 -30 14 -12 9 2 C4 8 -4 8 -9 2Z", RED), path("M0 -34 C-6 -22 -4 -8 2 2 C6 -10 5 -24 0 -34Z", "#A8281F", { opacity: 0.55 }),
  path("M-11 4 C-14 -6 -8 -10 -3 -2 C-2 -9 2 -9 3 -2 C8 -10 14 -6 11 4 C5 10 -5 10 -11 4Z", GREEN));

const irisBloom = () => g({ id: ID("iris-bloom") },
  path("M0 -2 C-14 -20 -10 -48 0 -60 C10 -48 14 -20 0 -2Z", VIOLET),
  path("M-2 -2 C-24 -14 -32 -38 -22 -50 C-10 -42 -4 -20 -2 -2Z", "#B493EA"), path("M2 -2 C24 -14 32 -38 22 -50 C10 -42 4 -20 2 -2Z", "#B493EA"),
  path("M0 0 C-30 -2 -46 12 -40 30 C-26 22 -10 14 0 0Z", "#9575D6"), path("M0 0 C30 -2 46 12 40 30 C26 22 10 14 0 0Z", "#9575D6"),
  path("M-4 4 C-14 8 -22 14 -26 22 C-18 18 -8 12 -4 4Z", SUN), path("M4 4 C14 8 22 14 26 22 C18 18 8 12 4 4Z", SUN), circle(0, 0, 4, SUN));
const irisBud = () => g({ id: ID("iris-bud") }, path("M-8 4 C-12 -14 -4 -34 0 -46 C4 -34 12 -14 8 4 C3 9 -3 9 -8 4Z", "#9575D6"), path("M-8 4 C-4 -12 4 -12 8 4 C3 9 -3 9 -8 4Z", GREEN), path("M0 -46 C-2 -30 -2 -14 0 4", "none", { stroke: "#B493EA", "stroke-width": 1.5 }));

const moonBloom = () => g({ id: ID("moonflower-bloom") },
  ...ring(5, (d) => ellipse(0, -28, 19, 30, "#F7F5FF", { transform: `rotate(${d})` })),
  ...ring(5, (d) => path("M0 -6 L0 -48", "none", { stroke: "#D8CFF2", "stroke-width": 1.6, transform: `rotate(${d + 36})` })),
  circle(0, 0, 15, "#EFE8FF"), circle(0, 0, 8, "#FBF6D8"), ...ring(5, (d) => s("path", { d: "M0 -3 L0 -14", stroke: "#CDB8F2", "stroke-width": 1.8, "stroke-linecap": "round", transform: `rotate(${d})` })));
const moonBud = () => g({ id: ID("moonflower-bud") }, path("M-8 4 C-14 -14 -4 -32 0 -46 C4 -32 14 -14 8 4 C3 9 -3 9 -8 4Z", "#F2F0FA"), stroke("M-6 0 C-6 -12 2 -26 0 -42 M6 0 C6 -12 -2 -26 0 -42", "#D8CFF2", 1.4), path("M-9 4 C-9 -2 9 -2 9 4 C4 9 -4 9 -9 4Z", GREEN));

const primroseBloom = () => g({ id: ID("eveningprimrose-bloom") },
  ...ring(4, (d) => path("M0 0 C-22 -4 -26 -30 -14 -38 C-8 -40 -2 -32 0 -26 C2 -32 8 -40 14 -38 C26 -30 22 -4 0 0Z", "#F8E26A", { transform: `rotate(${d})` }), 45),
  ...ring(4, (d) => path("M0 -4 C-10 -8 -12 -24 -8 -30 C-4 -26 0 -18 0 -14Z", "#FFF1A6", { transform: `rotate(${d})`, opacity: 0.8 }), 45),
  s("path", { d: "M-5 -5 L5 5 M5 -5 L-5 5", stroke: COLORS.stem, "stroke-width": 2.4, "stroke-linecap": "round" }), circle(0, 0, 3, "#C9B23A"));
const primroseBud = () => g({ id: ID("eveningprimrose-bud") }, path("M-6 2 C-9 -12 -3 -26 0 -34 C3 -26 9 -12 6 2Z", "#F8E26A"), path("M-8 4 C-8 -4 -2 -14 0 -22 C2 -14 8 -4 8 4 C4 8 -4 8 -8 4Z", "#9BB86A", { opacity: 0.85 }));

const star = (cx: number, cy: number, r: number) => g({ transform: `translate(${cx} ${cy})` }, ...ring(5, (d) => ellipse(0, -r * 0.72, r * 0.42, r * 0.78, "#FFFDF4", { transform: `rotate(${d})` })), circle(0, 0, r * 0.32, "#EFE6A4"));
const jasmineBloom = () => g({ id: ID("nightjasmine-bloom") },
  stroke("M0 0 L0 -20 M0 -20 L-20 -34 M0 -22 L18 -38", COLORS.stem, 2.6),
  star(0, -26, 17), star(-22, -40, 14), star(20, -44, 14), circle(-8, -50, 3, "#FFFDF4"), circle(10, -58, 3, "#FFFDF4"));
const jasmineBud = () => g({ id: ID("nightjasmine-bud") }, stroke("M0 0 L0 -14 M0 -14 L-12 -22 M0 -16 L11 -26", COLORS.stem, 2), ellipse(0, -20, 3, 7, "#DDE6B8"), ellipse(-13, -27, 2.6, 6, "#CFE0A8"), ellipse(12, -31, 2.6, 6, "#CFE0A8"));

/** A many-pointed star as one path, centred on the origin. */
const starPath = (points: number, outer: number, inner: number): string => {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / points, r = i % 2 === 0 ? outer : inner; pts.push(`${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`); }
  return `M${pts.join("L")}Z`;
};
const cereusBloom = () => g({ id: ID("cereus-bloom") },
  path(starPath(26, 56, 30), "#E8C566"), path(starPath(22, 46, 22), "#FFF9E8"), path(starPath(14, 32, 14), "#FFFFFF"),
  circle(0, 0, 11, "#F6E7A8"), path(starPath(12, 12, 4), "#E0B94A"), circle(0, 0, 3.4, "#E0B94A"));
const cereusBud = () => g({ id: ID("cereus-bud") }, path("M-7 4 C-12 -14 -2 -34 8 -52 C12 -34 12 -14 7 4 C2 9 -2 9 -7 4Z", "#C9503A"), path("M-4 4 C-6 -10 0 -26 6 -42 C4 -26 4 -10 3 4Z", "#E8896E", { opacity: 0.7 }), path("M-9 4 C-9 -2 9 -2 9 4 C4 9 -4 9 -9 4Z", GREEN));

// ---- creatures (face left) --------------------------------------------------------------
const caterpillar = () => g({ id: ID("caterpillar") },
  ...[0, 1, 2, 3, 4].map((i) => g({}, circle(6 + i * 10, 0, 7.2, i % 2 ? "#79B955" : "#8FCB63"), path(`M${6 + i * 10 - 3} 6 L${6 + i * 10 - 3} 10 M${6 + i * 10 + 3} 6 L${6 + i * 10 + 3} 10`, "none", { stroke: "#4F8A3B", "stroke-width": 1.8, "stroke-linecap": "round" }))),
  circle(-6, -1, 8, "#E3A33E"), circle(-9, -3, 2.4, "#fff"), circle(-9.6, -3, 1.1, INK), stroke("M-8 -9 C-10 -15 -13 -16 -14 -15 M-4 -9 C-4 -15 -2 -17 0 -16", INK, 1.3));
const snail = () => g({ id: ID("snail") },
  path("M-30 8 C-30 2 -22 0 -14 0 L20 0 C26 0 28 8 22 9 L-26 9 C-29 9 -30 9 -30 8Z", "#D9B98E"),
  path("M-26 2 C-30 -10 -32 -20 -28 -26 M-20 1 C-20 -10 -18 -20 -14 -26", "none", { stroke: "#D9B98E", "stroke-width": 3.4, "stroke-linecap": "round" }),
  circle(-28, -27, 2.6, INK), circle(-14, -27, 2.6, INK),
  circle(4, -10, 17, "#B8814E"), circle(4, -10, 12, "#D7A56F"), circle(4, -10, 7, "#B8814E"), circle(4, -10, 3, "#E9C79A"),
  path("M-12 -10 C-12 -22 4 -26 14 -20", "none", { stroke: "#8E5C32", "stroke-width": 2, "stroke-linecap": "round" }));
const robin = () => g({ id: ID("robin") },
  path("M26 6 L44 10 L28 14Z", "#6E5A48"), ellipse(8, 2, 22, 16, "#7D6451"), ellipse(2, 8, 15, 12, "#E8793A"),
  circle(-14, -10, 11, "#6E5A48"), path("M-24 -10 L-34 -7 L-24 -4Z", "#F5C94A"), circle(-17, -12, 2.4, INK), circle(-17.7, -12.7, 0.8, "#fff"),
  path("M10 -2 C22 4 28 10 26 18 C16 16 8 8 4 0Z", "#5C4838"),
  stroke("M-4 17 L-4 28 M-4 28 L-9 28 M-4 28 L2 28 M8 17 L8 28 M8 28 L3 28 M8 28 L14 28", "#C98A4A", 2));
const dragonfly = () => g({ id: ID("dragonfly") },
  g({ class: "cg-flap-y" }, ellipse(-4, -14, 22, 6, "#DDF2FA", { opacity: 0.8, transform: "rotate(-10 -4 -14)" }), ellipse(8, -16, 24, 6, "#DDF2FA", { opacity: 0.8, transform: "rotate(8 8 -16)" }),
    ellipse(-4, 14, 22, 6, "#DDF2FA", { opacity: 0.7, transform: "rotate(10 -4 14)" }), ellipse(8, 16, 24, 6, "#DDF2FA", { opacity: 0.7, transform: "rotate(-8 8 16)" })),
  path("M-12 -3 L56 -2 L56 3 L-12 4Z", "#2E9FC4"), ellipse(-14, 0, 9, 8, "#2E7FA0"), circle(-18, -4, 4.4, "#7FD9E8"), circle(-18, 3, 4.4, "#7FD9E8"), circle(-19, -4, 1.3, INK), circle(-19, 3, 1.3, INK),
  ...[0, 1, 2, 3, 4, 5].map((i) => path(`M${6 + i * 8} -3 L${6 + i * 8} 3`, "none", { stroke: "#1F6F8C", "stroke-width": 1.6 })));
const rabbit = () => g({ id: ID("rabbit") },
  ellipse(14, 4, 26, 18, "#B89A7E"), circle(40, 6, 5.5, "#F4EDE4"), ellipse(0, 14, 10, 12, "#A6866A"),
  circle(-18, -8, 13, "#C4A88C"), ellipse(-14, -34, 5, 18, "#C4A88C", { transform: "rotate(-8 -14 -34)" }), ellipse(-14, -34, 2.4, 13, "#F0B8B8", { transform: "rotate(-8 -14 -34)" }),
  ellipse(-4, -33, 5, 17, "#B89A7E", { transform: "rotate(14 -4 -33)" }), ellipse(-5, -33, 2.4, 12, "#F0B8B8", { transform: "rotate(14 -5 -33)" }),
  circle(-24, -10, 2.4, INK), ellipse(-30, -4, 3, 2.2, "#E89A9A"), ellipse(-2, 22, 14, 5, "#A6866A"));
const bluebird = () => g({ id: ID("bluebird") },
  path("M24 4 L52 -2 L50 12 L26 12Z", "#3B6FC4"), ellipse(6, 2, 26, 15, "#4F86D9"), ellipse(0, 8, 17, 9, "#E8A06A"),
  circle(-18, -6, 11, "#4F86D9"), path("M-28 -6 L-38 -3 L-28 0Z", INK), circle(-21, -8, 2.2, INK),
  g({ class: "cg-flap-r" }, path("M4 -2 C-4 -30 22 -42 42 -36 C30 -22 20 -10 10 0Z", "#3B6FC4"), path("M4 -2 C0 -22 16 -34 30 -34 C22 -22 16 -10 10 0Z", "#7FA8EE", { opacity: 0.85 })));
const firefly = () => g({ id: ID("firefly") },
  g({ class: "cg-flap-y" }, ellipse(-2, -9, 5, 9, "#E8F4FA", { opacity: 0.7, transform: "rotate(-20 -2 -4)" }), ellipse(5, -9, 5, 9, "#E8F4FA", { opacity: 0.7, transform: "rotate(14 5 -4)" })),
  ellipse(0, 2, 6, 10, "#4A4238"), circle(0, -9, 4.6, "#3A332B"), ellipse(0, 12, 7, 6.6, "#FFF29A"), circle(0, 12, 12, "#FFF29A", { opacity: 0.35 }), circle(0, 12, 20, "#FFF7B8", { opacity: 0.18 }),
  stroke("M-2 -12 C-5 -18 -8 -19 -9 -18 M2 -12 C5 -18 8 -19 9 -18", "#3A332B", 1.2));
const moth = () => g({ id: ID("moth") },
  g({ class: "cg-flap-x" },
    path("M0 -2 C-8 -34 -46 -38 -44 -12 C-44 4 -14 8 0 -2Z", "var(--w, #B9AFA0)"), path("M0 -2 C8 -34 46 -38 44 -12 C44 4 14 8 0 -2Z", "var(--w, #B9AFA0)"),
    path("M0 2 C-6 14 -26 24 -26 10 C-26 4 -10 0 0 2Z", "#8E8576"), path("M0 2 C6 14 26 24 26 10 C26 4 10 0 0 2Z", "#8E8576"),
    circle(-28, -14, 6, "#EFE8D8", { opacity: 0.85 }), circle(28, -14, 6, "#EFE8D8", { opacity: 0.85 }), circle(-28, -14, 2.6, "#6F675A"), circle(28, -14, 2.6, "#6F675A")),
  ellipse(0, 2, 4, 13, "#7A7061"), stroke("M-1 -10 C-6 -20 -12 -22 -15 -18 M1 -10 C6 -20 12 -22 15 -18", "#7A7061", 1.6));
const frog = () => g({ id: ID("frog") },
  path("M18 8 C32 8 40 14 42 22 C30 22 22 20 14 16Z", "#4E9A4A"), ellipse(6, 4, 24, 16, "#6BBA5E"), ellipse(-2, 12, 16, 9, "#C9E7A6"),
  circle(-18, -6, 13, "#6BBA5E"), circle(-24, -16, 6.4, "#6BBA5E"), circle(-12, -17, 6.4, "#6BBA5E"), circle(-24, -16, 3.6, "#FFF5C2"), circle(-12, -17, 3.6, "#FFF5C2"), circle(-24.6, -16, 1.6, INK), circle(-12.6, -17, 1.6, INK),
  stroke("M-32 -2 C-26 2 -20 2 -14 -1", "#3E7E3C", 1.8), circle(8, 0, 3, "#4E9A4A"), circle(18, 6, 2.6, "#4E9A4A"), path("M-4 18 L-6 26 L-16 26 L-8 20Z", "#4E9A4A"));
const hedgehog = () => g({ id: ID("hedgehog") },
  path("M-8 12 C-24 12 -30 0 -22 -14 C-14 -30 14 -34 30 -18 C42 -6 42 12 32 12Z", "#7A5A3C"),
  ...ring(11, (d) => path("M0 -4 L-3 -17 L3 -17Z", "#5C412A", { transform: `translate(8 -2) rotate(${d - 100}) translate(0 -14) scale(1.1)` }), 0),
  path("M-8 12 C-26 12 -32 6 -34 2 C-36 -4 -26 -8 -20 -4 C-16 0 -10 4 -8 12Z", "#E6C9A4"), circle(-32, 2, 3, INK), circle(-30, -3, 2, INK), circle(-24, -2, 1.3, "#fff"),
  ellipse(0, 14, 9, 3.6, "#C9A883"), ellipse(20, 14, 9, 3.6, "#C9A883"));
const bat = () => g({ id: ID("bat") },
  g({ class: "cg-flap-x" }, path("M0 0 C-16 -22 -46 -26 -62 -10 C-52 -10 -48 -4 -44 6 C-38 0 -30 2 -26 10 C-20 4 -10 6 0 12Z", "#4B3F63"), path("M0 0 C16 -22 46 -26 62 -10 C52 -10 48 -4 44 6 C38 0 30 2 26 10 C20 4 10 6 0 12Z", "#4B3F63")),
  ellipse(0, 4, 8, 12, "#5C4E7A"), circle(0, -9, 7.5, "#5C4E7A"), path("M-6 -14 L-8 -24 L-1 -16Z", "#5C4E7A"), path("M6 -14 L8 -24 L1 -16Z", "#5C4E7A"), circle(-2.8, -9, 1.6, "#FFF29A"), circle(2.8, -9, 1.6, "#FFF29A"));
const owl = () => g({ id: ID("owl") },
  g({ class: "cg-flap-x" }, path("M0 -4 C-18 -34 -62 -36 -78 -14 C-62 -16 -54 -8 -50 6 C-40 -4 -26 0 -18 14 C-12 4 -6 4 0 10Z", "#8F7355"), path("M0 -4 C18 -34 62 -36 78 -14 C62 -16 54 -8 50 6 C40 -4 26 0 18 14 C12 4 6 4 0 10Z", "#8F7355")),
  ellipse(0, 6, 17, 24, "#A58866"), ellipse(0, 12, 11, 15, "#E8D7B8"), circle(0, -22, 16, "#A58866"), path("M-14 -32 L-18 -44 L-6 -36Z", "#8F7355"), path("M14 -32 L18 -44 L6 -36Z", "#8F7355"),
  circle(-7, -22, 7, "#FFF3C2"), circle(7, -22, 7, "#FFF3C2"), circle(-7, -22, 3.6, INK), circle(7, -22, 3.6, INK), path("M-3 -17 L0 -10 L3 -17Z", "#E8A23A"));

export const MORE_FLOWERS: Record<string, [() => SVGElement, () => SVGElement]> = {
  poppy: [poppyBud, poppyBloom], daffodil: [daffodilBud, daffodilBloom], cosmos: [cosmosBud, cosmosBloom], lavender: [lavenderBud, lavenderBloom],
  rose: [roseBud, roseBloom], iris: [irisBud, irisBloom], moonflower: [moonBud, moonBloom], eveningprimrose: [primroseBud, primroseBloom],
  nightjasmine: [jasmineBud, jasmineBloom], cereus: [cereusBud, cereusBloom],
};
export const MORE_CREATURES: Record<string, () => SVGElement> = { caterpillar, snail, robin, dragonfly, rabbit, bluebird, firefly, moth, frog, hedgehog, bat, owl };

/** Every new symbol, for the shared defs. */
export const moreSymbols = (): SVGElement[] => [
  ...Object.values(MORE_FLOWERS).flatMap(([bud, bloom]) => [bud(), bloom()]),
  ...Object.values(MORE_CREATURES).map((f) => f()),
];
export const MORE_SYMBOL_IDS: string[] = [
  ...Object.keys(MORE_FLOWERS).flatMap((k) => [`${k}-bud`, `${k}-bloom`]),
  ...Object.keys(MORE_CREATURES),
];
void MINT; void SKY;
