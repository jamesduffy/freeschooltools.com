import type { FishId } from "./art";
import type { FloorKind } from "./sim";

/** Every kind of fish and sand creature, with how big it is and how often it turns up. */
export type Spec = { id: FishId; width: number; count: number; weight: number; upright?: boolean; school?: boolean };
// How often each kind turns up. Rarer kinds are picked less often, so they take longer to show up.
const COMMON = 10, UNCOMMON = 7, RARE = 4, VERY_RARE = 2, LEGENDARY = 1.2;
// width is a fraction of the shorter screen side, so fish are a sensible size on a phone or a tablet
export const ROSTER: Spec[] = [
  { id: "minnows", width: 0.1, count: 4, weight: COMMON, school: true },
  { id: "tetra", width: 0.085, count: 4, weight: COMMON, school: true },
  { id: "butterflyfish", width: 0.2, count: 1, weight: COMMON }, { id: "angelfish", width: 0.16, count: 1, weight: COMMON }, { id: "boxfish", width: 0.16, count: 1, weight: COMMON },
  { id: "pufferfish", width: 0.18, count: 1, weight: UNCOMMON }, { id: "lionfish", width: 0.22, count: 1, weight: UNCOMMON }, { id: "squid", width: 0.3, count: 1, weight: UNCOMMON },
  { id: "seahorse", width: 0.11, count: 1, weight: RARE, upright: true }, { id: "jellyfish", width: 0.15, count: 1, weight: RARE, upright: true },
  { id: "octopus", width: 0.18, count: 1, weight: RARE, upright: true }, { id: "anglerfish", width: 0.22, count: 1, weight: RARE },
  { id: "turtle", width: 0.3, count: 1, weight: VERY_RARE }, { id: "dolphin", width: 0.38, count: 1, weight: VERY_RARE }, { id: "swordfish", width: 0.42, count: 1, weight: VERY_RARE },
  { id: "hammerhead", width: 0.42, count: 1, weight: VERY_RARE }, { id: "manta", width: 0.42, count: 1, weight: VERY_RARE },
  { id: "orca", width: 0.5, count: 1, weight: LEGENDARY }, { id: "whaleshark", width: 0.5, count: 1, weight: LEGENDARY },
  // more kinds (common)
  { id: "guppy", width: 0.1, count: 1, weight: COMMON }, { id: "chromis", width: 0.1, count: 1, weight: COMMON }, { id: "goby", width: 0.09, count: 1, weight: COMMON },
  { id: "wrasse", width: 0.17, count: 1, weight: COMMON }, { id: "sardines", width: 0.08, count: 6, weight: COMMON, school: true },
  // uncommon
  { id: "triggerfish", width: 0.18, count: 1, weight: UNCOMMON }, { id: "parrotfish", width: 0.24, count: 1, weight: UNCOMMON }, { id: "flyingfish", width: 0.24, count: 1, weight: UNCOMMON },
  { id: "cuttlefish", width: 0.22, count: 1, weight: UNCOMMON }, { id: "nautilus", width: 0.18, count: 1, weight: UNCOMMON },
  // rare
  { id: "moray", width: 0.42, count: 1, weight: RARE }, { id: "sunfish", width: 0.3, count: 1, weight: RARE }, { id: "seadragon", width: 0.26, count: 1, weight: RARE },
  { id: "barracuda", width: 0.42, count: 1, weight: RARE }, { id: "stingray", width: 0.32, count: 1, weight: RARE }, { id: "mandarinfish", width: 0.14, count: 1, weight: RARE },
  // very rare
  { id: "greatwhite", width: 0.5, count: 1, weight: VERY_RARE }, { id: "beluga", width: 0.45, count: 1, weight: VERY_RARE }, { id: "sawfish", width: 0.5, count: 1, weight: VERY_RARE },
  { id: "seal", width: 0.28, count: 1, weight: VERY_RARE }, { id: "manatee", width: 0.34, count: 1, weight: VERY_RARE }, { id: "penguin", width: 0.16, count: 1, weight: VERY_RARE },
  // legendary
  { id: "humpback", width: 0.55, count: 1, weight: LEGENDARY }, { id: "bluewhale", width: 0.6, count: 1, weight: LEGENDARY }, { id: "oarfish", width: 0.6, count: 1, weight: LEGENDARY },
];
export const FLOOR: { kind: FloorKind; width: number; walk: number; run: number; weight: number }[] = [
  { kind: "crab", width: 0.2, walk: 0.1, run: 4, weight: 15 },
  { kind: "starfish", width: 0.13, walk: 0.035, run: 3, weight: 15 },
  { kind: "hermit", width: 0.16, walk: 0.045, run: 3, weight: 15 },
];
