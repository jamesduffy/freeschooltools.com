/** All tunable numbers and the species list live here, so they can be adjusted in one place. */

import { INFO } from "../fishtank/species-info";

/** Kinds of fish. The first 8 were the original set; the rest share their drawings and facts with the Fish Tank. */
export type SpeciesId = string;
export type Rarity = "Common" | "Uncommon" | "Rare" | "Very rare" | "Legendary";

export type Species = {
  id: SpeciesId;
  name: string;
  rarity: Rarity;
  /** Banked calm time in seconds at the Standard setting. */
  at: number;
  fact: string;
};

/** The first sentence of a species page, used as the short fact on the "new visitor" card. */
const firstSentence = (t: string) => (t.match(/^.*?[.!?](\s|$)/)?.[0] ?? t).trim();
const kind = (id: string, rarity: Rarity, at: number): Species => {
  const f = INFO[id]!;
  return { id, name: f.name, rarity, at, fact: firstSentence(f.text) };
};

/** In order of calm time. The engine counts how many have arrived, so this list must stay sorted by `at`.
 *  Bands at Standard length: Common under 5 minutes, Uncommon 5 to 10, Rare 10 to 25, Very rare 25 to 60, Legendary 60 and up. */
export const SPECIES: readonly Species[] = [
  { id: "minnows", name: "School of minnows", rarity: "Common", at: 30,
    fact: "Many small fish swim in schools, which makes it harder for a predator to pick out just one." },
  kind("guppy", "Common", 60),
  kind("chromis", "Common", 90),
  { id: "butterflyfish", name: "Butterflyfish", rarity: "Common", at: 120,
    fact: "Many butterflyfish live on coral reefs and are often seen swimming in pairs." },
  kind("goby", "Common", 165),
  kind("wrasse", "Common", 210),
  kind("angelfish", "Common", 255),
  { id: "pufferfish", name: "Pufferfish", rarity: "Uncommon", at: 300,
    fact: "A pufferfish puffs up by gulping water, which makes it hard for a predator to swallow." },
  kind("triggerfish", "Uncommon", 345),
  kind("squid", "Uncommon", 390),
  kind("parrotfish", "Uncommon", 435),
  kind("lionfish", "Uncommon", 480),
  kind("cuttlefish", "Uncommon", 525),
  kind("nautilus", "Uncommon", 570),
  { id: "seahorse", name: "Seahorse", rarity: "Rare", at: 600,
    fact: "Male seahorses carry the babies until they are ready to be born." },
  kind("octopus", "Rare", 720),
  { id: "jellyfish", name: "Jellyfish", rarity: "Rare", at: 900,
    fact: "Jellyfish have no brain, no heart, and no bones." },
  kind("anglerfish", "Rare", 1020),
  kind("moray", "Rare", 1140),
  kind("seadragon", "Rare", 1260),
  kind("mandarinfish", "Rare", 1380),
  { id: "turtle", name: "Sea turtle", rarity: "Very rare", at: 1500,
    fact: "Sea turtles often return to the area where they hatched to lay their own eggs." },
  kind("dolphin", "Very rare", 1800),
  kind("hammerhead", "Very rare", 2100),
  { id: "manta", name: "Manta ray", rarity: "Very rare", at: 2400,
    fact: "Manta rays are among the largest rays in the ocean, and they eat tiny plankton." },
  kind("swordfish", "Very rare", 2700),
  kind("greatwhite", "Very rare", 3000),
  { id: "whaleshark", name: "Whale shark", rarity: "Legendary", at: 3600,
    fact: "The whale shark is the largest fish in the sea, and it eats tiny plankton." },
  kind("orca", "Legendary", 4500),
  kind("humpback", "Legendary", 5400),
  kind("oarfish", "Legendary", 6600),
];

export type SessionLength = "short" | "standard" | "long";
export const SESSION_MULTIPLIER: Record<SessionLength, number> = { short: 0.5, standard: 1, long: 2 };
export const SESSION_LABEL: Record<SessionLength, string> = { short: "Short", standard: "Standard", long: "Long" };

/** Sound detection. */
export const SOUND = {
  fftSize: 2048,
  readIntervalMs: 100,
  minDb: -100,
  riseMs: 150,
  fallMs: 1000,
  calibrationMs: 5000,
  graceMs: 400,
  calmAfterMs: 2000,
  offsetMinDb: 6,
  offsetMaxDb: 18,
  offsetDefaultDb: 12,
} as const;

/** Growth engine. */
export const ENGINE = {
  calmDelaySeconds: 2,
  drainAfterSeconds: 5,
  drainRate: 2,
  minScale: 0.6,
} as const;

export function milestone(index: number, multiplier: number): number {
  const sp = SPECIES[index];
  return sp ? sp.at * multiplier : Infinity;
}

export function formatClock(totalSeconds: number): string {
  const t = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(t / 60), s = t % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** "10 minutes" style text for the collection and fact copy. */
export function minutesText(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  const m = Math.round(seconds / 60);
  return m === 1 ? "1 minute" : `${m} minutes`;
}
