/** The small shared pieces of the garden art, kept apart so the art files can import them without a cycle. */
import { paletteHex } from "../shared/palette";

export const ID = (name: string) => `cg-${name}`;

const LIME = paletteHex("lime");
export const COLORS = {
  stem: "#4F9A52", leaf: LIME, leafDark: "#5BA84F", pinkDark: "#E57FB2", coralDark: "#E0695B", violetDark: "#9575D6",
  brown: "#7A4A2B", brownDark: "#5E3A22", seed: "#A8703F", ink: "#27303B", red: "#D8483B",
};

