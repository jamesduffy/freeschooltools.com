import { h, s } from "../shared/dom";

let n = 0;
export const nextId = (p = "t") => `${p}${++n}`;

type IconKind = "warn" | "check" | "play" | "pause" | "next" | "plus" | "minus" | "reset" | "full" | "gear" | "back" | "eye";
export function icon(kind: IconKind, size = 20): SVGElement {
  const st = { fill: "none", stroke: "currentColor", "stroke-width": 2.4, "stroke-linecap": "round", "stroke-linejoin": "round" } as const;
  const p: Record<IconKind, SVGElement[]> = {
    warn: [s("path", { d: "M12 3 L22 20 H2 Z", ...st }), s("path", { d: "M12 10v5M12 17.5v1", ...st })],
    check: [s("path", { d: "M5 12.5 L10 17.5 L19 7", ...st, "stroke-width": 3 })],
    play: [s("path", { d: "M7 4 L20 12 L7 20 Z", fill: "currentColor", stroke: "currentColor", "stroke-width": 1.5, "stroke-linejoin": "round" })],
    pause: [s("path", { d: "M8 5v14M16 5v14", ...st, "stroke-width": 3.4 })],
    next: [s("path", { d: "M5 5 L15 12 L5 19 Z", fill: "currentColor", stroke: "currentColor", "stroke-linejoin": "round" }), s("path", { d: "M19 5v14", ...st })],
    plus: [s("path", { d: "M12 5v14M5 12h14", ...st })],
    minus: [s("path", { d: "M5 12h14", ...st })],
    reset: [s("path", { d: "M4 12a8 8 0 1 0 3-6.2M4 4v5h5", ...st })],
    full: [s("path", { d: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5", ...st })],
    gear: [s("circle", { cx: 12, cy: 12, r: 3, ...st }), s("path", { d: "M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1", ...st })],
    back: [s("path", { d: "M10 6 L4 12 L10 18M4 12h16", ...st })],
    eye: [s("path", { d: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z", ...st }), s("circle", { cx: 12, cy: 12, r: 3, ...st })],
  };
  return s("svg", { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": "true", class: "icon" }, ...p[kind]);
}

export function field(label: string, input: HTMLElement, cls = ""): HTMLElement {
  if (!input.id) input.id = nextId();
  return h("div", { class: `field ${cls}` }, h("label", { for: input.id }, label), input);
}

export function button(text: string | (Node | string)[], onclick: () => void, cls = "", attrs: Record<string, string> = {}): HTMLButtonElement {
  return h("button", { type: "button", class: `btn ${cls}`.trim(), onclick, ...attrs }, ...(Array.isArray(text) ? text : [text]));
}

/** A switch (checkbox with a visible label). */
export function toggle(label: string, checked: boolean, onchange: (v: boolean) => void): { el: HTMLElement; input: HTMLInputElement } {
  const input = h("input", { type: "checkbox", role: "switch", ...(checked ? { checked: true } : {}) });
  input.addEventListener("change", () => onchange(input.checked));
  return { el: h("label", { class: "check" }, input, label), input };
}
