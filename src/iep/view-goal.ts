import { h } from "../shared/dom";
import { allFlags, checkGoal } from "./checker";
import { isValidYmd, prettyDate, todayYmd } from "./dates";
import { buildGraph, buildLegend, DISCLAIMER, sortedPoints, summaryLines } from "./graph";
import type { Goal } from "./model";
import { maybeContainsName } from "./privacy";
import { getStore, mutate } from "./state";
import { dateInput, debounce, emptyState, field, icon, message, textInput } from "./ui";

const dismissedNameWarnings = new Set<string>(); // per page load only

function findGoal(id: string) {
  for (const st of getStore().students) { const g = st.goals.find((x) => x.id === id); if (g) return { st, g }; }
  return null;
}

function parseNum(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function goalView(root: HTMLElement, id: string): void {
  const found = findGoal(id);
  if (!found) { root.append(h("h1", { tabindex: "-1" }, "Goal not found"), h("p", {}, h("a", { href: "#/students" }, "Back to students"))); return; }
  const { st, g } = found;
  const idx = st.goals.indexOf(g) + 1;

  // ---- derived panels (graph, summary, checker) -------------------------------
  const graphBox = h("div", { class: "graph-box" });
  const summaryBox = h("div", { class: "summary", "aria-live": "polite" });
  const checkerBox = h("div", {});
  const titleEl = h("h1", { tabindex: "-1" }, g.area || "Untitled goal");
  const unitEl = h("span", { class: "muted" });

  const refreshGraph = () => {
    titleEl.textContent = g.area || "Untitled goal";
    const { svg, unit } = buildGraph(st.code, g);
    unitEl.textContent = unit;
    graphBox.replaceChildren(svg ?? emptyState("No graph yet. Add data points, or enter a baseline and target, to see it."));
    const lines = summaryLines(g);
    summaryBox.replaceChildren(
      h("div", { class: "strong" }, lines[0]),
      ...lines.slice(1).map((l) => h("div", {}, l)),
      h("div", { class: "muted disclaimer" }, DISCLAIMER));
  };

  const refreshChecker = () => {
    const flags = checkGoal(g);
    const all = allFlags(g);
    const box = checkerBox;
    box.replaceChildren();
    if (!flags.length) {
      box.append(h("div", { class: "ok-line" }, icon("check", 20), h("span", {}, "No required parts missing by these basic checks.")));
    }
    for (const f of flags) {
      box.append(h("div", { class: "flag" },
        h("div", { class: "flag-title" }, icon("warn", 22), h("span", {}, `Needs a look: ${f.title.charAt(0).toLowerCase()}${f.title.slice(1)}`)),
        h("p", {}, f.message),
        h("p", { class: "muted" }, f.why),
        h("div", { class: "example" }, h("div", { class: "muted" }, "Example wording (fake content)"), h("div", {}, f.example)),
        h("button", { type: "button", class: "btn", onclick: () => { mutate(() => void g.dismissedFlags.push(f.id)); refreshChecker(); } }, "This is fine")));
    }
    const hidden = all.length - flags.length;
    if (hidden > 0) {
      box.append(h("p", { class: "muted" }, `${hidden} note${hidden === 1 ? "" : "s"} marked fine. `,
        h("button", { type: "button", class: "linklike", onclick: () => { mutate(() => { g.dismissedFlags = []; }); refreshChecker(); } }, "Show again")));
    }
  };

  const refreshAll = () => { refreshGraph(); refreshChecker(); };

  // ---- goal form --------------------------------------------------------------
  const area = textInput(g.area, { maxlength: "60" });
  const wording = h("textarea", { rows: "6" }); wording.value = g.text;
  const nameWarn = h("div", {});
  const baseHint = h("div", {});
  const mk = (kind: "baseline" | "target") => {
    const m = g[kind];
    return {
      value: textInput(m ? String(m.value) : "", { inputmode: "decimal" }),
      unit: textInput(m?.unit ?? "", { maxlength: "40" }),
      date: dateInput(m?.date ?? ""),
    };
  };
  const base = mk("baseline"), targ = mk("target");

  const readMeasure = (kind: "baseline" | "target", f: ReturnType<typeof mk>, hint: HTMLElement) => {
    const v = parseNum(f.value.value);
    hint.replaceChildren();
    if (f.value.value.trim() === "" && !f.date.value) { delete g[kind]; return; }
    if (v === null) { hint.append(message(`The ${kind} value must be a number, such as 52. It is not saved until it is.`)); delete g[kind]; return; }
    if (!f.date.value || !isValidYmd(f.date.value)) { hint.append(message(`Add the date for the ${kind} so it can be saved.`, "info")); delete g[kind]; return; }
    g[kind] = { value: v, unit: f.unit.value.trim(), date: f.date.value };
  };
  const targHint = h("div", {});

  const applyForm = () => {
    mutate(() => {
      g.area = area.value.trim();
      g.text = wording.value;
      readMeasure("baseline", base, baseHint);
      readMeasure("target", targ, targHint);
    });
    nameWarn.replaceChildren();
    if (maybeContainsName(g.text) && !dismissedNameWarnings.has("wording")) {
      nameWarn.append(h("div", { class: "msg info", role: "status" }, "This may contain a name. Consider using initials. ",
        h("button", { type: "button", class: "linklike", onclick: () => { dismissedNameWarnings.add("wording"); nameWarn.replaceChildren(); } }, "Dismiss")));
    }
    refreshAll();
  };
  const live = debounce(applyForm, 250);
  for (const el of [area, wording, base.value, base.unit, base.date, targ.value, targ.unit, targ.date]) {
    el.addEventListener("input", live);
    el.addEventListener("change", live);
  }

  const formCard = h("section", { class: "card goal-form no-print" },
    h("h2", {}, "Goal details"),
    field("Goal area", area),
    field("Goal wording", wording),
    nameWarn,
    h("fieldset", {}, h("legend", {}, "Baseline (where the student starts)"),
      h("div", { class: "row" }, field("Value", base.value, { cls: "w-value" }), field("Unit", base.unit, { cls: "grow" })),
      field("Date measured", base.date), baseHint),
    h("fieldset", {}, h("legend", {}, "Target (where the team wants it to be)"),
      h("div", { class: "row" }, field("Value", targ.value, { cls: "w-value" }), field("Unit", targ.unit, { cls: "grow" })),
      field("Date to reach it", targ.date), targHint),
    h("p", { class: "muted" }, "Everything you type stays in this browser. Nothing is sent anywhere."));

  // ---- data point table -------------------------------------------------------
  const tbody = h("tbody", {});
  const tableMsg = h("div", {});
  const notesWarn = h("div", { class: "no-print" });

  const checkNotes = () => {
    notesWarn.replaceChildren();
    if (g.dataPoints.some((p) => p.note && maybeContainsName(p.note)) && !dismissedNameWarnings.has("notes")) {
      notesWarn.append(h("div", { class: "msg info", role: "status" }, "This may contain a name. Consider using initials. ",
        h("button", { type: "button", class: "linklike", onclick: () => { dismissedNameWarnings.add("notes"); notesWarn.replaceChildren(); } }, "Dismiss")));
    }
  };

  const renderRows = (focus?: { point: Goal["dataPoints"][number]; field: string }) => {
    tbody.replaceChildren();
    const rows = sortedPoints(g);
    if (!rows.length) tbody.append(h("tr", {}, h("td", { colspan: "4", class: "empty" }, "No data points yet. Add one below.")));
    for (const p of rows) {
      const d = dateInput(p.date, { "aria-label": `Date for data point ${p.date}`, "data-f": "date" });
      const v = textInput(String(p.value), { inputmode: "decimal", "aria-label": `Value on ${p.date}`, "data-f": "value" });
      const n = textInput(p.note ?? "", { "aria-label": `Note on ${p.date}`, "data-f": "note", maxlength: "80" });
      const revertMsg = (t: string) => { tableMsg.replaceChildren(message(t)); };
      d.addEventListener("change", () => {
        if (!isValidYmd(d.value)) { revertMsg("That is not a real date. The change was not saved."); d.value = p.date; return; }
        tableMsg.replaceChildren(); mutate(() => { p.date = d.value; }); refreshAll(); renderRows({ point: p, field: "date" });
      });
      v.addEventListener("change", () => {
        const num = parseNum(v.value);
        if (num === null) { revertMsg("Enter a number for the value, such as 72. The change was not saved."); v.value = String(p.value); return; }
        tableMsg.replaceChildren(); mutate(() => { p.value = num; }); refreshAll();
      });
      n.addEventListener("change", () => { mutate(() => { if (n.value.trim()) p.note = n.value.trim(); else delete p.note; }); checkNotes(); });
      const del = h("button", { type: "button", class: "btn small danger no-print", "aria-label": `Remove data point from ${prettyDate(p.date)}`, onclick: () => {
        mutate(() => { g.dataPoints = g.dataPoints.filter((x) => x !== p); }); refreshAll(); renderRows(); checkNotes();
        newDate.focus();
      } }, "Remove");
      tbody.append(h("tr", {}, h("td", {}, d), h("td", {}, v), h("td", {}, n), h("td", { class: "no-print" }, del)));
    }
    if (focus) {
      const i = sortedPoints(g).indexOf(focus.point);
      (tbody.children[i]?.querySelector(`[data-f="${focus.field}"]`) as HTMLElement | undefined)?.focus();
    }
    checkNotes();
  };

  const newDate = dateInput(todayYmd());
  const newVal = textInput("", { inputmode: "decimal" });
  const newNote = textInput("", { maxlength: "80" });
  const addPoint = () => {
    const num = parseNum(newVal.value);
    tableMsg.replaceChildren();
    if (!isValidYmd(newDate.value)) { tableMsg.append(message("Pick a real date for the new data point.")); newDate.focus(); return; }
    if (num === null) { tableMsg.append(message("Enter a number for the value, such as 72.")); newVal.focus(); return; }
    const p: Goal["dataPoints"][number] = { date: newDate.value, value: num };
    if (newNote.value.trim()) p.note = newNote.value.trim();
    mutate(() => void g.dataPoints.push(p));
    newVal.value = ""; newNote.value = "";
    refreshAll(); renderRows();
    newDate.focus();
  };
  for (const el of [newDate, newVal, newNote]) el.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Enter") { e.preventDefault(); addPoint(); } });

  const tableCard = h("section", { class: "card data-card" },
    h("h2", {}, "Data points"),
    h("div", { class: "table-wrap" }, h("table", { class: "data" },
      h("thead", {}, h("tr", {}, h("th", { scope: "col" }, "Date"), h("th", { scope: "col" }, "Value"), h("th", { scope: "col" }, "Note"), h("th", { scope: "col", class: "no-print" }, h("span", { class: "sr-only" }, "Remove")))),
      tbody)),
    tableMsg, notesWarn,
    h("div", { class: "add-row no-print" },
      field("Date", newDate), field("Value", newVal, { cls: "w-value" }), field("Note (optional)", newNote, { cls: "grow" }),
      h("button", { type: "button", class: "btn primary", onclick: addPoint }, "Add row")));

  // ---- page -------------------------------------------------------------------
  root.append(
    h("nav", { class: "crumbs no-print", "aria-label": "Breadcrumb" }, h("a", { href: "#/students" }, "Students"), " / ", h("a", { href: `#/students/${st.id}` }, st.code), " / ", g.area || "Untitled goal"),
    h("div", { class: "page-head" },
      h("div", {}, titleEl, h("div", { class: "muted" }, `Student ${st.code} · Goal ${idx} of ${st.goals.length}`)),
      h("button", { type: "button", class: "btn no-print", onclick: () => window.print() }, icon("print"), "Print this goal")),
    h("p", { class: "print-only wording" }, h("strong", {}, "Goal wording: "), g.text),
    h("div", { class: "goal-layout" },
      formCard,
      h("div", { class: "goal-main" },
        h("section", { class: "card graph-card" },
          h("div", { class: "graph-head" }, h("h2", {}, `Progress: ${st.code}, ${g.area || "Untitled goal"}`), unitEl),
          h("div", { class: "graph-scroll" }, graphBox),
          h("div", { class: "legend" },
            ...[["Data points", 0], ["Aim line (dashed)", 1], ["Trend line (thick, solid)", 2]].map(([label, i]) =>
              h("div", { class: "legend-item" }, buildLegend()[i as number]!, h("span", {}, label as string)))),
          summaryBox),
        h("section", { class: "card no-print" },
          h("h2", {}, "Goal wording check"),
          h("p", { class: "muted" }, "These are simple word checks, not a review of your goal."),
          checkerBox),
        tableCard)));
  refreshAll();
  renderRows();
  if (!g.text && !g.area) area.focus();
}
