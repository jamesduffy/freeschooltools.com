import { h, s } from "./dom";

export function logo(): SVGElement {
  return s("svg", { width: 28, height: 28, viewBox: "0 0 28 28", "aria-hidden": "true" },
    s("rect", { x: 1, y: 1, width: 26, height: 26, rx: 6, fill: "#0b6466" }),
    s("path", { d: "M6 20 L11 15 L15 17 L22 8", fill: "none", stroke: "#fff", "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" }));
}

export function banner(text: string): HTMLElement {
  return h("div", { class: "banner", role: "note" }, text);
}

export function footerText(): string {
  return `Build ${__BUILD_DATE__} · No accounts, no tracking, nothing leaves this computer.`;
}
