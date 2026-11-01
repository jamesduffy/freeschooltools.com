import { h } from "../shared/dom";
import type { Schedule, Settings } from "./model";
import { printEl, type PrintKind } from "./render";

/** The Print button: two options, then the browser's print dialog. The printed page is a view of the same data. */
export function openPrint(sch: Schedule, settings: Settings, opener?: HTMLElement | null): void {
  document.getElementById("print-root")?.remove();
  let kind: PrintKind = "wall";
  const opt = (value: PrintKind, title: string, text: string) => {
    const input = h("input", { type: "radio", name: "print-kind", value, id: `pk-${value}`, ...(value === kind ? { checked: true } : {}) });
    input.addEventListener("change", () => { kind = value; });
    return h("label", { class: "print-opt", for: `pk-${value}` }, input, h("div", {}, h("span", {}, title), h("small", {}, text)));
  };
  const dlg = h("dialog", { "aria-labelledby": "print-h" },
    h("h2", { id: "print-h" }, "Print"),
    h("fieldset", {}, h("legend", { class: "sr-only" }, "What to print"),
      opt("wall", "Wall strip", "Large cards in order, with the picture and the label. Uses more pages if needed."),
      opt("desk", "Desk strip", "Small cards in one or two rows with a check box under each, ready to cut apart.")),
    h("p", { class: "muted" }, "Prints in black and white. Pictures and labels carry the meaning, not color."),
    h("div", { class: "btn-row" },
      h("button", { type: "button", class: "btn primary", id: "print-go", onclick: () => {
        dlg.close();
        const root = printEl(sch, settings, kind);
        document.body.append(root);
        const done = () => { root.remove(); window.removeEventListener("afterprint", done); };
        window.addEventListener("afterprint", done);
        window.setTimeout(() => window.print(), 50);
      } }, "Print"),
      h("button", { type: "button", class: "btn", onclick: () => dlg.close() }, "Cancel")));
  dlg.addEventListener("close", () => { dlg.remove(); opener?.focus(); });
  document.body.append(dlg);
  dlg.showModal();
  (dlg.querySelector("input:checked") as HTMLElement | null)?.focus();
}
