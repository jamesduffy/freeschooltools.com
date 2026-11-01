import { h, s } from "../shared/dom";
import { paletteHex } from "../shared/palette";
import { defaultColorFor, iconById, spriteMarkup } from "./icons";
import { dayLayout } from "./layout";
import { firstThenStage, formatTime, isKnownIcon, type Card, type Schedule, type Settings } from "./model";

/** Put the icon sprite in the page once. Every icon is a `<symbol>` defined here and reused with `<use>`. */
export function installSprite(): void {
  if (document.querySelector("svg.sprite")) return;
  const doc = new DOMParser().parseFromString(spriteMarkup(), "image/svg+xml");
  document.body.prepend(document.importNode(doc.documentElement, true));
}

/** The picture for a card: a built in icon, an emoji, or nothing. Always decorative: the label sits beside it. */
export function iconEl(icon: string | undefined, size: number): HTMLElement | SVGElement | null {
  if (!icon) return null;
  if (isKnownIcon(icon)) {
    const svg = s("svg", { class: "ic", width: size, height: size, viewBox: "0 0 64 64", "aria-hidden": "true", focusable: "false" }, s("use", { href: `#si-${icon}` }));
    return svg;
  }
  return h("span", { class: "ic emoji", "aria-hidden": "true" }, icon);
}
export const iconName = (icon: string | undefined): string => (icon ? iconById(icon)?.name ?? `Emoji ${icon}` : "No picture");

export const cardColor = (c: Card): string => paletteHex(c.color ?? defaultColorFor(c.icon));
export const cardLabel = (c: Card): string => c.name.trim() || "Untitled";

const checkSvg = () => s("svg", { class: "check", viewBox: "0 0 24 24", "aria-hidden": "true" }, s("path", { d: "M4.5 12.5 L10 18 L20 6", fill: "none", stroke: "currentColor", "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" }));
const arrowSvg = () => s("svg", { class: "ft-arrow", viewBox: "0 0 64 64", "aria-hidden": "true" }, s("path", { d: "M8 32h40M34 16l18 16-18 16", fill: "none", stroke: "currentColor", "stroke-width": 8, "stroke-linecap": "round", "stroke-linejoin": "round" }));

export type BoardOpts = {
  schedule: Schedule;
  index: number;
  settings: Settings;
  now: Date;
  /** Present when cards can be tapped to make them current. */
  onPick?: (i: number) => void;
};

function cardEl(c: Card, o: BoardOpts, i: number, kind: "done" | "now" | "next" | "later" | "small", tag: string | null, star = false): HTMLElement {
  const { settings, onPick } = o;
  const label = cardLabel(c);
  const inner: (Node | string | null)[] = [
    iconEl(c.icon, 96),
    h("span", { class: "sc-text" },
      tag ? h("span", { class: `sc-tag${kind === "now" ? " on" : ""}` }, tag) : null,
      h("span", { class: "sc-label" }, label)),
    settings.showTimes && c.startTime ? h("span", { class: "sc-time" }, formatTime(c.startTime)) : null,
    kind === "done" || kind === "small" ? h("span", { class: "sc-done" }, star ? iconEl("star", 40) : checkSvg(), h("span", { class: "sr-only" }, "Done")) : null,
  ];
  const cls = `sc ${kind}`;
  const style = `--c:${cardColor(c)}`;
  if (onPick) {
    return h("li", { class: cls, style, "data-i": i, ...(kind === "now" ? { "aria-current": "step" } : {}) },
      h("button", { type: "button", class: "sc-btn", onclick: () => onPick(i), title: `Make "${label}" the current card` }, ...inner));
  }
  return h("li", { class: cls, style, "data-i": i, ...(kind === "now" ? { "aria-current": "step" } : {}) }, h("div", { class: "sc-btn" }, ...inner));
}

/** The whole board for one moment in time. Pure view: no state of its own. */
export function boardEl(o: BoardOpts): HTMLElement {
  const { schedule: sch, index, settings, now } = o;
  const root = h("div", { class: `board${settings.highContrast ? " hc" : ""}`, "data-mode": sch.mode });
  const top = h("div", { class: "board-top" }, h("p", { class: "board-title" }, sch.name),
    settings.showClock ? h("p", { class: "board-clock" }, formatTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`)) : null);
  let main: HTMLElement;
  if (sch.mode === "firstThen") {
    const [a, b] = sch.activities;
    const stage = firstThenStage(index);
    const list = h("ol", { class: `ft ft-${stage}` });
    if (a && b) {
      if (stage === "first") list.append(cardEl(a, o, 0, "now", "First"), h("li", { class: "ft-gap", "aria-hidden": "true" }, arrowSvg()), cardEl(b, o, 1, "later", "Then"));
      else if (stage === "then") list.append(cardEl(a, o, 0, "small", "First", true), h("li", { class: "ft-gap", "aria-hidden": "true" }, arrowSvg()), cardEl(b, o, 1, "now", "Now"));
      else list.append(cardEl(a, o, 0, "small", "First", true), cardEl(b, o, 1, "small", "Then", true),
        h("li", { class: "sc now alldone", "aria-current": "step", style: `--c:${paletteHex("sun")}` }, h("div", { class: "sc-btn" }, iconEl("star", 96), h("span", { class: "sc-text" }, h("span", { class: "sc-label" }, "All done")))));
    }
    main = h("div", { class: "board-main" }, list);
  } else {
    const list = h("ol", { class: "day" });
    sch.activities.forEach((c, i) => {
      const kind = i < index ? "done" : i === index ? "now" : i === index + 1 ? "next" : "later";
      list.append(cardEl(c, o, i, kind, kind === "now" ? "Now" : kind === "next" ? "Next" : null));
    });
    main = h("div", { class: "board-main" }, list);
  }
  root.append(top, main);
  return root;
}

/** Size the Whole day cards to the space available, then keep the Now card in view. */
export function fitBoard(root: HTMLElement, scrollToNow = true): void {
  const main = root.querySelector<HTMLElement>(".board-main");
  if (!main || root.dataset.mode !== "day") return;
  const list = main.querySelector<HTMLElement>("ol.day");
  if (!list) return;
  const cs = getComputedStyle(main);
  const avail = main.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const n = list.children.length;
  const l = dayLayout(n, avail);
  const set = (k: string, v: number) => root.style.setProperty(k, `${v}px`);
  set("--gap", l.gap); set("--pad", l.pad); set("--now-pad", l.nowPad); set("--icon", l.icon); set("--label", l.label); set("--now-icon", l.nowIcon); set("--now-label", l.nowLabel);
  root.classList.toggle("scrolls", !l.fits);
  if (scrollToNow && !l.fits) {
    const now = list.querySelector<HTMLElement>(".now");
    if (now) main.scrollTop = Math.max(0, now.offsetTop - list.offsetTop - (main.clientHeight - now.offsetHeight) / 2);
  } else main.scrollTop = 0;
}

// ---- print --------------------------------------------------------------------------------
export type PrintKind = "wall" | "desk";

export function printEl(sch: Schedule, settings: Settings, kind: PrintKind): HTMLElement {
  const n = sch.activities.length;
  const tagFor = (i: number) => (sch.mode === "firstThen" ? (i === 0 ? "First" : "Then") : null);
  const size = sch.mode === "firstThen" ? "ft" : n <= 4 ? "xl" : n <= 7 ? "l" : n <= 9 ? "m" : "s";
  const items = sch.activities.map((c, i) => {
    const tag = tagFor(i);
    const time = settings.showTimes && c.startTime ? h("span", { class: "p-time" }, formatTime(c.startTime)) : null;
    const body = [iconEl(c.icon, 96), h("span", { class: "p-text" }, tag ? h("span", { class: "p-tag" }, tag) : null, h("span", { class: "p-label" }, cardLabel(c)), time)];
    if (kind === "desk") return h("li", { class: "p-card" }, h("div", { class: "p-face" }, ...body), h("span", { class: "p-box" }, h("span", { class: "sr-only" }, "Done")));
    return h("li", { class: "p-card" }, h("div", { class: "p-face" }, ...body));
  });
  const cols = Math.min(6, n > 6 ? Math.ceil(n / 2) : Math.max(1, n));
  const root = h("div", { id: "print-root", class: `print-${kind}`, "data-size": size, style: `--cols:${cols}` },
    h("h1", { class: "p-title" }, sch.name),
    h("ol", { class: "p-list" }, ...items));
  return root;
}
