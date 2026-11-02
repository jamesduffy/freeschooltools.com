import { s } from "../shared/dom";
import { ART as AQUARIUM_ART, type Art } from "../aquarium/art";
import type { ExtraId } from "./art-extra";
import type { MoreId } from "./art-more";

/** All fish drawings. The Quiet Aquarium's own 8 are in aquarium/art.ts; the Fish Tank adds the others (art-extra.ts, art-more.ts),
 *  and the Aquarium uses those too, so every drawing lives in one place. */
const INK = "#1d2b3a";

export type { ExtraId } from "./art-extra";
/** The 8 original Quiet Aquarium species. */
type OriginalId = "minnows" | "butterflyfish" | "pufferfish" | "seahorse" | "jellyfish" | "turtle" | "manta" | "whaleshark";
export type FishId = OriginalId | ExtraId | MoreId;

export const ALL_ART = AQUARIUM_ART as Record<FishId, Art>;
export const FISH_IDS = Object.keys(ALL_ART) as FishId[];
export const symbolId = (id: string) => `ft-sp-${id}`;

function parse(markup: string): Element[] {
  const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, "image/svg+xml");
  return [...doc.documentElement.children].map((n) => document.importNode(n, true));
}

/** Define every symbol once. Add the result to the page once. */
export function spriteSheet(extra: Record<string, { w: number; h: number; body: string }> = {}): SVGElement {
  const defs = s("defs");
  for (const [id, a] of Object.entries({ ...ALL_ART, ...extra })) {
    const sym = s("symbol", { id: symbolId(id), viewBox: `0 0 ${a.w} ${a.h}` });
    sym.append(...parse(a.body));
    defs.append(sym);
  }
  return s("svg", { width: 0, height: 0, style: "position:absolute", "aria-hidden": "true", focusable: "false" }, defs);
}

export function useSvg(id: string, a: { w: number; h: number }): SVGElement {
  const svg = s("svg", { viewBox: `0 0 ${a.w} ${a.h}`, "aria-hidden": "true", focusable: "false", style: "display:block;width:100%;height:100%;overflow:visible" });
  svg.append(s("use", { href: `#${symbolId(id)}` }));
  return svg;
}

// ---- floor creatures (all original) ---------------------------------------------

function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 === 0 ? outer : inner;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(" ");
}

export const FLOOR_ART: Record<"crab" | "starfish" | "hermit", Art> = {
  // Sideways walker: two raised claws, stalked eyes, three legs a side (legs wiggle via CSS)
  crab: { w: 140, h: 100, body:
    `<g class="legs l" fill="none" stroke="#c9503a" stroke-width="6" stroke-linecap="round"><path d="M44 62 L18 66 L10 84"/><path d="M48 70 L24 82 L20 98"/><path d="M56 76 L40 92 L38 100"/></g>` +
    `<g class="legs r" fill="none" stroke="#c9503a" stroke-width="6" stroke-linecap="round"><path d="M96 62 L122 66 L130 84"/><path d="M92 70 L116 82 L120 98"/><path d="M84 76 L100 92 L102 100"/></g>` +
    `<path d="M40 52 Q24 40 22 22" fill="none" stroke="#c9503a" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M100 52 Q116 40 118 22" fill="none" stroke="#c9503a" stroke-width="7" stroke-linecap="round"/>` +
    `<path d="M22 24 Q4 20 8 4 Q18 12 24 10Z M22 24 Q8 36 2 26 Q12 24 18 20Z" fill="#e0654a"/>` +
    `<path d="M118 24 Q136 20 132 4 Q122 12 116 10Z M118 24 Q132 36 138 26 Q128 24 122 20Z" fill="#e0654a"/>` +
    `<path d="M32 66 Q30 38 70 36 Q110 38 108 66 Q104 84 70 84 Q36 84 32 66Z" fill="#e0654a"/>` +
    `<path d="M44 48 Q70 40 96 48 Q70 52 44 48Z" fill="#f08a70"/>` +
    `<path d="M58 38 L56 26 M82 38 L84 26" stroke="#c9503a" stroke-width="4" stroke-linecap="round"/>` +
    `<circle cx="56" cy="24" r="6" fill="#fff"/><circle cx="57" cy="25" r="3" fill="${INK}"/><circle cx="84" cy="24" r="6" fill="#fff"/><circle cx="85" cy="25" r="3" fill="${INK}"/>` +
    `<path d="M62 70 Q70 76 78 70" fill="none" stroke="#9c3a28" stroke-width="3" stroke-linecap="round"/>` },
  starfish: { w: 110, h: 110, body:
    `<polygon points="${starPoints(55, 56, 52, 22)}" fill="#f0a24a" stroke="#f0a24a" stroke-width="10" stroke-linejoin="round"/>` +
    `<polygon points="${starPoints(55, 56, 36, 15)}" fill="#f7c27a"/>` +
    `<g fill="#e07a2a"><circle cx="55" cy="22" r="3.2"/><circle cx="89" cy="46" r="3.2"/><circle cx="76" cy="88" r="3.2"/><circle cx="34" cy="88" r="3.2"/><circle cx="21" cy="46" r="3.2"/><circle cx="55" cy="56" r="4.6"/></g>` },
  // Spiral shell with a little crab peeking out; the `body` group hides when scared
  hermit: { w: 120, h: 100, body:
    `<g class="body"><g fill="none" stroke="#e8946a" stroke-width="5" stroke-linecap="round"><path d="M78 80 L90 96 M64 82 L70 98 M92 74 L108 90"/></g>` +
    `<path d="M70 82 Q66 60 84 58 Q106 58 108 78 Q104 88 90 88 Q76 90 70 82Z" fill="#f0a67e"/>` +
    `<path d="M92 62 L98 46 M104 66 L116 54" stroke="#e8946a" stroke-width="4.5" stroke-linecap="round"/>` +
    `<circle cx="98" cy="43" r="5.4" fill="#fff"/><circle cx="99" cy="44" r="2.8" fill="${INK}"/><circle cx="118" cy="52" r="5.4" fill="#fff"/><circle cx="119" cy="53" r="2.8" fill="${INK}"/>` +
    `<path d="M104 78 Q116 80 112 90 Q104 88 102 82Z" fill="#e8946a"/></g>` +
    `<path d="M10 86 Q4 40 40 22 Q76 14 82 52 Q86 86 52 90 Q24 94 10 86Z" fill="#d6bfa0"/>` +
    `<path d="M16 84 Q12 48 42 32 Q68 26 72 52 Q74 76 52 80 Q30 82 28 62 Q28 46 46 44 Q58 46 56 58" fill="none" stroke="#a9895f" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M20 84 Q50 94 78 84 Q80 90 52 94 Q26 94 20 84Z" fill="#b69a72"/>` },
};
