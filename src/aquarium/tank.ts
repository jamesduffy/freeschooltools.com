import { h } from "../shared/dom";
import { bubbles, fishSvg, sceneryBack, sceneryFront, spriteSheet, ART } from "./art";
import { SPECIES, type SpeciesId } from "./config";
import type { Phase } from "../shared/daynight";
import { GLOWS, INFO } from "../fishtank/species-info";

/** One swimmer. Sizes are in vw so the tank scales with the screen. */
type Fish = {
  species: SpeciesId;
  /** Width in vw. */
  w: number;
  /** Vertical position as a percent of tank height (top of fish). */
  y: number;
  /** Seconds to cross the tank one way. Big fish are slow, small fish are faster. */
  d: number;
  /** Bobbing height in vh and bob period in seconds. */
  bob: number;
  bobT: number;
  /** Tilt in degrees for gliding fish. */
  tilt?: number;
  /** Starting phase 0..1 for restored fish (new arrivals always start from the left edge). */
  phase: number;
  /** Optional small swim range in vw instead of crossing the whole tank. */
  range?: [number, number];
  kind?: "swim" | "jelly";
};

const MINNOW_OFFSETS: [number, number][] = [[0, 0], [-4.2, -1.2], [-3.4, 2.2], [-7.4, 0.4], [-6.6, -2.6], [-9.8, 1.6]];

/** Where and how each kind swims. The 8 original kinds first, then the newer ones. */
export const FISH: Record<SpeciesId, Fish[]> = {
  minnows: [{ species: "minnows", w: 3.4, y: 14, d: 38, bob: 1.2, bobT: 6, phase: 0.1 }],
  butterflyfish: [
    { species: "butterflyfish", w: 6.4, y: 27, d: 62, bob: 1.8, bobT: 8, phase: 0.55 },
    { species: "butterflyfish", w: 5.8, y: 31, d: 62, bob: 1.6, bobT: 8.6, phase: 0.5 },
  ],
  pufferfish: [{ species: "pufferfish", w: 7, y: 46, d: 84, bob: 1.8, bobT: 9, phase: 0.8 }],
  seahorse: [{ species: "seahorse", w: 4.2, y: 52, d: 46, bob: 2.4, bobT: 11, phase: 0.3, range: [16, 28] }],
  jellyfish: [{ species: "jellyfish", w: 7, y: 8, d: 30, bob: 0, bobT: 0, phase: 0.2, kind: "jelly" }],
  turtle: [{ species: "turtle", w: 12, y: 40, d: 110, bob: 9, bobT: 31, tilt: 4, phase: 0.45 }],
  manta: [{ species: "manta", w: 17, y: 52, d: 96, bob: 9, bobT: 37, tilt: 5, phase: 0.7 }],
  whaleshark: [{ species: "whaleshark", w: 24, y: 66, d: 150, bob: 2, bobT: 40, phase: 0.2 }],
  guppy: [{ species: "guppy", w: 3.8, y: 20, d: 49, bob: 1.4, bobT: 8, phase: 0.05 }],
  chromis: [{ species: "chromis", w: 3.8, y: 36, d: 49, bob: 1.4, bobT: 11, phase: 0.19 }],
  goby: [{ species: "goby", w: 3.4, y: 76, d: 47, bob: 1.4, bobT: 14, phase: 0.32 }],
  wrasse: [{ species: "wrasse", w: 6.5, y: 58, d: 62, bob: 1.4, bobT: 8, phase: 0.46 }],
  angelfish: [{ species: "angelfish", w: 6.1, y: 44, d: 60, bob: 1.4, bobT: 11, phase: 0.6 }],
  triggerfish: [{ species: "triggerfish", w: 6.8, y: 50, d: 64, bob: 1.4, bobT: 14, phase: 0.74 }],
  squid: [{ species: "squid", w: 11.4, y: 24, d: 87, bob: 2.5, bobT: 8, phase: 0.87 }],
  parrotfish: [{ species: "parrotfish", w: 9.1, y: 64, d: 76, bob: 2.5, bobT: 11, phase: 0.01 }],
  lionfish: [{ species: "lionfish", w: 8.4, y: 60, d: 72, bob: 2.5, bobT: 14, phase: 0.15 }],
  cuttlefish: [{ species: "cuttlefish", w: 8.4, y: 68, d: 72, bob: 2.5, bobT: 8, phase: 0.28 }],
  nautilus: [{ species: "nautilus", w: 6.8, y: 56, d: 64, bob: 1.4, bobT: 11, phase: 0.42 }],
  octopus: [{ species: "octopus", w: 6.8, y: 72, d: 64, bob: 1.4, bobT: 14, phase: 0.56 }],
  anglerfish: [{ species: "anglerfish", w: 8.4, y: 78, d: 72, bob: 2.5, bobT: 8, phase: 0.69 }],
  moray: [{ species: "moray", w: 16.0, y: 82, d: 110, bob: 5, bobT: 11, phase: 0.83 }],
  seadragon: [{ species: "seadragon", w: 9.9, y: 40, d: 80, bob: 2.5, bobT: 14, phase: 0.97 }],
  mandarinfish: [{ species: "mandarinfish", w: 5.3, y: 73, d: 56, bob: 1.4, bobT: 8, phase: 0.1 }],
  dolphin: [{ species: "dolphin", w: 14.4, y: 18, d: 102, bob: 5, bobT: 11, phase: 0.24, tilt: 3 }],
  hammerhead: [{ species: "hammerhead", w: 16.0, y: 32, d: 110, bob: 5, bobT: 14, phase: 0.38, tilt: 3 }],
  swordfish: [{ species: "swordfish", w: 16.0, y: 26, d: 110, bob: 5, bobT: 8, phase: 0.52, tilt: 3 }],
  greatwhite: [{ species: "greatwhite", w: 19.0, y: 58, d: 125, bob: 5, bobT: 11, phase: 0.65, tilt: 3 }],
  orca: [{ species: "orca", w: 19.0, y: 44, d: 125, bob: 5, bobT: 14, phase: 0.79, tilt: 3 }],
  humpback: [{ species: "humpback", w: 20.9, y: 12, d: 134, bob: 5, bobT: 8, phase: 0.93, tilt: 3 }],
  oarfish: [{ species: "oarfish", w: 22.8, y: 47, d: 144, bob: 5, bobT: 11, phase: 0.06 }],
};

const fishIn = (list: Fish[]) => list.reduce((m, f) => m + (f.species === "minnows" ? MINNOW_OFFSETS.length : 1), 0);

/** Animals that sleep through the other half of the day: a day animal rests from dusk until dawn, a night animal from dawn until dusk.
 *  So dusk counts with the night and dawn with the day, and the tank is never more crowded than at midday. */
export function isResting(species: string, phase: Phase): boolean {
  const active = INFO[species]?.active ?? "both";
  const dark = phase === "dusk" || phase === "night";
  return (active === "day" && dark) || (active === "night" && !dark);
}

/** Fish drawn when every species has arrived, counting resting ones. */
export const TOTAL_FISH = Object.values(FISH).reduce((n, list) => n + fishIn(list), 0);

/** Fish out and swimming at once, in the busiest part of the day, when every species has arrived. Must stay under 30. */
export function visibleFishCount(phase: Phase): number {
  return SPECIES.reduce((n, sp) => n + (isResting(sp.id, phase) ? 0 : fishIn(FISH[sp.id] ?? [])), 0);
}
export const MAX_FISH = Math.max(...(["day", "dusk", "night", "dawn"] as const).map(visibleFishCount));

const FPS = 30;

export class Tank {
  readonly el: HTMLElement;
  private fishLayer = h("div", { class: "aq-fish-layer" });
  private shown = 0;
  private sizers: HTMLElement[] = [];
  private grow = 0.6;
  private phase: Phase = "day";

  constructor() {
    this.el = h("div", { class: "aq-tank", "aria-hidden": "true" }, spriteSheet(), sceneryBack(), bubbles(), this.fishLayer, sceneryFront());
  }

  get fishCount(): number { return this.fishLayer.querySelectorAll(".aq-f-size svg").length; }

  /** Show the first n species. Species already in the tank are left alone. Only newly added ones swim in from the side. */
  show(n: number, restore: boolean): void {
    for (let i = this.shown; i < Math.min(n, SPECIES.length); i++) {
      const sp = SPECIES[i];
      if (!sp) continue;
      for (const f of FISH[sp.id] ?? []) this.fishLayer.append(this.build(f, restore));
    }
    this.shown = Math.max(this.shown, Math.min(n, SPECIES.length));
    this.setScale(this.grow);
  }

  /** Day animals rest at night and night animals by day. They fade out and back in, a few at a time. */
  setPhase(phase: Phase): void {
    this.phase = phase;
    for (const el of this.fishLayer.querySelectorAll<HTMLElement>(".aq-fish")) {
      const id = el.dataset.species ?? "";
      el.style.setProperty("--rest-delay", `${(Math.random() * 25).toFixed(1)}s`);
      el.classList.toggle("aq-rest", isResting(id, phase));
    }
  }

  clear(): void {
    this.fishLayer.replaceChildren(); this.sizers = []; this.shown = 0;
  }

  /** Scale between 0.6 and 1 for every fish. Smoothed by a CSS transition. */
  setScale(scale: number): void {
    this.grow = scale;
    for (const el of this.sizers) el.style.setProperty("--grow", scale.toFixed(3));
  }

  private build(f: Fish, restore: boolean): HTMLElement {
    const d2 = f.d * 2;
    const delay = restore ? -(f.phase * d2) : 0;
    const art = ART[f.species]!;
    const sizeH = (f.w * art.h) / art.w; // in vw
    const style = [`--d:${f.d}s`, `--d2:${d2}s`, `--steps:${Math.round(f.d * FPS)}`, `--w:${f.w}vw`, `top:${f.y}%`, `--delay:${delay}s`,
      `--bob:${f.bob}vh`, `--bobT:${f.bobT}s`, `--tilt:${f.tilt ?? 0}deg`, `--hh:${sizeH}vw`];
    if (f.range) style.push(`--x0:${f.range[0]}vw`, `--x1:${f.range[1]}vw`);
    const species = f.species;

    const size = (inner: Node) => {
      const el = h("div", { class: "aq-f-size", style: `width:${f.w}vw` }, inner);
      this.sizers.push(el);
      return el;
    };

    if (species === "minnows") {
      const school = h("div", { class: "aq-school" });
      MINNOW_OFFSETS.forEach(([dx, dy], i) => {
        school.append(h("div", { class: "aq-minnow", style: `left:${dx * 1}vw;top:${dy}vh;animation-delay:${-i * 0.7}s;animation-duration:${3.6 + (i % 3) * 0.7}s` },
          fishSvg("minnows")));
      });
      const sz = size(school);
      sz.classList.add("aq-school-size");
      return this.wrap(f, style, sz, restore);
    }
    const svg = fishSvg(species, species === "jellyfish" ? "aq-pulse" : "");
    return this.wrap(f, style, size(svg), restore);
  }

  private wrap(f: Fish, style: string[], sizer: HTMLElement, restore: boolean): HTMLElement {
    const turn = h("div", { class: "aq-f-turn" }, sizer);
    const bob = h("div", { class: "aq-f-bob" }, turn);
    const kind = f.kind ?? "swim";
    const cls = ["aq-fish", `aq-${kind}`, `aq-sp-${f.species}`, f.range ? "aq-ranged" : "", restore ? "" : "aq-arriving", f.tilt ? "aq-tilt" : "",
      GLOWS.has(f.species) ? "aq-glow" : "", isResting(f.species, this.phase) ? "aq-rest" : ""].filter(Boolean).join(" ");
    return h("div", { class: cls, style: style.join(";"), "data-species": f.species }, bob);
  }
}
