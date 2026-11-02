import { h, s } from "./dom";
import type { Active } from "./daynight";

/** A species guide: a grid of every kind, and a page for each one with previous and next.
 *  It knows nothing about any one tool; each tool hands it a list of entries and a way to draw them. */
export type GuideEntry = {
  id: string;
  rarity: string; // for example "Common" or "Legendary"
  order: number; // bigger sorts earlier (most common first)
  name: string;
  sci: string; // scientific or family name, shown in italics under the name
  text: string;
  facts: [label: string, value: string][];
  active?: Active; // when it is out and about, if that matters in this tool
};

const ACTIVE_TEXT: Record<Active, string> = { day: "Out by day", night: "Out at night", both: "Out day and night" };

export function guideIcon(kind: "sun" | "moon" | "both" | "close" | "back" | "prev" | "next" | "book", size = 20): SVGElement {
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

const activeIcon = (a: Active, size: number) => guideIcon(a === "day" ? "sun" : a === "night" ? "moon" : "both", size);
export function activeBadge(active: Active): HTMLElement {
  return h("span", { class: `gd-badge gd-${active}` }, activeIcon(active, 18), ACTIVE_TEXT[active]);
}

export type Guide = { open(id?: string): void; close(): void; isOpen(): boolean; button(): HTMLButtonElement };

/** `title` names the guide ("Species guide", "Garden guide"). `draw` makes a fresh picture of one entry. */
export function createGuide(host: HTMLElement, entries: GuideEntry[] | (() => GuideEntry[]), draw: (e: GuideEntry) => Node, opts: { title?: string; noun?: string; subtitle?: (count: number) => string } = {}): Guide {
  const title = opts.title ?? "Species guide";
  const noun = opts.noun ?? "animals";
  const load = () => [...(typeof entries === "function" ? entries() : entries)].sort((a, b) => b.order - a.order || a.name.localeCompare(b.name));
  let list: GuideEntry[] = load(); // read again each time the guide opens, for tools where the list grows
  const body = h("div", { class: "gd-body" });
  const root = h("div", { class: "gd", role: "dialog", "aria-modal": "true", "aria-label": title, hidden: true }, body);
  host.append(root);
  let current: number | null = null; // index of the entry shown, or null for the grid
  let returnFocus: HTMLElement | null = null;
  let isOpen = false;

  const closeBtn = () => h("button", { type: "button", class: "gd-icon-btn", "aria-label": "Close the guide", onclick: () => close() }, guideIcon("close"));

  function grid() {
    current = null;
    const cards = h("div", { class: "gd-grid" });
    list.forEach((e, i) => {
      cards.append(h("button", { type: "button", class: "gd-card", onclick: () => detail(i), "aria-label": `${e.name}, ${e.rarity}` },
        h("div", { class: "gd-thumb" }, draw(e)),
        h("div", { class: "gd-card-name" }, e.name),
        h("div", { class: "gd-card-meta" }, e.rarity, e.active ? " · " : "", e.active ? activeIcon(e.active, 14) : null)));
    });
    body.replaceChildren(
      h("div", { class: "gd-top" }, h("h1", { class: "gd-title", tabindex: "-1" }, title), closeBtn()),
      h("p", { class: "gd-sub" }, opts.subtitle ? opts.subtitle(list.length) : `${list.length} kinds of ${noun}. Tap one to learn about it.`),
      cards);
    (body.querySelector(".gd-title") as HTMLElement).focus({ preventScroll: true });
  }

  function detail(i: number) {
    const n = list.length;
    i = ((i % n) + n) % n;
    current = i;
    const e = list[i]!;
    body.replaceChildren(
      h("div", { class: "gd-top" },
        h("button", { type: "button", class: "gd-icon-btn", "aria-label": `Back to all ${noun}`, onclick: () => grid() }, guideIcon("back")),
        h("span", { class: "gd-crumb" }, title), closeBtn()),
      h("h1", { class: "gd-name", tabindex: "-1" }, e.name),
      h("div", { class: "gd-sci" }, e.sci),
      h("div", { class: "gd-badges" }, h("span", { class: "gd-badge gd-rarity" }, e.rarity), e.active ? activeBadge(e.active) : null),
      h("p", { class: "gd-text" }, e.text),
      h("div", { class: "gd-stage" },
        h("button", { type: "button", class: "gd-arrow", "aria-label": "Previous", onclick: () => detail(i - 1) }, guideIcon("prev", 32)),
        h("div", { class: "gd-picture" }, draw(e)),
        h("button", { type: "button", class: "gd-arrow", "aria-label": "Next", onclick: () => detail(i + 1) }, guideIcon("next", 32))),
      h("div", { class: "gd-count", "aria-live": "polite" }, `${i + 1} / ${n}`),
      h("dl", { class: "gd-facts" }, ...e.facts.map(([k, v]) => h("div", { class: "gd-fact" }, h("dt", {}, k), h("dd", {}, v)))));
    (body.querySelector(".gd-name") as HTMLElement).focus({ preventScroll: true });
    body.scrollTop = 0;
  }

  function open(id?: string) {
    if (isOpen && id === undefined) return;
    if (!isOpen) { returnFocus = document.activeElement as HTMLElement | null; list = load(); }
    isOpen = true;
    root.hidden = false;
    const i = id ? list.findIndex((e) => e.id === id) : -1;
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

  const button = h("button", { type: "button", class: "gd-open", "aria-label": `Open the ${title.toLowerCase()}`, onclick: () => open() }, guideIcon("book", 22), h("span", {}, "Guide"));
  return { open, close, isOpen: () => isOpen, button: () => button };
}
