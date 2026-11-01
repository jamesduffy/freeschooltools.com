import { h, s } from "../shared/dom";
import type { Status } from "./deadlines";

let uid = 0;
export const nextId = (p = "f") => `${p}${++uid}`;

/** A labeled text-like input. Every input gets a visible label. */
export function field(label: string, input: HTMLElement, opts: { hint?: string; cls?: string } = {}): HTMLElement {
  if (!input.id) input.id = nextId();
  const kids: (Node | string)[] = [h("label", { for: input.id }, label), input];
  if (opts.hint) {
    const hid = nextId("hint");
    input.setAttribute("aria-describedby", hid);
    kids.splice(1, 0, h("div", { class: "hint", id: hid }, opts.hint));
  }
  return h("div", { class: `field ${opts.cls ?? ""}` }, ...kids);
}

export const textInput = (value = "", attrs: Record<string, string> = {}) => h("input", { type: "text", value, autocomplete: "off", ...attrs });
export const dateInput = (value = "", attrs: Record<string, string> = {}) => h("input", { type: "date", value, ...attrs });

export function icon(kind: "warn" | "clock" | "ok" | "print" | "check", size = 20): SVGElement {
  const p: Record<string, SVGElement[]> = {
    warn: [s("path", { d: "M12 3 L22 20 H2 Z", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linejoin": "round" }), s("path", { d: "M12 10v5M12 17.5v1", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round" })],
    clock: [s("circle", { cx: 12, cy: 12, r: 9, fill: "none", stroke: "currentColor", "stroke-width": 2 }), s("path", { d: "M12 7v5l3 2", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round" })],
    ok: [s("rect", { x: 3, y: 5, width: 18, height: 16, rx: 2, fill: "none", stroke: "currentColor", "stroke-width": 2 }), s("path", { d: "M3 10h18M8 3v4M16 3v4", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round" })],
    check: [s("path", { d: "M5 12.5 L10 17.5 L19 7", fill: "none", stroke: "currentColor", "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" })],
    print: [s("path", { d: "M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linejoin": "round" })],
  };
  return s("svg", { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": "true", class: "icon" }, ...p[kind]!);
}

/** Status is always a word plus an icon, never color alone. */
export function statusBadge(st: Status): HTMLElement {
  const kind = st === "Overdue" ? "warn" : st === "Due within 30 days" ? "clock" : "ok";
  const cls = st === "Overdue" ? "bad" : st === "Due within 30 days" ? "soon" : "fine";
  return h("span", { class: `status ${cls}` }, icon(kind, 18), st);
}

export function message(text: string, kind: "error" | "info" = "error"): HTMLElement {
  return h("div", { class: `msg ${kind}`, role: kind === "error" ? "alert" : "status" }, text);
}

export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number): (...a: A) => void {
  let t: number | undefined;
  return (...a: A) => { window.clearTimeout(t); t = window.setTimeout(() => fn(...a), ms); };
}

export function emptyState(text: string): HTMLElement {
  return h("p", { class: "empty" }, text);
}

export function navigate(hash: string): void { location.hash = hash; }
