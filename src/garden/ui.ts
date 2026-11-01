import { h, s } from "../shared/dom";
import type { FieldErrors } from "./model";

let uid = 0;
export const nextId = (p = "f") => `${p}${++uid}`;

/** A labelled input with an optional hint and an error line. Every input gets a visible label. */
export function field(label: string, input: HTMLElement, opts: { hint?: string } = {}): { el: HTMLElement; setError(msg: string | undefined): void } {
  if (!input.id) input.id = nextId();
  const err = h("p", { class: "err", id: nextId("err"), hidden: true });
  const described: string[] = [];
  const kids: (Node | string)[] = [h("label", { for: input.id }, label)];
  if (opts.hint) { const hid = nextId("hint"); described.push(hid); kids.push(h("div", { class: "hint", id: hid }, opts.hint)); }
  kids.push(input, err);
  if (described.length) input.setAttribute("aria-describedby", described.join(" "));
  return {
    el: h("div", { class: "field" }, ...kids),
    setError(msg) {
      err.hidden = !msg; err.textContent = msg ?? "";
      if (msg) { input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", [...described, err.id].join(" ")); }
      else { input.removeAttribute("aria-invalid"); if (described.length) input.setAttribute("aria-describedby", described.join(" ")); else input.removeAttribute("aria-describedby"); }
    },
  };
}

export const showErrors = (fields: Record<keyof FieldErrors, { setError(m: string | undefined): void }>, errors: FieldErrors | undefined): void => {
  (["name", "unit", "goal"] as const).forEach((k) => fields[k].setError(errors?.[k]));
};

export function message(text: string, kind: "error" | "info" = "error"): HTMLElement {
  return h("div", { class: `msg ${kind}`, role: kind === "error" ? "alert" : "status" }, text);
}

export function icon(kind: "check" | "warn"): SVGElement {
  const d = kind === "check" ? "M5 12.5 L10 17.5 L19 7" : "M12 3 L22 20 H2 Z M12 10v5M12 17.5v1";
  return s("svg", { width: 18, height: 18, viewBox: "0 0 24 24", "aria-hidden": "true", class: "icon" },
    s("path", { d, fill: "none", stroke: "currentColor", "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" }));
}

export const dialogOpen = (): boolean => !!document.querySelector("dialog[open]");

/** A modal dialog (the native <dialog> element, so Escape and focus handling come built in). Resolves null if dismissed. */
export function modal<T>(title: string, build: (done: (v: T) => void) => (Node | string)[]): Promise<T | null> {
  return new Promise((resolve) => {
    const id = nextId("dlg");
    const dlg = h("dialog", { "aria-labelledby": id });
    let settled = false;
    const finish = (v: T | null) => { if (settled) return; settled = true; resolve(v); };
    const done = (v: T) => { finish(v); dlg.close(); };
    dlg.addEventListener("close", () => { finish(null); dlg.remove(); });
    dlg.append(h("h2", { id }, title), ...build(done));
    document.body.append(dlg);
    dlg.showModal();
  });
}

export function confirmDialog(title: string, text: string, confirmLabel: string, danger = false): Promise<boolean> {
  return modal<boolean>(title, (done) => [
    h("p", {}, text),
    h("div", { class: "btn-row" },
      h("button", { type: "button", class: "btn", onclick: () => done(false) }, "Cancel"),
      h("button", { type: "button", class: `btn ${danger ? "danger" : "primary"}`, onclick: () => done(true) }, confirmLabel)),
  ]).then((v) => v === true);
}
