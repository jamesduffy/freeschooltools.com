import type { Art } from "../aquarium/art";

/** 25 more original species for the Fish Tank. All face right, flat shapes, no outlines. Told apart by silhouette as well as color. */
const INK = "#1d2b3a";
const eye = (cx: number, cy: number, r = 3.4) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/><circle cx="${cx + r * 0.3}" cy="${cy}" r="${r * 0.55}" fill="${INK}"/>`;

export type MoreId =
  | "guppy" | "chromis" | "goby" | "wrasse" | "sardines"
  | "triggerfish" | "parrotfish" | "flyingfish" | "cuttlefish" | "nautilus"
  | "moray" | "sunfish" | "seadragon" | "barracuda" | "stingray" | "mandarinfish"
  | "greatwhite" | "beluga" | "sawfish" | "seal" | "manatee" | "penguin"
  | "humpback" | "bluewhale" | "oarfish";

export const MORE_ART: Record<MoreId, Art> = {
  // Small body, big fan tail
  guppy: { w: 64, h: 44, body:
    `<path d="M22 22 Q8 -2 1 6 Q9 22 1 38 Q8 46 22 22Z" fill="#f2603c"/><path d="M14 22 Q6 12 4 10 Q9 22 4 34Z" fill="#ffb199"/>` +
    `<path d="M20 22 Q32 9 48 13 Q62 17 62 22 Q62 28 48 31 Q32 35 20 22Z" fill="#7bd0c8"/>` +
    `<path d="M26 23 Q40 17 56 21 Q40 27 26 23Z" fill="#b7ece6"/>` + eye(53, 19, 2.8) },
  // Plump, bright green, forked tail
  chromis: { w: 70, h: 56, body:
    `<path d="M16 28 L1 12 Q7 28 1 44Z" fill="#4fa23f"/><path d="M26 12 Q38 2 48 12Z" fill="#4fa23f"/><path d="M28 46 Q38 54 46 46Z" fill="#4fa23f"/>` +
    `<path d="M14 28 Q18 8 40 8 Q62 10 68 28 Q62 46 40 48 Q18 48 14 28Z" fill="#92d673"/>` +
    `<path d="M20 34 Q40 46 62 32 Q44 42 20 34Z" fill="#cdf0b8"/>` + eye(56, 24, 3.8) },
  // Slim bottom dweller with two dorsal fins and eyes on top
  goby: { w: 80, h: 32, body:
    `<path d="M14 18 L2 6 Q6 18 2 30Z" fill="#b99a6a"/><path d="M26 6 Q36 -1 44 6Z M48 7 Q56 1 62 8Z" fill="#c9ad7c"/>` +
    `<path d="M12 18 Q30 8 56 9 Q74 11 78 18 Q74 26 56 27 Q30 28 12 18Z" fill="#d8c08e"/>` +
    `<g fill="#9a7b4a"><circle cx="26" cy="17" r="2.2"/><circle cx="38" cy="14" r="2.2"/><circle cx="48" cy="19" r="2.2"/></g>` +
    `<circle cx="66" cy="11" r="5" fill="#fff"/><circle cx="67.5" cy="11" r="2.6" fill="${INK}"/>` },
  // Long, striped, pointed
  wrasse: { w: 120, h: 50, body:
    `<path d="M24 25 Q8 12 2 8 Q8 25 2 42 Q10 38 24 25Z" fill="#e0457a"/>` +
    `<path d="M40 11 Q70 -2 96 11Z" fill="#7bd05b"/>` +
    `<path d="M20 25 Q42 6 80 9 Q108 12 118 25 Q108 38 80 41 Q42 44 20 25Z" fill="#49b6d6"/>` +
    `<path d="M30 25 Q60 17 112 22 Q60 28 30 25Z" fill="#f5e24a"/><path d="M60 11 Q72 25 60 40 L68 40 Q80 25 68 10Z" fill="#e0457a" opacity=".85"/>` + eye(100, 20, 3.4) },
  // Narrow silver school fish with a dark back
  sardines: { w: 62, h: 24, body:
    `<path d="M16 12 L1 2 Q6 12 1 22Z" fill="#8da4b4"/>` +
    `<path d="M14 12 Q28 2 46 4 Q58 7 61 12 Q58 17 46 20 Q28 22 14 12Z" fill="#c9d8e2"/>` +
    `<path d="M18 11 Q32 3 52 6 Q34 8 18 11Z" fill="#4f6b82"/>` +
    `<circle cx="52" cy="10" r="2.2" fill="#fff"/><circle cx="52.6" cy="10" r="1.2" fill="${INK}"/>` },
  // Diamond body, tall spiky first dorsal fin
  triggerfish: { w: 100, h: 80, body:
    `<path d="M26 40 L8 22 Q14 40 8 58Z" fill="#6b8f3e"/>` +
    `<path d="M40 22 L44 2 L52 22Z" fill="#6b8f3e"/><path d="M54 22 Q68 12 80 22Z" fill="#8cb356"/><path d="M38 58 Q56 74 80 58Z" fill="#8cb356"/>` +
    `<path d="M20 40 Q40 14 66 14 Q90 22 96 40 Q90 58 66 66 Q40 66 20 40Z" fill="#a9c76a"/>` +
    `<path d="M30 46 Q56 62 90 46 Q60 56 30 46Z" fill="#e9f0b9"/><path d="M34 30 Q50 22 66 28" fill="none" stroke="#6b8f3e" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M92 40 Q98 42 94 46" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>` + eye(78, 32, 4) },
  // Blunt head with a beak, big scales
  parrotfish: { w: 120, h: 80, body:
    `<path d="M30 42 L8 24 Q14 42 8 60Z" fill="#2f8f86"/>` +
    `<path d="M42 20 Q70 0 96 20Z" fill="#2f8f86"/><path d="M50 62 Q70 78 90 62Z" fill="#e87aa4"/>` +
    `<path d="M26 42 Q34 14 70 14 Q108 18 114 40 Q108 64 70 68 Q34 68 26 42Z" fill="#3bbfb0"/>` +
    `<path d="M30 52 Q70 70 112 50 Q72 60 30 52Z" fill="#e87aa4"/>` +
    `<path d="M104 36 L118 40 L106 50Z" fill="#f4efe0"/>` +
    `<g fill="#2f8f86" opacity=".6"><circle cx="46" cy="36" r="5"/><circle cx="60" cy="42" r="5"/><circle cx="52" cy="50" r="5"/><circle cx="72" cy="34" r="5"/></g>` + eye(92, 30, 4) },
  // Slim body with huge wing-like side fins
  flyingfish: { w: 130, h: 70, body:
    `<path d="M30 36 L8 12 Q14 36 8 60Z" fill="#2c6aa8"/>` +
    `<path d="M64 34 Q56 0 20 2 Q50 22 84 36Z" fill="#8dc2ec"/><path d="M64 38 Q60 64 34 68 Q64 54 84 38Z" fill="#8dc2ec" opacity=".8"/>` +
    `<path d="M26 36 Q50 22 90 24 Q120 26 128 36 Q120 46 90 48 Q50 50 26 36Z" fill="#3f86c9"/>` +
    `<path d="M32 40 Q80 46 124 38 Q80 50 32 40Z" fill="#c7e3f7"/>` + eye(112, 31, 3.6) },
  // Oval body, ripple fin all round, tentacles at the front
  cuttlefish: { w: 130, h: 70, body:
    `<path d="M8 36 Q4 12 36 10 Q80 4 96 20 L96 52 Q80 68 36 62 Q4 60 8 36Z" fill="#a5809a"/>` +
    `<path d="M12 36 Q10 18 36 16 Q76 10 92 24 L92 48 Q76 60 36 56 Q10 54 12 36Z" fill="#c9a3bc"/>` +
    `<path d="M20 30 Q50 18 84 28 Q50 26 20 30Z" fill="#8a6382"/>` +
    `<g fill="none" stroke="#a5809a" stroke-width="5" stroke-linecap="round"><path d="M96 28 Q114 24 128 26"/><path d="M96 33 Q116 32 130 36"/><path d="M96 39 Q114 42 128 48"/><path d="M96 44 Q110 52 122 58"/></g>` +
    `<circle cx="88" cy="34" r="6" fill="#f2e6a0"/><path d="M84 34 Q88 31 92 34 Q88 37 84 34Z" fill="${INK}"/>` },
  // Spiral shell with tentacles
  nautilus: { w: 110, h: 90, body:
    `<g fill="none" stroke="#f0b08a" stroke-width="4" stroke-linecap="round"><path d="M76 56 Q94 60 108 54"/><path d="M76 62 Q94 70 106 68"/><path d="M76 68 Q92 80 100 84"/><path d="M76 50 Q92 48 106 42"/></g>` +
    `<path d="M10 52 Q4 14 44 8 Q84 6 84 50 Q84 78 52 82 Q20 84 10 52Z" fill="#f6ead6"/>` +
    `<path d="M16 50 Q12 20 44 14 Q56 12 64 20 Q40 22 30 50 Q28 72 52 76 Q40 80 28 72 Q16 66 16 50Z" fill="#d97b3a"/>` +
    `<path d="M48 20 Q74 18 78 50 Q66 40 64 58 Q60 38 48 20Z" fill="#e9a468"/>` +
    `<path d="M70 52 Q74 40 90 46 Q90 66 76 66Z" fill="#e9a07a"/>` + eye(82, 52, 3.6) },
  // Very long and wavy, open mouth with teeth
  moray: { w: 230, h: 64, body:
    `<path d="M6 40 Q30 62 62 40 Q94 18 126 38 Q158 58 188 34 Q206 22 222 28 L226 38 Q208 36 196 46 Q166 70 130 52 Q98 34 66 54 Q30 76 6 40Z" fill="#7a7a3a"/>` +
    `<path d="M10 38 Q34 56 62 36 Q94 14 126 34 Q158 54 188 30 Q204 20 220 24" fill="none" stroke="#a5a553" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M186 34 Q206 14 226 22 L224 40 Q206 38 192 46Z" fill="#8c8c46"/>` +
    `<path d="M200 28 L206 36 L210 28 L216 36 L220 28" fill="#f4f1e6"/>` +
    `<circle cx="206" cy="24" r="3.4" fill="#f2e6a0"/><circle cx="206.6" cy="24" r="1.8" fill="${INK}"/>` +
    `<g fill="#5a5a28" opacity=".7"><circle cx="40" cy="48" r="2.4"/><circle cx="100" cy="28" r="2.4"/><circle cx="150" cy="48" r="2.4"/></g>` },
  // Huge round disc with tall fins at the back and no real tail
  sunfish: { w: 140, h: 150, body:
    `<g transform="translate(140 0) scale(-1 1)">`+
    `<path d="M70 20 Q96 0 104 -8 Q112 34 106 52Z" fill="#7d8e9a"/><path d="M70 130 Q96 150 104 158 Q112 116 106 98Z" fill="#7d8e9a"/>` +
    `<path d="M112 28 Q132 40 132 76 Q132 112 112 124 Q100 100 100 76 Q100 52 112 28Z" fill="#8e9fab"/>` +
    `<path d="M8 76 Q8 18 64 14 Q110 14 112 76 Q110 138 64 138 Q8 134 8 76Z" fill="#a9b8c2"/>` +
    `<path d="M16 96 Q40 130 90 124 Q50 128 16 96Z" fill="#e3ebf0"/>` +
    `<path d="M14 80 Q10 84 16 88" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` + eye(30, 56, 5.4)  + `</g>` },
  // Leafy appendages along a long snout and tube body
  seadragon: { w: 170, h: 100, body:
    `<path d="M30 56 Q10 70 18 90 Q28 96 34 82Z" fill="#c9a64a"/>` +
    `<path d="M40 52 Q80 30 126 42 Q142 46 150 40 L168 38 L166 46 L152 48 Q142 58 124 56 Q80 46 44 66Z" fill="#c9a64a"/>` +
    `<g fill="#9acb6a"><path d="M60 46 Q58 28 70 22 Q76 36 68 48Z"/><path d="M84 42 Q86 24 98 20 Q100 34 92 46Z"/><path d="M108 46 Q114 30 126 30 Q124 44 116 50Z"/>` +
    `<path d="M56 62 Q52 80 62 88 Q70 76 66 62Z"/><path d="M84 58 Q82 76 92 82 Q98 70 94 56Z"/><path d="M26 66 Q8 62 6 48 Q22 48 32 60Z"/></g>` +
    `<path d="M120 46 Q132 42 146 44 L148 52 Q132 56 120 54Z" fill="#e0c466"/>` + eye(134, 42, 3.4) },
  // Long, slim, silver, big underbite
  barracuda: { w: 220, h: 56, body:
    `<path d="M44 28 L18 4 Q26 28 18 52Z" fill="#6f8794"/><path d="M92 8 Q106 0 118 8Z M126 50 Q140 56 150 50Z" fill="#6f8794"/>` +
    `<path d="M40 28 Q80 6 150 10 Q196 12 216 26 L220 30 L196 34 Q150 48 90 46 Q56 44 40 28Z" fill="#b6c7d0"/>` +
    `<path d="M44 30 Q100 20 210 26 Q110 14 44 30Z" fill="#5d7684"/><path d="M60 38 Q120 46 200 34 Q130 44 60 38Z" fill="#e8f0f4"/>` +
    `<path d="M196 28 L216 34 L200 38Z" fill="#f4f1e6"/>` + eye(184, 22, 3.4) },
  // Flat diamond with a whip tail, seen from above and slightly tilted
  stingray: { w: 170, h: 100, body:
    `<path d="M40 50 L2 54 L42 56Z" fill="#7a5f3a"/><path d="M2 54 L-6 55 L2 56Z" fill="#7a5f3a"/>` +
    `<path d="M150 50 Q132 26 98 14 Q70 6 48 8 Q64 30 56 46 L44 50 L56 54 Q64 72 48 92 Q70 94 98 86 Q132 74 150 50Z" fill="#b99063"/>` +
    `<path d="M96 24 Q126 38 142 50 Q126 62 96 76 Q112 50 96 24Z" fill="#d4b48a"/>` +
    `<g fill="#8f6c42"><circle cx="76" cy="30" r="3"/><circle cx="84" cy="48" r="3"/><circle cx="76" cy="70" r="3"/><circle cx="104" cy="40" r="2.6"/></g>` +
    `<circle cx="132" cy="40" r="2.6" fill="${INK}"/><circle cx="132" cy="60" r="2.6" fill="${INK}"/>` },
  // Small blue body with orange swirls and spots
  mandarinfish: { w: 100, h: 60, body:
    `<path d="M22 30 Q6 20 4 8 Q8 30 4 52 Q8 42 22 30Z" fill="#f08a2c"/><path d="M36 14 Q50 2 70 12Z" fill="#2a6fc9"/><path d="M40 46 Q54 58 68 46Z" fill="#f08a2c"/>` +
    `<path d="M18 30 Q22 10 52 10 Q88 12 98 30 Q88 50 52 50 Q22 50 18 30Z" fill="#2a6fc9"/>` +
    `<path d="M26 26 Q40 14 52 24 Q62 32 74 20 M30 38 Q46 46 58 36 Q70 28 86 36" fill="none" stroke="#f08a2c" stroke-width="5" stroke-linecap="round"/>` +
    `<g fill="#f5e24a"><circle cx="40" cy="30" r="2.6"/><circle cx="62" cy="40" r="2.6"/></g>` + eye(84, 24, 4) },
  // Torpedo body, gray back, white belly, teeth
  greatwhite: { w: 250, h: 100, body:
    `<path d="M52 50 Q38 36 8 6 Q26 30 28 50 Q26 70 12 94 Q38 68 52 54Z" fill="#5a6c78"/>` +
    `<path d="M112 30 L138 -2 Q146 18 158 32Z" fill="#5a6c78"/><path d="M128 72 L104 98 Q140 92 160 74Z" fill="#5a6c78"/>` +
    `<path d="M50 52 Q86 22 150 24 Q210 26 244 50 Q210 74 150 76 Q86 78 50 52Z" fill="#7d909c"/>` +
    `<path d="M60 56 Q130 80 242 52 Q150 66 60 56Z" fill="#f2f6f8"/>` +
    `<path d="M196 56 L202 64 L208 56 L214 63 L220 56 L226 62 L232 55" fill="#fff"/>` +
    `<circle cx="212" cy="42" r="3.2" fill="${INK}"/>` },
  // White whale: rounded forehead, no dorsal fin, smiling
  beluga: { w: 200, h: 90, body:
    `<path d="M46 46 L6 20 Q10 40 24 46 Q10 54 6 74Z" fill="#cfd8de"/>` +
    `<path d="M104 62 Q112 88 90 86 Q96 74 90 62Z" fill="#cfd8de"/>` +
    `<path d="M44 46 Q70 22 120 24 Q160 22 178 32 Q198 36 196 48 Q196 60 176 64 Q150 76 100 74 Q64 72 44 46Z" fill="#f4f7f9"/>` +
    `<path d="M170 52 Q184 58 194 50" fill="none" stroke="#a9b8c2" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M60 52 Q100 66 150 62 Q100 60 60 52Z" fill="#dfe7ec"/>` + eye(168, 40, 3.2) },
  // Flat shark-like body with a long toothed saw snout
  sawfish: { w: 260, h: 76, body:
    `<path d="M52 36 Q36 28 10 4 Q22 28 22 38 Q22 48 12 70 Q36 48 52 40Z" fill="#7d7a68"/>` +
    `<path d="M92 22 L110 4 Q118 16 126 24Z" fill="#7d7a68"/>` +
    `<path d="M50 38 Q90 20 150 24 Q184 28 200 38 Q184 50 150 54 Q90 58 50 38Z" fill="#a09c86"/>` +
    `<path d="M196 33 L256 36 L196 43Z" fill="#cfcab2"/>` +
    `<g fill="#e8e3cc"><path d="M206 43 L208 52 L212 43Z"/><path d="M218 43 L220 52 L224 43Z"/><path d="M230 43 L232 52 L236 43Z"/><path d="M242 42 L244 50 L248 42Z"/>` +
    `<path d="M206 33 L208 24 L212 33Z"/><path d="M218 34 L220 25 L224 34Z"/><path d="M230 34 L232 25 L236 34Z"/></g>` +
    `<path d="M70 44 Q130 56 190 40 Q130 50 70 44Z" fill="#dcd8c2"/><circle cx="178" cy="33" r="2.8" fill="${INK}"/>` },
  // Round gray swimmer with whiskers and flippers
  seal: { w: 160, h: 80, body:
    `<path d="M32 36 Q12 22 4 30 Q10 40 4 48 Q12 56 32 44Z" fill="#6d6256"/>` +
    `<path d="M30 40 Q36 14 82 12 Q122 10 140 30 Q154 40 150 48 Q146 60 118 64 Q70 72 36 56Z" fill="#8a7d6e"/>` +
    `<path d="M46 52 Q90 66 138 56 Q96 60 46 52Z" fill="#cbbfae"/>` +
    `<path d="M76 54 Q92 74 104 70 Q96 56 90 52Z" fill="#6d6256"/>` +
    `<ellipse cx="148" cy="42" rx="4.4" ry="3.2" fill="${INK}"/>` +
    `<g stroke="#e9e1d4" stroke-width="1.6" stroke-linecap="round"><path d="M142 48 L158 46"/><path d="M142 51 L158 53"/></g>` + eye(128, 34, 4) },
  // Big gentle gray body with a paddle tail
  manatee: { w: 200, h: 90, body:
    `<path d="M40 46 Q10 34 4 18 Q40 12 56 34Z M40 46 Q10 58 4 74 Q40 80 56 58Z" fill="#7e8a92"/>` +
    `<path d="M44 46 Q56 20 104 18 Q150 16 176 32 Q198 42 192 56 Q184 70 150 72 Q96 80 54 62Z" fill="#9aa6ae"/>` +
    `<path d="M96 58 Q116 84 134 78 Q122 62 118 56Z" fill="#7e8a92"/>` +
    `<path d="M168 44 Q186 50 192 44" fill="none" stroke="#6c777f" stroke-width="3" stroke-linecap="round"/>` +
    `<g stroke="#c9d1d6" stroke-width="1.6" stroke-linecap="round"><path d="M184 54 L194 56"/><path d="M182 58 L192 62"/></g>` + eye(166, 36, 3.2) },
  // Swimming penguin, torpedo shape with flipper
  penguin: { w: 110, h: 70, body:
    `<path d="M22 38 L6 30 L8 40 L6 48 L22 42Z" fill="#e8962a"/><path d="M12 36 Q2 34 2 40 Q2 46 12 44Z" fill="#1d2b3a"/>` +
    `<path d="M20 38 Q30 14 62 12 Q90 12 98 30 Q104 40 96 48 Q84 62 56 62 Q26 60 20 38Z" fill="#26323f"/>` +
    `<path d="M30 46 Q60 66 94 46 Q64 54 30 46Z" fill="#f4f6f7"/><path d="M56 56 Q70 54 84 50 Q70 60 56 60Z" fill="#f4f6f7"/>` +
    `<path d="M50 34 Q64 54 90 56 Q70 56 56 46Z" fill="#1d2b3a"/>` +
    `<path d="M94 32 L110 38 L96 44Z" fill="#f08a2c"/>` + eye(84, 30, 3.4) + `<ellipse cx="72" cy="38" rx="9" ry="3.6" fill="#f2d24a" opacity=".8"/>` },
  // Dark body, bumpy head, long white flipper
  humpback: { w: 290, h: 120, body:
    `<path d="M70 58 L18 14 Q22 44 40 58 Q22 72 18 102Z" fill="#2c3b49"/>` +
    `<path d="M142 34 Q154 14 166 20 Q164 30 168 36Z" fill="#2c3b49"/>` +
    `<path d="M70 58 Q100 24 170 26 Q250 26 280 52 Q286 60 278 66 Q250 88 170 90 Q100 92 70 58Z" fill="#3a4d5e"/>` +
    `<path d="M80 62 Q160 96 276 64 Q180 82 80 62Z" fill="#dfe8ee"/>` +
    `<path d="M150 74 Q132 112 168 116 Q168 96 176 80Z" fill="#eef3f6"/>` +
    `<g fill="#566b7d"><circle cx="262" cy="46" r="3"/><circle cx="248" cy="40" r="3"/><circle cx="270" cy="56" r="2.6"/></g>` +
    `<circle cx="244" cy="60" r="3.2" fill="#e7eef2"/><circle cx="245" cy="60" r="1.8" fill="${INK}"/>` },
  // Longest, slimmest, mottled blue-gray
  bluewhale: { w: 330, h: 100, body:
    `<path d="M74 50 L16 8 Q22 36 44 50 Q22 64 16 92Z" fill="#41607a"/>` +
    `<path d="M104 34 Q112 28 118 36 Q116 40 112 42Z" fill="#41607a"/>` +
    `<path d="M70 50 Q110 26 190 26 Q280 26 322 46 Q330 52 322 58 Q280 74 190 74 Q110 76 70 50Z" fill="#5b82a0"/>` +
    `<path d="M80 54 Q180 80 322 56 Q200 66 80 54Z" fill="#b6cbd9"/>` +
    `<path d="M170 64 Q150 90 180 94 Q182 78 190 68Z" fill="#41607a"/>` +
    `<g fill="#7fa2bb"><circle cx="150" cy="38" r="3.4"/><circle cx="190" cy="42" r="3.4"/><circle cx="230" cy="36" r="3.4"/><circle cx="268" cy="44" r="3.4"/></g>` +
    `<circle cx="304" cy="48" r="3" fill="${INK}"/>` },
  // Silver ribbon with a red crest and trailing fins
  oarfish: { w: 330, h: 70, body:
    `<path d="M70 36 Q30 18 4 28 Q30 30 52 40Z" fill="#d9524a"/>` +
    `<path d="M150 20 L158 4 L170 18 L182 2 L194 18 L206 4 L218 18 L230 6 L242 20 L254 8 L262 22 L270 12 L280 26 L260 26Z" fill="#e8574a"/>` +
    `<path d="M76 36 Q130 22 230 24 Q290 26 322 34 Q290 46 230 48 Q130 50 76 36Z" fill="#cfd8de"/>` +
    `<path d="M90 38 Q170 44 300 36 Q170 38 90 38Z" fill="#9fb0bb"/>` +
    `<path d="M262 44 Q256 62 250 68 M276 44 Q272 60 268 66" fill="none" stroke="#e8574a" stroke-width="3.4" stroke-linecap="round"/>` + eye(300, 30, 4) },
};
