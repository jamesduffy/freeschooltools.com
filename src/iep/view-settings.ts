import { h } from "../shared/dom";
import { countWeekdays, isValidYmd, todayYmd } from "./dates";
import { LONG_BREAK_WEEKDAYS } from "./rules";
import { exportText, exportFileName, downloadText, deleteAllToolKeys, parseStoreText } from "./storage";
import { getBlocked, getStore, mutate, replaceStore } from "./state";
import { dateInput, emptyState, field, message, textInput } from "./ui";
import { clear } from "./view-students";

export function settingsView(root: HTMLElement): void {
  root.append(h("h1", { tabindex: "-1" }, "Settings and data"));
  const store = getStore();

  // ---- school breaks ----------------------------------------------------------
  const breaks = h("section", { class: "card" },
    h("h2", {}, "School breaks"),
    h("p", { class: "muted" }, `Add your district's non-instructional ranges. A break is skipped when counting school days only if it contains more than ${LONG_BREAK_WEEKDAYS} weekdays. Districts differ, so nothing is built in.`));
  const listBox = h("div", {});
  const renderList = () => {
    listBox.replaceChildren();
    const ranges = [...getStore().calendar].sort((a, b) => a.start.localeCompare(b.start));
    if (!ranges.length) { listBox.append(emptyState("No breaks yet. Add a range below, or load demo data on the Students screen.")); return; }
    listBox.append(h("div", { class: "table-wrap" }, h("table", { class: "data" },
      h("thead", {}, h("tr", {}, ...["Name", "Starts", "Ends", "Weekdays", "Skipped in counts?"].map((t) => h("th", { scope: "col" }, t)), h("th", { scope: "col" }, h("span", { class: "sr-only" }, "Remove")))),
      h("tbody", {}, ...ranges.map((r) => {
        const wd = countWeekdays(r.start, r.end);
        return h("tr", {}, h("td", {}, r.label), h("td", {}, r.start), h("td", {}, r.end), h("td", {}, String(wd)),
          h("td", {}, wd > LONG_BREAK_WEEKDAYS ? "Yes (long break)" : "No (5 or fewer weekdays)"),
          h("td", {}, h("button", { type: "button", class: "btn small danger", "aria-label": `Remove ${r.label}`, onclick: () => { mutate((s) => { s.calendar = s.calendar.filter((x) => x !== r); }); renderList(); } }, "Remove")));
      })))));
  };
  const label = textInput("", { maxlength: "40" }), start = dateInput(), end = dateInput();
  const err = h("div", {});
  const addBreak = () => {
    err.replaceChildren();
    if (!label.value.trim()) { err.append(message("Give the break a name, such as Winter break.")); label.focus(); return; }
    if (!isValidYmd(start.value) || !isValidYmd(end.value)) { err.append(message("Pick real start and end dates.")); return; }
    if (start.value > end.value) { err.append(message("The end date must be on or after the start date.")); end.focus(); return; }
    mutate((s) => void s.calendar.push({ start: start.value, end: end.value, label: label.value.trim() }));
    label.value = ""; start.value = ""; end.value = "";
    renderList(); label.focus();
  };
  breaks.append(listBox, h("div", { class: "add-row" }, field("Name", label, { cls: "grow" }), field("Starts", start), field("Ends", end),
    h("button", { type: "button", class: "btn primary", onclick: addBreak }, "Add break")), err);
  renderList();
  root.append(breaks);

  // ---- backup / restore -------------------------------------------------------
  const fileIn = h("input", { type: "file", accept: "application/json,.json", id: "import-file", class: "sr-only", tabindex: "-1" });
  const importMsg = h("div", {});
  fileIn.addEventListener("change", async () => {
    importMsg.replaceChildren();
    const f = fileIn.files?.[0];
    if (!f) return;
    const res = parseStoreText(await f.text());
    fileIn.value = "";
    if (res.kind === "newer") { importMsg.append(message("That file was saved by a newer version of this tool, so it was not imported. Nothing was changed.")); return; }
    if (res.kind !== "ok") { importMsg.append(message(`That file could not be imported${res.kind === "invalid" ? `: ${res.reason}` : ""} Nothing was changed.`)); return; }
    const n = res.store.students.length;
    if (!confirm(`Replace everything saved in this browser with the file's data (${n} student${n === 1 ? "" : "s"})?`)) return;
    replaceStore(res.store);
    clear(root); settingsView(root);
    root.prepend(message("Backup restored.", "info"));
  });
  root.append(h("section", { class: "card" },
    h("h2", {}, "Back up your work"),
    h("p", { class: "muted" }, "Browser storage can be cleared at any time. Save a backup file now and then, and use it to move to another computer."),
    h("div", { class: "btn-row" },
      h("button", { type: "button", class: "btn primary", onclick: () => downloadText(exportFileName(todayYmd()), exportText(getStore()), "application/json") }, "Save backup file"),
      h("label", { class: "btn", for: "import-file", tabindex: "0", role: "button", onkeydown: (e: Event) => { const k = (e as KeyboardEvent).key; if (k === "Enter" || k === " ") { e.preventDefault(); fileIn.click(); } } }, "Restore from file"),
      fileIn),
    importMsg));

  // ---- delete all -------------------------------------------------------------
  root.append(h("section", { class: "card danger-zone" },
    h("h2", {}, "Delete all data"),
    h("p", {}, "Using a shared computer? Delete everything before you leave. This removes every student, goal and school break saved by this tool in this browser, and cannot be undone unless you saved a backup file."),
    h("button", { type: "button", class: "btn danger", onclick: () => {
      if (!confirm("Delete all data saved by the IEP Goal Toolkit in this browser? This cannot be undone.")) return;
      deleteAllNow();
    } }, "Delete all data")));
  void store; void getBlocked;
}

export function deleteAllNow(): void {
  try { deleteAllToolKeys(window.localStorage); } catch { /* nothing to delete */ }
  location.hash = "#/students";
  location.reload();
}
