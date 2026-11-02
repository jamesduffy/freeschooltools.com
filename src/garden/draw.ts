import { s } from "../shared/dom";
import { ID } from "./art-base";

/** A standalone picture of one flower or creature, for the guide. It points at the shared symbols already on the page. */
export function drawEntry(id: string): SVGElement {
  const [group, kind] = id.split(":") as ["flower" | "creature", string];
  const name = group === "flower" ? `${kind}-bloom` : kind;
  const svg = s("svg", { viewBox: group === "flower" ? "-64 -70 128 134" : "-60 -50 120 100", "aria-hidden": "true", focusable: "false", style: "display:block;width:100%;height:100%;overflow:visible" });
  svg.append(s("use", { href: `#${ID(name)}` }));
  // fit the picture to what is drawn, when the browser can measure it
  try {
    const b = (document.getElementById(ID(name)) as unknown as SVGGraphicsElement | null)?.getBBox();
    if (b && b.width > 0 && b.height > 0) { const pad = Math.max(b.width, b.height) * 0.08; svg.setAttribute("viewBox", `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`); }
  } catch { /* keep the default frame */ }
  return svg;
}
