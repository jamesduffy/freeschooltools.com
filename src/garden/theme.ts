/** Theme config. A new theme (Tree, Vegetable) is another entry here plus its art, with no change to the growth code. */
import type { Milestone } from "./growth";
import type { ThemeId } from "./model";

export type ThemeConfig = {
  id: ThemeId;
  name: string;
  description: string;
  creatures: readonly (Milestone & { label: string; noun: string })[];
  bonus: readonly number[];
};

/** Creatures in the order they arrive. The first four are the original set (20, 45, 65 and 85 percent); the rest fill in between.
 *  Whether each is out by day or at night is in kinds.ts. */
export const FLOWERS: ThemeConfig = {
  id: "flowers",
  name: "Flowers",
  description: "A sunny meadow of flowers that open by day, and ones that open at night.",
  creatures: [
    { kind: "firefly", percent: 10, count: 3, label: "Three fireflies arrived", noun: "fireflies" },
    { kind: "caterpillar", percent: 12, count: 1, label: "A caterpillar arrived", noun: "caterpillar" },
    { kind: "ladybug", percent: 20, count: 2, label: "Two ladybugs arrived", noun: "ladybugs" },
    { kind: "snail", percent: 24, count: 1, label: "A snail arrived", noun: "snail" },
    { kind: "moth", percent: 28, count: 2, label: "Two moths arrived", noun: "moths" },
    { kind: "robin", percent: 32, count: 1, label: "A robin arrived", noun: "robin" },
    { kind: "dragonfly", percent: 36, count: 1, label: "A dragonfly arrived", noun: "dragonfly" },
    { kind: "frog", percent: 40, count: 1, label: "A frog arrived", noun: "frog" },
    { kind: "butterfly", percent: 45, count: 2, label: "Two butterflies arrived", noun: "butterflies" },
    { kind: "hedgehog", percent: 50, count: 1, label: "A hedgehog arrived", noun: "hedgehog" },
    { kind: "rabbit", percent: 55, count: 1, label: "A rabbit arrived", noun: "rabbit" },
    { kind: "bee", percent: 65, count: 2, label: "Two bees arrived", noun: "bees" },
    { kind: "bat", percent: 70, count: 2, label: "Two bats arrived", noun: "bats" },
    { kind: "bluebird", percent: 75, count: 1, label: "A bluebird arrived", noun: "bluebird" },
    { kind: "owl", percent: 80, count: 1, label: "An owl arrived", noun: "owl" },
    { kind: "hummingbird", percent: 85, count: 1, label: "A hummingbird arrived", noun: "hummingbird" },
  ],
  bonus: [110, 125, 150],
};

export const THEMES: Record<ThemeId, ThemeConfig> = { flowers: FLOWERS };
export const themeList = (): ThemeConfig[] => Object.values(THEMES);
export const themeFor = (id: string): ThemeConfig => (THEMES as Record<string, ThemeConfig>)[id] ?? FLOWERS;
