import { h, s } from "../shared/dom";
import type { Active } from "./daynight";
import { FLOOR, ROSTER } from "./roster";
import { INFO, rarityLabel, type Info } from "./species-info";

/** The species guide: a grid of every kind, and a page for each one with previous and next. */
export type Entry = { id: string; kind: "fish" | "floor"; weight: number; info: Info };

export function buildEntries(): Entry[] {
  const out: Entry[] = [
    ...ROSTER.map((r) => ({ id: r.id as string, kind: "fish" as const, weight: r.weight, info: INFO[r.id]! })),
    ...FLOOR.map((f) => ({ id: f.kind as string, kind: "floor" as const, weight: f.weight, info: INFO[f.kind]! })),
  ];
  // most common first, then alphabetical
  return out.sort((a, b) => b.weight - a.weight || a.info.name.localeCompare(b.info.name));
}

const ACTIVE_TEXT: Record<Active, string> = { day: "Out by day", night: "Out at night", both: "Out day and night" };

function icon(kind: "sun" | "moon" | "both" | "close" | "back" | "prev" | "next" | "book", size = 20): SVGElement {
  const stroke = { fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" };
  const sun = (cx: number) => [
    s("circle", { cx, cy: 12, r: 4, ...stroke }),
    ...[0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r = (a * Math.PI) / 180; return s("path", { d: `M${(cx + Math.cos(r) * 6.5).toFixed(1)} ${(12 + Math.sin(r) * 6.5).toFixed(1)} L${(cx + Math.cos(r) * 8.5).toFixed(1)} ${(12 + Math.sin(r) * 8.5).toFixed(1)}`, ...stroke }); }),
  ];
  const parts: Record<string, SVGElement[]> = {
    sun: sun(12),
    moon: [s("path", { d: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z", ...stroke })],
    both: [s("circle", { cx: 12, cy: 12, r: 8, ...stroke }), s("path", { d: "M12 4a8 8 0 0 1 0 16Z", fill: "currentColor", stroke: "currentColor", "stroke-width": 2 })],
    close: [s("path", { d: "M6 6l12 12M18 6L6 18", ...stroke, "stroke-width": 2.6 })],
    back: [s("path", { d: "M15 5l-7 7 7 7", ...stroke, "stroke-width": 2.6 })],
    prev: [s("path", { d: "M15 4l-8 8 8 8Z", fill: "currentColor", stroke: "currentColor", "stroke-width": 2, "stroke-linejoin": "round" })],
    next: [s("path", { d: "M9 4l8 8-8 8Z", fill: "currentColor", stroke: "currentColor", "stroke-width": 2, "stroke-linejoin": "round" })],
    book: [s("path", { d: "M4 5.5C4 4.7 4.7 4 5.5 4H12v15H5.5C4.7 19 4 18.3 4 17.5Z M20 5.5C20 4.7 19.3 4 18.5 4H12v15h6.5c.8 0 1.5-.7 1.5-1.5Z", ...stroke })],
  };
  return s("svg", { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" }, ...parts[kind]!);
}
export { icon as guideIcon };

export function activeBadge(active: Active): HTMLElement {
  return h("span", { class: `gd-badge gd-${active}` }, icon(active === "day" ? "sun" : active === "night" ? "moon" : "both", 18), ACTIVE_TEXT[active]);
}
const rarityBadge = (weight: number) => h("span", { class: "gd-badge gd-rarity" }, rarityLabel(weight));

export type Guide = { open(id?: string): void; close(): void; isOpen(): boolean; button(): HTMLButtonElement };

/** `draw` makes a fresh picture of a kind (the tank knows how to draw both fish and sand creatures). */
export function createGuide(host: HTMLElement, draw: (e: Entry) => Node): Guide {
  const entries = buildEntries();
  const body = h("div", { class: "gd-body" });
  const root = h("div", { class: "gd", role: "dialog", "aria-modal": "true", "aria-label": "Species guide", hidden: true }, body);
  host.append(root);
  let current: number | null = null; // index of the entry shown, or null for the grid
  let returnFocus: HTMLElement | null = null;
  let isOpen = false;

  const closeBtn = () => h("button", { type: "button", class: "gd-icon-btn", "aria-label": "Close the guide", onclick: () => close() }, icon("close"));

  function grid() {
    current = null;
    const list = h("div", { class: "gd-grid" });
    entries.forEach((e, i) => {
      list.append(h("button", { type: "button", class: "gd-card", onclick: () => detail(i), "aria-label": `${e.info.name}, ${rarityLabel(e.weight)}` },
        h("div", { class: "gd-thumb" }, draw(e)),
        h("div", { class: "gd-card-name" }, e.info.name),
        h("div", { class: "gd-card-meta" }, rarityLabel(e.weight), " · ", icon(e.info.active === "day" ? "sun" : e.info.active === "night" ? "moon" : "both", 14))));
    });
    body.replaceChildren(
      h("div", { class: "gd-top" }, h("h1", { class: "gd-title", tabindex: "-1" }, "Species guide"), closeBtn()),
      h("p", { class: "gd-sub" }, `${entries.length} kinds of animals live in this tank. Tap one to learn about it.`),
      list);
    (body.querySelector(".gd-title") as HTMLElement).focus({ preventScroll: true });
  }

  function detail(i: number) {
    const n = entries.length;
    i = ((i % n) + n) % n;
    current = i;
    const e = entries[i]!, f = e.info;
    const fact = (k: string, v: string) => h("div", { class: "gd-fact" }, h("dt", {}, k), h("dd", {}, v));
    body.replaceChildren(
      h("div", { class: "gd-top" },
        h("button", { type: "button", class: "gd-icon-btn", "aria-label": "Back to all species", onclick: () => grid() }, icon("back")),
        h("span", { class: "gd-crumb" }, "Species guide"), closeBtn()),
      h("h1", { class: "gd-name", tabindex: "-1" }, f.name),
      h("div", { class: "gd-sci" }, f.sci),
      h("div", { class: "gd-badges" }, rarityBadge(e.weight), activeBadge(f.active)),
      h("p", { class: "gd-text" }, f.text),
      h("div", { class: "gd-stage" },
        h("button", { type: "button", class: "gd-arrow", "aria-label": "Previous animal", onclick: () => detail(i - 1) }, icon("prev", 32)),
        h("div", { class: "gd-picture" }, draw(e)),
        h("button", { type: "button", class: "gd-arrow", "aria-label": "Next animal", onclick: () => detail(i + 1) }, icon("next", 32))),
      h("div", { class: "gd-count", "aria-live": "polite" }, `${i + 1} / ${n}`),
      h("dl", { class: "gd-facts" }, fact("Size", f.size), fact("Lives in", f.habitat), fact("Eats", f.diet)));
    (body.querySelector(".gd-name") as HTMLElement).focus({ preventScroll: true });
    body.scrollTop = 0;
  }

  function open(id?: string) {
    if (isOpen && id === undefined) return;
    if (!isOpen) returnFocus = document.activeElement as HTMLElement | null;
    isOpen = true;
    root.hidden = false;
    const i = id ? entries.findIndex((e) => e.id === id) : -1;
    if (i >= 0) detail(i); else grid();
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    root.hidden = true;
    body.replaceChildren();
    returnFocus?.focus?.({ preventScroll: true });
  }

  document.addEventListener("keydown", (ev) => {
    if (!isOpen) return;
    if (ev.key === "Escape") { ev.preventDefault(); close(); }
    else if (current !== null && ev.key === "ArrowRight") { ev.preventDefault(); detail(current + 1); }
    else if (current !== null && ev.key === "ArrowLeft") { ev.preventDefault(); detail(current - 1); }
  });

  const button = h("button", { type: "button", class: "gd-open", "aria-label": "Open the species guide", onclick: () => open() }, icon("book", 22), h("span", {}, "Guide"));
  return { open, close, isOpen: () => isOpen, button: () => button };
}
