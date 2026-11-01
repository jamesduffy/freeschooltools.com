import { s } from "../shared/dom";
import { paletteHex, PALETTE_TEXT } from "../shared/palette";
import { angleAt, computeArcs, CX, CY, LABEL_FONT, labelPlan, polar, POP, R_MID, sectorPath, type Arc } from "./geometry";
import { markerArt, turnsToTravel } from "./markers";
import { locate, type Settings, type Slice } from "./model";

export const prefersReducedMotion = (): boolean => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};

const FREE_BASE = "#CBD3DC";
let ringCount = 0;

type Parts = { g: SVGElement; path: SVGElement; over: SVGElement; label: SVGElement };

/** The SVG ring. Slices are built once and then only their geometry changes, so animations are not restarted. */
export function createRing() {
  const uid = ++ringCount;
  const dots = `dots${uid}`, hatch = `hatch${uid}`;
  const sliceLayer = s("g", {});
  const markerMove = s("g", { class: "marker", style: "display:none" });
  const markerPulse = s("g", { class: "marker-pulse" });
  markerMove.append(markerPulse);
  const fx = s("g", { class: "fx", "aria-hidden": "true" });
  const svg = s("svg", { viewBox: "0 0 600 600", class: "ring", role: "img" },
    s("defs", {},
      s("pattern", { id: dots, width: 9, height: 9, patternUnits: "userSpaceOnUse" },
        s("rect", { width: 9, height: 9, fill: "#ffffff", opacity: 0.62 }), s("circle", { cx: 4.5, cy: 4.5, r: 1.9, fill: PALETTE_TEXT, opacity: 0.5 })),
      s("pattern", { id: hatch, width: 12, height: 12, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" },
        s("rect", { width: 12, height: 12, fill: FREE_BASE }), s("rect", { width: 3, height: 12, fill: "#6b7686" }))),
    sliceLayer, markerMove, fx);

  let slices: Slice[] = [];
  let sig = "";
  let parts: Parts[] = [];
  let arcs: Arc[] = [];
  let elapsed: number | null = null;
  let marker: Settings["marker"] = "rocket";
  let curIndex = -1;
  let lastKey = "";
  let tween = 0;

  function build() {
    sliceLayer.replaceChildren();
    parts = slices.map((sl) => {
      const fill = sl.free ? `url(#${hatch})` : paletteHex(sl.color);
      const path = s("path", { class: "slice-shape", fill });
      const over = s("path", { class: "slice-passed", fill: `url(#${dots})` });
      const label = s("text", { class: "slice-label", "text-anchor": "middle", "dominant-baseline": "central", "font-size": LABEL_FONT, fill: PALETTE_TEXT });
      const g = s("g", { class: "slice" }, path, over, label);
      sliceLayer.append(g);
      return { g, path, over, label };
    });
    curIndex = -1;
  }

  function layout() {
    slices.forEach((sl, i) => {
      const p = parts[i], a = arcs[i];
      if (!p || !a) return;
      p.path.setAttribute("d", sectorPath(a.start, a.end));
      const mid = (a.start + a.end) / 2;
      const lp = labelPlan(a.end - a.start, sl.name, !!sl.icon);
      if (lp === "none") p.label.setAttribute("display", "none");
      else {
        const pos = polar(mid, R_MID);
        const rot = mid > 90 && mid <= 270 ? mid + 180 : mid;
        p.label.removeAttribute("display");
        p.label.setAttribute("transform", `translate(${pos.x.toFixed(1)} ${pos.y.toFixed(1)}) rotate(${rot.toFixed(1)})`);
        p.label.textContent = lp === "icon" ? (sl.icon ?? "") : `${sl.icon ? sl.icon + " " : ""}${sl.name}`;
      }
      const t = polar(mid, POP), dx = t.x - CX, dy = t.y - CY;
      p.g.setAttribute("style", `--tx:${dx.toFixed(2)}px;--ty:${dy.toFixed(2)}px`);
    });
    lastKey = "";
    progress();
  }

  function progress() {
    const loc = elapsed === null ? null : locate(slices, elapsed);
    const idx = loc && !loc.done ? loc.index : -1;
    const ang = elapsed === null ? 0 : angleAt(arcs, slices, elapsed);
    const key = `${idx}|${loc?.done ? "d" : ""}|${Math.round(ang * 40)}|${marker}`;
    if (key === lastKey) return;
    lastKey = key;
    slices.forEach((sl, i) => {
      const p = parts[i], a = arcs[i];
      if (!p || !a) return;
      let frac = 0;
      if (loc) frac = loc.done || i < loc.index ? 1 : i === loc.index ? (sl.seconds > 0 ? loc.into / sl.seconds : 0) : 0;
      p.over.setAttribute("d", frac > 0 ? sectorPath(a.start, a.start + frac * (a.end - a.start)) : "");
      const cur = i === idx;
      p.g.classList.toggle("current", cur);
      if (cur && curIndex !== idx) sliceLayer.append(p.g); // paint the popped slice on top of its neighbours
    });
    if (idx !== curIndex) curIndex = idx;
    if (elapsed === null) { markerMove.setAttribute("style", "display:none"); return; }
    const pos = polar(ang, R_MID);
    markerMove.removeAttribute("style");
    markerMove.setAttribute("transform", `translate(${pos.x.toFixed(1)} ${pos.y.toFixed(1)})${turnsToTravel(marker) ? ` rotate(${(ang).toFixed(1)})` : ""}`);
  }

  function setMarker(kind: Settings["marker"]) {
    marker = kind;
    markerPulse.replaceChildren(markerArt(kind));
    lastKey = "";
    progress();
  }
  setMarker("rocket");

  return {
    svg,
    setMarker,
    /** Show these slices. When only the lengths changed and `animate` is true, glide to the new angles. */
    setSlices(next: Slice[], animate = false) {
      const nextSig = next.map((x) => `${x.id}|${x.name}|${x.color}|${x.icon ?? ""}`).join("~");
      const newArcs = computeArcs(next.map((x) => x.seconds));
      window.cancelAnimationFrame(tween);
      const from = arcs;
      slices = next;
      if (nextSig !== sig) { sig = nextSig; build(); arcs = newArcs; layout(); return; }
      if (!animate || prefersReducedMotion() || from.length !== newArcs.length) { arcs = newArcs; layout(); return; }
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / 400), e = 1 - (1 - k) * (1 - k);
        arcs = newArcs.map((a, i) => { const f = from[i] ?? a; return { start: f.start + (a.start - f.start) * e, end: f.end + (a.end - f.end) * e }; });
        layout();
        if (k < 1) tween = window.requestAnimationFrame(step);
      };
      tween = window.requestAnimationFrame(step);
    },
    /** Seconds into the plan, or null for the plain preview with no progress and no marker. */
    setElapsed(sec: number | null) { elapsed = sec; progress(); },
    setPulse(on: boolean) { markerPulse.classList.toggle("pulse", on && !prefersReducedMotion()); },
    /** Short bounce when a slice starts. */
    bounce(index: number) {
      const g = parts[index]?.g;
      if (!g || prefersReducedMotion()) return;
      g.classList.remove("bounce");
      void (g as unknown as HTMLElement).getBoundingClientRect();
      g.classList.add("bounce");
      g.addEventListener("animationend", () => g.classList.remove("bounce"), { once: true });
    },
    /** A small burst of stars where one slice meets the next. */
    burst(angle: number) {
      if (prefersReducedMotion()) return;
      const pos = polar(angle, R_MID);
      const grp = s("g", { transform: `translate(${pos.x.toFixed(1)} ${pos.y.toFixed(1)})` });
      for (let i = 0; i < 8; i++) {
        const t = (i / 8) * Math.PI * 2, d = 46 + (i % 2) * 18;
        const star = s("polygon", { class: "star", points: "0,-9 2.6,-3 9,-2.8 4,1.6 5.6,8 0,4.6 -5.6,8 -4,1.6 -9,-2.8 -2.6,-3", fill: "#FFD23F", stroke: PALETTE_TEXT, "stroke-width": 1.2 });
        star.setAttribute("style", `--dx:${(Math.cos(t) * d).toFixed(1)}px;--dy:${(Math.sin(t) * d).toFixed(1)}px`);
        grp.append(star);
      }
      fx.append(grp);
      window.setTimeout(() => grp.remove(), 1100);
    },
    arcs: () => arcs,
  };
}
export type Ring = ReturnType<typeof createRing>;
