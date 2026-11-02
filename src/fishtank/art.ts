import { s } from "../shared/dom";
import { ART as AQUARIUM_ART, type Art } from "../aquarium/art";
import type { SpeciesId } from "../aquarium/config";
import { MORE_ART, type MoreId } from "./art-more";

/** Original flat vector art for the Fish Tank toy. All swimmers face right. No outlines.
 *  The first 8 species come from the Quiet Aquarium; the rest are drawn here. */
const INK = "#1d2b3a";
const eye = (cx: number, cy: number, r = 3.6) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/><circle cx="${cx + r * 0.3}" cy="${cy}" r="${r * 0.55}" fill="${INK}"/>`;

export type ExtraId = "angelfish" | "lionfish" | "boxfish" | "swordfish" | "hammerhead" | "dolphin" | "orca" | "octopus" | "squid" | "anglerfish" | "tetra";
export type FishId = SpeciesId | ExtraId | MoreId;

const EXTRA: Record<ExtraId, Art> = {
  // Tall kite body with long trailing fins
  angelfish: { w: 90, h: 110, body:
    `<path d="M24 56 L4 36 Q10 56 4 76Z" fill="#9aa9d6"/>` +
    `<path d="M30 40 Q36 8 52 2 Q58 24 60 40Z" fill="#b9c4ea"/>` +
    `<path d="M30 72 Q36 102 52 108 Q58 86 60 72Z" fill="#b9c4ea"/>` +
    `<path d="M20 56 Q40 14 68 22 Q86 40 86 56 Q86 72 68 90 Q40 98 20 56Z" fill="#dfe6fa"/>` +
    `<path d="M38 24 Q50 56 38 88 L46 90 Q60 56 48 22Z" fill="#5b6fb5"/>` +
    `<path d="M58 20 Q70 56 58 92 L64 90 Q76 56 64 22Z" fill="#5b6fb5"/>` + eye(74, 46) },
  // Round body fanned with spiky fins
  lionfish: { w: 130, h: 100, body:
    `<g fill="#c8553a"><path d="M40 50 L2 30 L34 44Z"/><path d="M40 56 L0 54 L36 58Z"/><path d="M40 62 L4 82 L38 66Z"/>` +
    `<path d="M56 34 L50 2 L66 32Z"/><path d="M68 32 L68 0 L80 32Z"/><path d="M82 34 L90 4 L94 36Z"/>` +
    `<path d="M54 70 L48 98 L64 72Z"/><path d="M68 72 L70 100 L80 72Z"/></g>` +
    `<path d="M30 52 Q38 24 76 24 Q114 26 122 52 Q114 78 76 80 Q38 78 30 52Z" fill="#e8825f"/>` +
    `<path d="M50 28 Q58 52 50 76 L58 78 Q68 52 58 26Z M72 26 Q80 52 72 78 L80 78 Q90 52 80 26Z" fill="#f4e3d3"/>` +
    `<path d="M104 34 L130 50 L106 62Z" fill="#c8553a"/>` + eye(102, 46) },
  // Cube with rounded corners and spots
  boxfish: { w: 90, h: 70, body:
    `<path d="M20 36 L4 22 Q8 36 4 50Z" fill="#e6b52e"/>` +
    `<rect x="16" y="8" width="64" height="52" rx="18" fill="#f7d559"/>` +
    `<rect x="16" y="40" width="64" height="20" rx="10" fill="#fbe8a0"/>` +
    `<g fill="#2f4a66"><circle cx="30" cy="22" r="3.4"/><circle cx="44" cy="30" r="3.4"/><circle cx="58" cy="22" r="3.4"/><circle cx="36" cy="42" r="3.4"/><circle cx="52" cy="44" r="3.4"/></g>` +
    `<path d="M44 52 Q54 58 60 50Z" fill="#e6b52e"/>` + `<path d="M78 40 Q84 42 80 46" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>` + eye(68, 26) },
  // Long spear, tall sail fin, crescent tail
  swordfish: { w: 240, h: 84, body:
    `<path d="M62 42 L40 4 Q46 24 64 34Z M62 44 L40 84 Q46 62 64 52Z" fill="#355d7a"/>` +
    `<path d="M92 22 Q110 -4 134 22Z" fill="#355d7a"/>` +
    `<path d="M240 42 L184 36 L184 48Z" fill="#c9d6de"/>` +
    `<path d="M64 42 Q96 22 150 24 Q176 26 190 40 Q176 58 150 60 Q96 62 64 42Z" fill="#4f84a6"/>` +
    `<path d="M70 46 Q110 64 170 56 Q130 54 70 46Z" fill="#dce8ef"/>` + eye(168, 38, 3.2) },
  // Flat hammer-shaped head
  hammerhead: { w: 220, h: 110, body:
    `<path d="M64 52 Q40 36 6 6 Q26 36 24 52 Q26 70 6 100 Q40 70 64 56Z" fill="#6b7f8c"/>` +
    `<path d="M104 32 L130 2 Q138 20 150 32Z" fill="#6b7f8c"/>` +
    `<path d="M118 70 L100 100 Q128 92 148 72Z" fill="#6b7f8c"/>` +
    `<path d="M62 54 Q100 34 150 38 Q180 42 198 54 Q180 68 150 70 Q100 72 62 54Z" fill="#8a9fac"/>` +
    `<path d="M70 58 Q120 74 192 60 Q140 66 70 58Z" fill="#dfe8ed"/>` +
    `<path d="M186 26 Q200 4 216 10 Q226 18 214 36 Q208 46 208 54 Q208 62 214 72 Q226 90 216 98 Q200 104 186 82 Q194 54 186 26Z" fill="#8a9fac"/>` +
    `<circle cx="216" cy="19" r="3" fill="${INK}"/><circle cx="216" cy="89" r="3" fill="${INK}"/>` },
  // Curved body, beak, dorsal fin and flukes
  dolphin: { w: 200, h: 100, body:
    `<path d="M44 52 L8 24 Q8 40 22 52 Q8 64 8 80Z" fill="#6f8da6"/>` +
    `<path d="M96 28 Q112 4 124 8 Q122 22 124 32Z" fill="#6f8da6"/>` +
    `<path d="M108 62 Q116 84 98 90 Q100 74 96 64Z" fill="#6f8da6"/>` +
    `<path d="M44 52 Q70 28 120 28 Q164 30 178 44 L198 50 Q198 56 180 58 Q164 74 120 74 Q70 76 44 52Z" fill="#8eacc4"/>` +
    `<path d="M60 56 Q110 78 178 58 Q120 66 60 56Z" fill="#e4eef4"/>` + eye(158, 44, 3) },
  // Big black-and-white whale
  orca: { w: 250, h: 110, body:
    `<path d="M50 54 L6 22 Q10 42 26 54 Q10 66 6 86Z" fill="#26323f"/>` +
    `<path d="M108 30 L124 -2 Q138 18 144 32Z" fill="#26323f"/>` +
    `<path d="M120 70 Q128 100 104 106 Q108 86 102 72Z" fill="#26323f"/>` +
    `<path d="M50 54 Q80 26 140 26 Q206 28 238 48 Q246 54 238 60 Q206 82 140 82 Q80 82 50 54Z" fill="#2f3d4c"/>` +
    `<path d="M66 62 Q130 90 238 60 Q244 56 238 54 Q150 74 66 62Z" fill="#f2f6f8"/>` +
    `<path d="M170 30 Q196 28 204 40 Q190 46 168 42Z" fill="#f2f6f8"/>` + `<circle cx="214" cy="48" r="3" fill="#f2f6f8"/><circle cx="215" cy="48" r="1.6" fill="${INK}"/>` },
  // Round head, eight curly arms, upright
  octopus: { w: 100, h: 120, body:
    `<g fill="none" stroke="#d96a8a" stroke-width="9" stroke-linecap="round"><path d="M24 70 Q10 90 22 104 Q30 112 24 118"/><path d="M34 76 Q26 98 38 108"/><path d="M44 78 Q42 100 52 112"/><path d="M56 78 Q60 100 52 114"/><path d="M66 76 Q76 98 64 110"/><path d="M76 70 Q92 88 80 104 Q74 112 82 118"/></g>` +
    `<path d="M16 54 Q12 8 50 6 Q88 8 84 54 Q82 76 50 78 Q18 76 16 54Z" fill="#e8809e"/>` +
    `<path d="M26 30 Q30 14 48 12 Q36 22 34 38Z" fill="#f2a9be"/>` +
    `<g fill="#f6c3d1"><circle cx="30" cy="68" r="3"/><circle cx="70" cy="68" r="3"/></g>` + eye(38, 52, 6) + eye(62, 52, 6) },
  // Torpedo mantle with fins at the back and trailing tentacles
  squid: { w: 170, h: 64, body:
    `<g fill="none" stroke="#e0907a" stroke-width="4.5" stroke-linecap="round"><path d="M128 28 Q150 22 168 14"/><path d="M128 32 Q152 32 170 32"/><path d="M128 36 Q150 42 168 52"/></g>` +
    `<path d="M4 32 Q18 8 44 10 Q40 24 38 32 Q40 40 44 54 Q18 56 4 32Z" fill="#c9674f"/>` +
    `<path d="M24 32 Q60 6 118 20 Q136 26 140 32 Q136 40 118 44 Q60 58 24 32Z" fill="#e9a58f"/>` +
    `<path d="M40 30 Q70 16 112 24 Q70 22 40 30Z" fill="#f6d2c6"/>` + eye(118, 30, 4.4) },
  // Dark round body, big mouth, glowing lure
  anglerfish: { w: 130, h: 110, body:
    `<path d="M30 56 L6 38 Q12 56 6 76Z" fill="#3a3450"/>` +
    `<path d="M52 20 Q60 -4 98 6" fill="none" stroke="#3a3450" stroke-width="4" stroke-linecap="round"/>` +
    `<circle cx="100" cy="8" r="9" fill="#ffe27a"/><circle cx="100" cy="8" r="5" fill="#fff6c8"/>` +
    `<path d="M22 56 Q24 18 66 18 Q104 20 112 52 Q112 80 66 90 Q24 92 22 56Z" fill="#4b4564"/>` +
    `<path d="M80 50 Q112 44 126 56 Q112 78 80 72Z" fill="#2a2640"/>` +
    `<path d="M88 52 L92 62 L96 52 L100 62 L104 52 L108 60 L112 51" fill="#f4f1fa"/>` +
    `<path d="M56 78 Q72 90 88 78 Q72 96 56 78Z" fill="#3a3450"/>` + eye(86, 36, 4.6) },
  // Tiny blue schooling fish with a bright stripe
  tetra: { w: 44, h: 20, body:
    `<path d="M12 10 L1 2 Q5 10 1 18Z" fill="#c75a5a"/>` +
    `<path d="M10 10 Q22 1 34 3 Q42 6 43 10 Q42 14 34 17 Q22 19 10 10Z" fill="#4a90d6"/>` +
    `<path d="M14 11 Q26 8 40 10 Q26 14 14 11Z" fill="#7de3ff"/>` +
    `<circle cx="36" cy="8.6" r="1.8" fill="#fff"/><circle cx="36.5" cy="8.6" r="1" fill="${INK}"/>` },
};

export const ALL_ART: Record<FishId, Art> = { ...AQUARIUM_ART, ...EXTRA, ...MORE_ART };
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
