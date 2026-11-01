import { h } from "../shared/dom";
import { fmt, progressText } from "./growth";
import { LIMITS } from "./model";
import { createScene } from "./scene";
import { createGarden, dismissNotice, getNotice, getStore, importGardenText } from "./state";
import { downloadText } from "./storage";
import { themeFor, themeList } from "./theme";
import { field, message, nextId, showErrors } from "./ui";

export function previewFrame(themeId: string, total: number, goal: number): HTMLElement {
  const sc = createScene(themeFor(themeId), { still: true });
  sc.update(total, goal);
  return h("div", { class: "preview-frame" }, sc.el);
}

const NO_NAMES = "Please do not put student names in garden names or units. The garden measures the class together.";

/** The Gardens screen: a card for each active garden, a New garden button and a link to the Shelf. */
export function gardensView(root: HTMLElement, go: (hash: string) => void): void {
  const { gardens, shelf } = getStore();
  const notes = h("div", { "aria-live": "polite" });
  const atLimit = gardens.length >= LIMITS.active;

  const fileInput = h("input", { type: "file", accept: "application/json,.json", class: "sr-only", id: nextId("imp"), tabindex: "-1", "aria-hidden": "true",
    onchange: async () => {
      const f = fileInput.files?.[0]; fileInput.value = "";
      if (!f) return;
      let text = "";
      try { text = await f.text(); } catch { notes.replaceChildren(message("That file could not be read.")); return; }
      const r = importGardenText(text);
      if (!r.ok) { notes.replaceChildren(message(r.message)); return; }
      go(`#/garden/${r.garden.id}`);
    } });

  const notice = getNotice();
  const noticeBox = notice ? h("section", { class: "note-box", role: "alert" },
    h("p", { style: "margin-top:0" }, notice.kind === "newer"
      ? "The saved gardens were made by a newer version of this tool. They were left alone, and changes you make now will not be saved."
      : `The saved garden data could not be read (${notice.reason}), so you are starting with no gardens. A copy of the unreadable data is still kept in this browser.`),
    h("div", { class: "btn-row" },
      h("button", { type: "button", class: "btn small", onclick: () => downloadText("garden-unreadable-data.txt", notice.raw, "text/plain") }, "Save the unreadable data to a file"),
      h("button", { type: "button", class: "btn small", onclick: () => { dismissNotice(); go("#/"); } }, "Dismiss"))) : null;

  root.append(
    h("div", { class: "page-head" },
      h("h1", { tabindex: "-1" }, "Class Garden"),
      h("div", { class: "btn-row" },
        h("a", { class: "btn", href: "#/shelf" }, `Shelf (${shelf.length})`),
        h("button", { type: "button", class: "btn", onclick: () => { if (atLimit) notes.replaceChildren(message(`You can have ${LIMITS.active} active gardens at a time. Move a finished garden to the shelf first.`)); else fileInput.click(); } }, "Import a garden"),
        fileInput,
        h("button", { type: "button", class: "btn primary", onclick: () => { if (atLimit) notes.replaceChildren(message(`You can have ${LIMITS.active} active gardens at a time. Move a finished garden to the shelf first.`)); else go("#/new"); } }, "New garden"))),
    h("p", { class: "muted" }, "Grow a garden together as a class. It measures the whole class, never one student. ", NO_NAMES),
    ...(noticeBox ? [noticeBox] : []), notes,
    gardens.length === 0
      ? h("section", { class: "card" }, h("h2", {}, "No gardens yet"), h("p", {}, "Create one, set a class goal, and show it on the classroom screen."), h("a", { class: "btn primary", href: "#/new" }, "Create your first garden"))
      : h("ul", { class: "cards" }, ...gardens.map((g) => h("li", {}, h("article", { class: "card g-card" },
        h("a", { class: "open", href: `#/garden/${g.id}`, "aria-label": `Open ${g.name}: ${progressText(g.total, g.goal, g.unit)}` },
          previewFrame(g.theme, g.total, g.goal),
          h("div", { class: "body" }, h("h2", {}, g.name), h("p", { class: "big", style: "margin:0" }, progressText(g.total, g.goal, g.unit)))))))));
}

/** The New garden form, with a 12 spot preview at 0 percent. */
export function newGardenView(root: HTMLElement, go: (hash: string) => void): void {
  const name = h("input", { type: "text", maxlength: LIMITS.name, placeholder: "Our reading garden", autocomplete: "off" });
  const unit = h("input", { type: "text", maxlength: LIMITS.unit, placeholder: "books read", autocomplete: "off" });
  const goal = h("input", { type: "text", inputmode: "numeric", placeholder: "500", autocomplete: "off" });
  const fs = {
    name: field("Garden name", name, { hint: `Up to ${LIMITS.name} characters. For example: Our reading garden.` }),
    unit: field("What you are counting", unit, { hint: `Up to ${LIMITS.unit} characters. For example: books read, or minutes of kindness.` }),
    goal: field("Goal", goal, { hint: `A whole number from 1 to ${fmt(LIMITS.goalMax)}, such as 500.` }),
  };
  const themeName = nextId("theme");
  const themes = themeList();
  const picker = h("fieldset", {}, h("legend", {}, "Theme"),
    h("div", { class: "theme-pick" }, ...themes.map((t, i) => h("label", {}, h("input", { type: "radio", name: themeName, value: t.id, checked: i === 0 }), h("span", {}, h("strong", {}, t.name), t.description)))));
  const status = h("div", { "aria-live": "polite" });
  const preview = h("div", {}, previewFrame("flowers", 0, 1));
  const refreshPreview = () => {
    const sel = (picker.querySelector("input:checked") as HTMLInputElement | null)?.value ?? "flowers";
    preview.replaceChildren(previewFrame(sel, 0, 1));
  };
  picker.addEventListener("change", refreshPreview);

  const form = h("form", { novalidate: true, onsubmit: (e: Event) => {
    e.preventDefault();
    const sel = ((picker.querySelector("input:checked") as HTMLInputElement | null)?.value ?? "flowers") as "flowers";
    const r = createGarden({ name: name.value, unit: unit.value, goal: goal.value }, sel);
    if (!r.ok) {
      showErrors(fs, r.errors);
      status.replaceChildren(r.errors ? message(r.message) : message(r.message));
      (r.errors?.name ? name : r.errors?.unit ? unit : r.errors?.goal ? goal : name).focus();
      return;
    }
    go(`#/garden/${r.garden.id}`);
  } },
    fs.name.el, fs.unit.el, fs.goal.el, picker,
    h("p", { class: "note-box" }, NO_NAMES),
    status,
    h("div", { class: "btn-row", style: "margin-top:16px" }, h("button", { type: "submit", class: "btn primary" }, "Create garden"), h("a", { class: "btn", href: "#/" }, "Cancel")));

  root.append(h("h1", { tabindex: "-1" }, "New garden"),
    h("div", { class: "new-layout" }, h("section", { class: "card" }, form),
      h("section", {}, h("h2", {}, "Your garden starts like this"), preview, h("p", { class: "muted" }, "Bare soil and a few seeds. It grows as the class gets closer to the goal."))));
}
