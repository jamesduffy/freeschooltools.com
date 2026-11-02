import { h, s } from "../shared/dom";
import type { SpeciesId } from "./config";
import { EXTRA_ART } from "../fishtank/art-extra";
import { MORE_ART } from "../fishtank/art-more";

/** Original flat vector art. Each species is one SVG symbol defined once and reused with <use>.
 *  All fish face right. No outlines. Shapes differ by silhouette, not only color. */
export type Art = { w: number; h: number; body: string };

const INK = "#1d2b3a";

const BASE_ART: Record<string, Art> = {
  // Slim spindle with a forked tail
  minnows: { w: 60, h: 28, body:
    `<path d="M16 14 L1 3 Q7 14 1 25Z" fill="#8fb8cf"/>` +
    `<path d="M28 7 L34 0 L40 7Z" fill="#8fb8cf"/>` +
    `<path d="M13 14 Q26 3 42 6 Q55 9 59 14 Q55 19 42 22 Q26 25 13 14Z" fill="#cfe4ee"/>` +
    `<path d="M17 12 Q30 6 46 8 Q36 11 17 14Z" fill="#7fa9c2"/>` +
    `<circle cx="50" cy="12" r="2" fill="${INK}"/>` },
  // Tall disc with a pointed snout and a tall dorsal fin
  butterflyfish: { w: 100, h: 84, body:
    `<path d="M20 44 L2 28 Q8 44 2 60Z" fill="#f0b53a"/>` +
    `<path d="M26 18 Q40 0 66 14Z" fill="#f0b53a"/>` +
    `<path d="M30 70 Q44 84 62 72Z" fill="#f0b53a"/>` +
    `<path d="M82 40 L99 44 L82 50Z" fill="#f6cf6a"/>` +
    `<path d="M16 44 Q18 14 50 12 Q82 14 84 44 Q82 74 50 76 Q18 74 16 44Z" fill="#f6cf6a"/>` +
    `<path d="M60 14 Q70 44 60 74 L50 75 Q60 44 50 12Z" fill="${INK}" opacity=".85"/>` +
    `<path d="M20 52 Q36 40 46 56 Q34 66 20 52Z" fill="#fbe9b0"/>` +
    `<circle cx="72" cy="38" r="4.5" fill="#fff"/><circle cx="73" cy="38" r="2.4" fill="${INK}"/>` },
  // Round ball with tiny fins
  pufferfish: { w: 90, h: 80, body:
    `<path d="M20 42 L3 32 Q8 42 3 54Z" fill="#c99a5e"/>` +
    `<path d="M40 14 Q46 4 54 14Z" fill="#c99a5e"/>` +
    `<circle cx="46" cy="42" r="32" fill="#e3bd82"/>` +
    `<path d="M16 50 Q46 80 76 52 Q70 74 46 74 Q24 74 16 50Z" fill="#f6e6c4"/>` +
    `<circle cx="30" cy="30" r="3" fill="#b98a50"/><circle cx="42" cy="22" r="3" fill="#b98a50"/><circle cx="54" cy="26" r="3" fill="#b98a50"/><circle cx="36" cy="40" r="3" fill="#b98a50"/>` +
    `<path d="M44 52 Q54 48 56 60 Q48 62 44 52Z" fill="#c99a5e"/>` +
    `<circle cx="64" cy="36" r="6" fill="#fff"/><circle cx="65.5" cy="36" r="3.4" fill="${INK}"/>` +
    `<path d="M76 46 Q80 48 77 51" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` },
  // Upright, curled tail, long snout, crown
  seahorse: { w: 60, h: 100, body:
    `<path d="M26 28 Q46 38 40 58 Q34 74 40 86 Q44 96 32 96 Q20 96 22 86" fill="none" stroke="#e59a52" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M22 86 Q20 80 26 80" fill="none" stroke="#e59a52" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M26 44 Q10 52 24 64Z" fill="#f6c58a"/>` +
    `<path d="M20 20 Q14 8 22 8 Q30 8 32 14Z" fill="#e59a52"/>` +
    `<circle cx="28" cy="18" r="12" fill="#e59a52"/>` +
    `<path d="M34 16 L54 20 Q56 24 52 26 L34 26Z" fill="#e59a52"/>` +
    `<path d="M24 8 L20 0 L28 5 L30 -1 L32 8Z" fill="#f6c58a"/>` +
    `<circle cx="30" cy="16" r="3.2" fill="${INK}"/>` +
    `<path d="M30 30 Q42 36 40 48" fill="none" stroke="#f6c58a" stroke-width="3" stroke-linecap="round"/>` },
  // Bell with scalloped edge and long trailing tentacles
  jellyfish: { w: 80, h: 112, body:
    `<path d="M22 48 Q12 68 22 82 Q28 94 20 108" fill="none" stroke="#d9a3e6" stroke-width="3.5" stroke-linecap="round"/>` +
    `<path d="M34 48 Q26 70 36 84 Q42 96 34 110" fill="none" stroke="#d9a3e6" stroke-width="3.5" stroke-linecap="round"/>` +
    `<path d="M46 48 Q54 68 44 84 Q38 96 46 110" fill="none" stroke="#d9a3e6" stroke-width="3.5" stroke-linecap="round"/>` +
    `<path d="M58 48 Q68 70 58 82 Q52 94 60 108" fill="none" stroke="#d9a3e6" stroke-width="3.5" stroke-linecap="round"/>` +
    `<path d="M30 46 Q26 64 34 74 Q40 62 40 48Z" fill="#f1cff7"/><path d="M42 46 Q46 64 40 78 Q54 66 52 46Z" fill="#f1cff7"/>` +
    `<path d="M5 48 Q5 4 40 4 Q75 4 75 48 Q68 54 61 48 Q54 54 47 48 Q40 54 33 48 Q26 54 19 48 Q12 54 5 48Z" fill="#c78ae0"/>` +
    `<path d="M16 38 Q18 16 40 12 Q28 20 26 38Z" fill="#e6bdf2" opacity=".9"/>` },
  // Side view: domed shell, big paddle flippers, head
  turtle: { w: 140, h: 90, body:
    `<path d="M30 58 L12 76 Q30 80 44 64Z" fill="#5f9e72"/>` +
    `<path d="M22 54 L4 58 L22 62Z" fill="#5f9e72"/>` +
    `<path d="M104 40 Q126 28 138 42 Q136 56 114 58Z" fill="#7fb98d"/>` +
    `<path d="M22 58 Q24 10 72 10 Q118 12 120 58Z" fill="#477f5a"/>` +
    `<path d="M40 58 Q42 24 72 22 Q102 24 104 58Z" fill="#5f9e72"/>` +
    `<path d="M56 56 Q58 34 72 34 Q86 34 88 56Z" fill="#7fb98d"/>` +
    `<path d="M20 58 L122 58 Q114 68 72 68 Q28 68 20 58Z" fill="#e8dcae"/>` +
    `<path d="M84 60 L122 84 Q100 90 74 66Z" fill="#6fae82"/>` +
    `<circle cx="124" cy="42" r="2.8" fill="${INK}"/>` },
  // Wide kite wings seen from above, whip tail, small horns
  manta: { w: 200, h: 110, body:
    `<path d="M70 53 L0 55 L70 57Z" fill="#2c3e50"/>` +
    `<path d="M188 55 Q172 36 132 22 Q98 8 60 2 Q76 30 68 48 L60 55 L68 62 Q76 80 60 108 Q98 102 132 88 Q172 74 188 55Z" fill="#3b5167"/>` +
    `<path d="M188 49 L200 43 L192 54Z M188 61 L200 67 L192 56Z" fill="#2c3e50"/>` +
    `<path d="M150 44 Q168 55 150 66 Q140 55 150 44Z" fill="#dce7ee"/>` +
    `<path d="M104 46 Q118 55 104 64 Q96 55 104 46Z" fill="#4d6a84"/>` +
    `<circle cx="176" cy="48" r="2.2" fill="#dce7ee"/><circle cx="176" cy="62" r="2.2" fill="#dce7ee"/>` },
  // Long spotted body, flat wide head, crescent tail
  whaleshark: { w: 260, h: 92, body:
    `<path d="M44 46 Q30 36 6 4 Q24 4 38 22 Q42 28 52 38Z M44 46 Q30 56 14 84 Q32 76 44 62Z" fill="#456a85"/>` +
    `<path d="M120 28 L140 4 Q146 20 156 30Z" fill="#456a85"/>` +
    `<path d="M168 62 L148 88 Q176 82 196 64Z" fill="#456a85"/>` +
    `<path d="M256 48 Q258 36 240 32 Q192 22 130 24 Q80 26 46 38 Q32 44 28 47 Q32 50 46 56 Q80 68 130 70 Q192 72 240 62 Q258 58 256 48Z" fill="#5d849e"/>` +
    `<path d="M240 58 Q192 70 130 69 Q80 67 46 56 Q90 62 150 60 Q210 58 240 52Z" fill="#a9c4d3"/>` +
    `<g fill="#e8f1f5"><circle cx="70" cy="40" r="2"/><circle cx="90" cy="34" r="2.4"/><circle cx="112" cy="40" r="2.2"/><circle cx="132" cy="34" r="2.4"/><circle cx="154" cy="39" r="2.2"/><circle cx="176" cy="34" r="2.4"/><circle cx="198" cy="38" r="2.2"/><circle cx="220" cy="37" r="2"/><circle cx="82" cy="50" r="2"/><circle cx="104" cy="52" r="2.2"/><circle cx="126" cy="49" r="2"/><circle cx="148" cy="52" r="2.2"/><circle cx="170" cy="49" r="2"/><circle cx="192" cy="51" r="2.2"/><circle cx="214" cy="49" r="2"/></g>` +
    `<circle cx="238" cy="44" r="2.6" fill="${INK}"/>` },
};

/** Every drawing: the 8 original species plus the 36 more shared with the Fish Tank. */
export const ART: Record<string, Art> = { ...BASE_ART, ...EXTRA_ART, ...MORE_ART };

export const symbolId = (id: SpeciesId) => `aq-sp-${id}`;

function parse(markup: string): Element[] {
  const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, "image/svg+xml");
  return [...doc.documentElement.children].map((n) => document.importNode(n, true));
}

/** Hidden sheet that defines every species symbol once. Add it to the page once. */
export function spriteSheet(): SVGElement {
  const defs = s("defs");
  for (const [id, a] of Object.entries(ART) as [SpeciesId, Art][]) {
    const sym = s("symbol", { id: symbolId(id), viewBox: `0 0 ${a.w} ${a.h}` });
    sym.append(...parse(a.body));
    defs.append(sym);
  }
  return s("svg", { width: 0, height: 0, style: "position:absolute", "aria-hidden": "true", focusable: "false" }, defs);
}

/** A reusable fish drawing. Size it with CSS width. */
export function fishSvg(id: SpeciesId, cls = ""): SVGElement {
  const a = ART[id]!;
  const svg = s("svg", { viewBox: `0 0 ${a.w} ${a.h}`, class: cls, "aria-hidden": "true", focusable: "false", style: "display:block;width:100%;height:auto;overflow:visible" });
  svg.append(s("use", { href: `#${symbolId(id)}` }));
  return svg;
}

/** Background scenery behind the fish: water, light rays, sandy floor, rocks. */
export function sceneryBack(): SVGElement {
  const rays = s("g", { class: "aq-rays" });
  for (const [x, w, o] of [[180, 160, 0.08], [520, 120, 0.06], [860, 190, 0.07], [1210, 130, 0.06]] as const)
    rays.append(s("polygon", { points: `${x},0 ${x + w},0 ${x + w * 2.2 - 120},900 ${x - 220},900`, fill: "#fff", opacity: o }));
  return s("svg", { class: "aq-back", viewBox: "0 0 1600 900", preserveAspectRatio: "xMidYMid slice", "aria-hidden": "true", focusable: "false" },
    s("defs", {},
      (() => { const g = s("linearGradient", { id: "aq-water", x1: 0, y1: 0, x2: 0, y2: 1 });
        g.append(s("stop", { offset: "0", "stop-color": "#3f9bb8" }), s("stop", { offset: "0.55", "stop-color": "#1f6f94" }), s("stop", { offset: "1", "stop-color": "#123f66" })); return g; })(),
      (() => { const g = s("linearGradient", { id: "aq-sand", x1: 0, y1: 0, x2: 0, y2: 1 });
        g.append(s("stop", { offset: "0", "stop-color": "#ecd7a0" }), s("stop", { offset: "1", "stop-color": "#c9ad72" })); return g; })()),
    s("rect", { width: 1600, height: 900, fill: "url(#aq-water)" }),
    rays,
    s("path", { d: "M0 790 Q220 750 460 780 Q720 812 980 772 Q1260 736 1600 782 L1600 900 L0 900Z", fill: "url(#aq-sand)" }),
    s("path", { d: "M0 840 Q300 818 640 846 Q1000 872 1300 836 Q1480 820 1600 836 L1600 900 L0 900Z", fill: "#d8bf86", opacity: 0.8 }),
    s("path", { d: "M1180 800 Q1190 744 1250 742 Q1316 744 1330 806Z", fill: "#7d8c96" }),
    s("path", { d: "M1236 808 Q1244 770 1290 768 Q1336 770 1350 812Z", fill: "#95a4ae" }),
    s("path", { d: "M130 812 Q140 768 190 766 Q240 770 250 816Z", fill: "#7d8c96" }));
}

/** Plants in front of the fish, swaying gently. */
export function sceneryFront(): SVGElement {
  const kelp = (x: number, hgt: number, delay: number, color: string) =>
    s("path", { d: `M${x} 830 Q${x - 34} ${830 - hgt * 0.35} ${x} ${830 - hgt * 0.65} Q${x + 30} ${830 - hgt * 0.85} ${x - 6} ${830 - hgt} Q${x + 12} ${830 - hgt * 0.8} ${x + 14} ${830 - hgt * 0.6} Q${x + 36} ${830 - hgt * 0.34} ${x + 16} 830Z`,
      fill: color, class: "aq-sway", style: `animation-delay:${delay}s` });
  return s("svg", { class: "aq-front", viewBox: "0 0 1600 900", preserveAspectRatio: "xMidYMid slice", "aria-hidden": "true", focusable: "false" },
    kelp(300, 250, -2, "#3f8f6a"), kelp(340, 180, -6, "#58a77c"), kelp(1010, 220, -4, "#3f8f6a"),
    kelp(1420, 280, -1, "#4d9f75"), kelp(1460, 190, -8, "#3f8f6a"), kelp(640, 140, -5, "#58a77c"),
    s("path", { d: "M40 862 Q60 810 100 812 Q150 818 150 866Z", fill: "#e08a7a" }),
    s("path", { d: "M70 862 Q76 828 100 830 Q124 834 126 866Z", fill: "#eba596" }));
}

export function bubbles(): HTMLElement {
  const wrap = h("div", { class: "aq-bubbles", "aria-hidden": "true" });
  const spec = [[8, 10, 24, -3], [19, 7, 30, -14], [33, 12, 26, -8], [47, 8, 34, -20], [58, 11, 28, -1], [71, 7, 32, -17], [84, 10, 27, -11], [92, 8, 36, -5]] as const;
  for (const [x, size, dur, delay] of spec)
    wrap.append(h("span", { class: "aq-bubble", style: `left:${x}%;width:${size}px;height:${size}px;animation-duration:${dur}s;animation-delay:${delay}s` }));
  return wrap;
}
