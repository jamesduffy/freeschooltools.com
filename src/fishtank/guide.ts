import type { GuideEntry } from "../shared/guide";
import { FLOOR, ROSTER } from "./roster";
import { INFO, rarityLabel } from "./species-info";

/** The Fish Tank's guide entries: every fish and sand creature, with facts from species-info. */
export type Entry = GuideEntry & { kind: "fish" | "floor" };

export function buildEntries(): Entry[] {
  const mk = (id: string, kind: "fish" | "floor", weight: number): Entry => {
    const f = INFO[id]!;
    return { id, kind, order: weight, rarity: rarityLabel(weight), name: f.name, sci: f.sci, text: f.text, active: f.active,
      facts: [["Size", f.size], ["Lives in", f.habitat], ["Eats", f.diet]] };
  };
  return [...ROSTER.map((r) => mk(r.id, "fish", r.weight)), ...FLOOR.map((f) => mk(f.kind, "floor", f.weight))]
    .sort((a, b) => b.order - a.order || a.name.localeCompare(b.name));
}
