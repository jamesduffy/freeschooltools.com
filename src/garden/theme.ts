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

export const FLOWERS: ThemeConfig = {
  id: "flowers",
  name: "Flowers",
  description: "A sunny meadow of daisies, sunflowers, tulips and bluebells.",
  creatures: [
    { kind: "ladybug", percent: 20, count: 2, label: "Two ladybugs arrived", noun: "ladybugs" },
    { kind: "butterfly", percent: 45, count: 2, label: "Two butterflies arrived", noun: "butterflies" },
    { kind: "bee", percent: 65, count: 2, label: "Two bees arrived", noun: "bees" },
    { kind: "hummingbird", percent: 85, count: 1, label: "A hummingbird arrived", noun: "hummingbird" },
  ],
  bonus: [110, 125, 150],
};

export const THEMES: Record<ThemeId, ThemeConfig> = { flowers: FLOWERS };
export const themeList = (): ThemeConfig[] => Object.values(THEMES);
export const themeFor = (id: string): ThemeConfig => (THEMES as Record<string, ThemeConfig>)[id] ?? FLOWERS;
