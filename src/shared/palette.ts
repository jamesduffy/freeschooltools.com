/** The shared pastel palette. Saved data stores the id, never the hex. Dark text (#1B2430) on every swatch passes contrast. */
export const PALETTE = [
  { id: "coral", name: "Coral", hex: "#F28B7D" },
  { id: "orange", name: "Orange", hex: "#F5A55B" },
  { id: "sun", name: "Sunshine", hex: "#F7D154" },
  { id: "lime", name: "Lime", hex: "#B5DB6A" },
  { id: "mint", name: "Mint", hex: "#6FD1A8" },
  { id: "sky", name: "Sky", hex: "#6EC3F0" },
  { id: "blue", name: "Blue", hex: "#8CA6F2" },
  { id: "violet", name: "Violet", hex: "#B493EA" },
  { id: "pink", name: "Pink", hex: "#F29BC7" },
  { id: "slate", name: "Slate", hex: "#A9B7C6" },
] as const;
export type PaletteId = (typeof PALETTE)[number]["id"];
export const PALETTE_TEXT = "#1B2430";
export const paletteHex = (id: string | undefined): string => PALETTE.find((p) => p.id === id)?.hex ?? "#A9B7C6";
export const isPaletteId = (id: unknown): id is PaletteId => PALETTE.some((p) => p.id === id);
