/** All tunable numbers and the species list live here, so they can be adjusted in one place. */

export type SpeciesId = "minnows" | "butterflyfish" | "pufferfish" | "seahorse" | "jellyfish" | "turtle" | "manta" | "whaleshark";
export type Rarity = "Common" | "Uncommon" | "Rare" | "Very rare" | "Legendary";

export type Species = {
  id: SpeciesId;
  name: string;
  rarity: Rarity;
  /** Banked calm time in seconds at the Standard setting. */
  at: number;
  fact: string;
};

export const SPECIES: readonly Species[] = [
  { id: "minnows", name: "School of minnows", rarity: "Common", at: 30,
    fact: "Many small fish swim in schools, which makes it harder for a predator to pick out just one." },
  { id: "butterflyfish", name: "Butterflyfish", rarity: "Common", at: 120,
    fact: "Many butterflyfish live on coral reefs and are often seen swimming in pairs." },
  { id: "pufferfish", name: "Pufferfish", rarity: "Uncommon", at: 300,
    fact: "A pufferfish puffs up by gulping water, which makes it hard for a predator to swallow." },
  { id: "seahorse", name: "Seahorse", rarity: "Rare", at: 600,
    fact: "Male seahorses carry the babies until they are ready to be born." },
  { id: "jellyfish", name: "Jellyfish", rarity: "Rare", at: 900,
    fact: "Jellyfish have no brain, no heart, and no bones." },
  { id: "turtle", name: "Sea turtle", rarity: "Very rare", at: 1500,
    fact: "Sea turtles often return to the area where they hatched to lay their own eggs." },
  { id: "manta", name: "Manta ray", rarity: "Very rare", at: 2400,
    fact: "Manta rays are among the largest rays in the ocean, and they eat tiny plankton." },
  { id: "whaleshark", name: "Whale shark", rarity: "Legendary", at: 3600,
    fact: "The whale shark is the largest fish in the sea, and it eats tiny plankton." },
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
