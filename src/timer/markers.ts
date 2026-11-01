import { s } from "../shared/dom";
import type { Settings } from "./model";

const INK = "#1B2430";
const line = { stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round" } as const;

/** Four original markers, each drawn about 60 units wide, centered on 0,0. The rocket and snail face right (the direction of travel at 12 o'clock). */
export function markerArt(kind: Settings["marker"]): SVGElement {
  switch (kind) {
    case "rocket":
      return s("g", {},
        s("path", { d: "M-14 -9 L-27 -20 L-22 0 L-27 20 L-14 9 Z", fill: "#E8554A", ...line }),
        s("path", { d: "M-20 -4 L-30 0 L-20 4 Z", fill: "#FFB020", ...line, "stroke-width": 1.5 }),
        s("path", { d: "M-17 -11 C-3 -15 14 -10 29 0 C14 10 -3 15 -17 11 Z", fill: "#FFFFFF", ...line }),
        s("circle", { cx: 5, cy: 0, r: 6, fill: "#6EC3F0", ...line }));
    case "snail":
      return s("g", {},
        s("path", { d: "M-26 14 C-26 6 -12 6 6 6 L22 6 C28 6 28 14 22 14 Z", fill: "#F5C38A", ...line }),
        s("path", { d: "M20 6 L22 -8 M26 8 L32 -4", fill: "none", ...line }),
        s("circle", { cx: 22, cy: -10, r: 3, fill: INK }),
        s("circle", { cx: 32, cy: -6, r: 3, fill: INK }),
        s("circle", { cx: -6, cy: -2, r: 16, fill: "#B493EA", ...line }),
        s("path", { d: "M-6 -2 m0 0 a4 4 0 1 1 5 4 a9 9 0 1 1 -12 -9", fill: "none", ...line, "stroke-width": 2 }));
    case "balloon":
      return s("g", {},
        s("path", { d: "M0 22 C-6 28 6 32 0 38", fill: "none", ...line, "stroke-width": 2 }),
        s("path", { d: "M-3 21 L3 21 L0 17 Z", fill: "#E8554A", ...line, "stroke-width": 2 }),
        s("ellipse", { cx: 0, cy: 0, rx: 17, ry: 21, fill: "#E8554A", ...line }),
        s("path", { d: "M-9 -9 C-8 -14 -4 -16 0 -16", fill: "none", stroke: "#fff", "stroke-width": 3, "stroke-linecap": "round" }));
    case "sun": {
      const rays: SVGElement[] = [];
      for (let i = 0; i < 8; i++) {
        const t = (i * Math.PI) / 4;
        rays.push(s("path", { d: `M${(Math.cos(t) * 19).toFixed(1)} ${(Math.sin(t) * 19).toFixed(1)} L${(Math.cos(t) * 28).toFixed(1)} ${(Math.sin(t) * 28).toFixed(1)}`, fill: "none", ...line }));
      }
      return s("g", {}, ...rays,
        s("circle", { cx: 0, cy: 0, r: 15, fill: "#FFD23F", ...line }),
        s("circle", { cx: -5, cy: -3, r: 2, fill: INK }), s("circle", { cx: 5, cy: -3, r: 2, fill: INK }),
        s("path", { d: "M-6 4 Q0 10 6 4", fill: "none", ...line, "stroke-width": 2 }));
    }
  }
}

/** Does this marker turn to face the way it travels? */
export const turnsToTravel = (kind: Settings["marker"]): boolean => kind === "rocket" || kind === "snail";
