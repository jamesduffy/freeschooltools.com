import { h } from "../shared/dom";
import { fmt, progressText } from "./growth";
import { LIMITS } from "./model";
import { deleteShelved, getStore } from "./state";
import { downloadText, exportFileName, exportGardenText } from "./storage";
import { confirmDialog } from "./ui";
import { previewFrame } from "./view-gardens";

const niceDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

/** Finished gardens as small pictures with their name, goal and finish date. */
export function shelfView(root: HTMLElement, go: (hash: string) => void): void {
  const { shelf } = getStore();
  root.append(
    h("div", { class: "page-head" }, h("h1", { tabindex: "-1" }, "Shelf"), h("a", { class: "btn", href: "#/" }, "Back to gardens")),
    h("p", { class: "muted" }, `Finished gardens are kept here. The shelf holds up to ${LIMITS.shelf}.`),
    shelf.length === 0
      ? h("section", { class: "card" }, h("p", { class: "empty" }, "Nothing on the shelf yet. When a class reaches its goal, you can move the garden here."))
      : h("ul", { class: "cards" }, ...shelf.map((g) => h("li", {}, h("article", { class: "card g-card" },
        previewFrame(g.theme, g.total, g.goal),
        h("div", { class: "body" },
          h("h2", {}, g.name),
          h("p", { class: "big", style: "margin:0" }, `Goal: ${fmt(g.goal)} ${g.unit}`),
          h("p", { style: "margin:0" }, `Finished ${g.finishedOn ? niceDate(g.finishedOn) : "on an unknown date"}. ${progressText(g.total, g.goal, g.unit)}.`),
          h("div", { class: "btn-row" },
            h("button", { type: "button", class: "btn small", onclick: () => downloadText(exportFileName(g), exportGardenText(g), "application/json") }, "Export"),
            h("button", { type: "button", class: "btn small danger", "aria-label": `Delete ${g.name}`, onclick: async () => {
              if (await confirmDialog("Delete this garden?", `"${g.name}" will be removed from the shelf for good. Export it first if you want to keep a copy.`, "Delete", true)) { deleteShelved(g.id); go("#/shelf"); }
            } }, "Delete"))))))));
}
