import { h } from "../shared/dom";
import { allFlags, checkGoal } from "./checker";
import { prettyDate, todayYmd } from "./dates";
import { computeDeadlines } from "./deadlines";
import { demoStore } from "./demo";
import { KEY_DATE_FIELDS, newGoal, newStudent, type Student } from "./model";
import { maybeContainsName } from "./privacy";
import { getStore, mutate, replaceStore } from "./state";
import { dateInput, debounce, emptyState, field, icon, message, navigate, statusBadge, textInput } from "./ui";

const flagCount = (st: Student) => st.goals.reduce((n, g) => n + checkGoal(g).length, 0);

export function studentsView(root: HTMLElement): void {
  const store = getStore();
  const today = todayYmd();
  const deadlines = computeDeadlines(store.students, store.calendar, today);
  const nGoals = store.students.reduce((n, s) => n + s.goals.length, 0);

  const demoBtn = h("button", { type: "button", class: "btn", onclick: () => {
    if (store.students.length || store.calendar.length) {
      if (!confirm("Loading demo data replaces everything currently saved in this browser. Continue?")) return;
    }
    replaceStore(demoStore());
    studentsView(clear(root));
  } }, "Load demo data");

  root.append(
    h("div", { class: "page-head" },
      h("div", {}, h("h1", { tabindex: "-1" }, "Students"),
        h("div", { class: "muted" }, `${store.students.length} student${store.students.length === 1 ? "" : "s"}, ${nGoals} goal${nGoals === 1 ? "" : "s"}`)),
      demoBtn));

  if (!store.students.length) {
    root.append(h("section", { class: "card" }, emptyState("No students yet. Add one below, or load demo data to see how the tool works.")));
  } else {
    const list = h("ul", { class: "plain stack" });
    for (const st of store.students) {
      const next = deadlines.find((d) => d.studentId === st.id);
      const pts = st.goals.reduce((n, g) => n + g.dataPoints.length, 0);
      const flags = flagCount(st);
      list.append(h("li", { class: "card student-row" },
        h("div", {},
          h("h2", { class: "tight" }, h("a", { href: `#/students/${st.id}` }, st.code)),
          h("div", { class: "muted" }, st.goals.length ? `${st.goals.length} goal${st.goals.length === 1 ? "" : "s"}: ${st.goals.map((g) => g.area || "Untitled").join(", ")} · ${pts} data point${pts === 1 ? "" : "s"}` : "No goals yet."),
          h("div", {}, next ? `Next: ${next.rule.name} ${next.daysRemaining < 0 ? "was due" : "on"} ${prettyDate(next.due)}` : "No deadlines yet. Enter key dates on the student page."),
          flags ? h("div", { class: "muted" }, `${flags} goal wording note${flags === 1 ? "" : "s"} to look at`) : null),
        next ? statusBadge(next.status) : null));
    }
    root.append(list);
  }

  const code = textInput("", { maxlength: "20" });
  const err = h("div", {});
  const warn = h("div", {});
  const add = () => {
    const v = code.value.trim();
    err.replaceChildren();
    if (!v) { err.append(message("Enter a code or initials for the student.")); code.focus(); return; }
    if (getStore().students.some((s) => s.code.toLowerCase() === v.toLowerCase())) { err.append(message(`"${v}" is already used. Pick a different code.`)); code.focus(); return; }
    const st = newStudent(v);
    mutate((s) => void s.students.push(st));
    navigate(`#/students/${st.id}`);
  };
  code.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); add(); } });
  code.addEventListener("input", debounce(() => {
    warn.replaceChildren();
    if (maybeContainsName(code.value)) warn.append(message("This may contain a name. Consider using initials.", "info"));
  }, 200));
  root.append(h("section", { class: "card" },
    h("h2", {}, "Add a student"),
    field("Student code", code, { hint: "Use initials or a code. Never a full name. There is no name field on purpose." }),
    warn, err,
    h("button", { type: "button", class: "btn primary", onclick: add }, "Add student")));
}

export function clear(root: HTMLElement): HTMLElement { root.replaceChildren(); return root; }

export function studentView(root: HTMLElement, id: string): void {
  const st = getStore().students.find((s) => s.id === id);
  if (!st) { root.append(h("h1", { tabindex: "-1" }, "Student not found"), h("p", {}, h("a", { href: "#/students" }, "Back to students"))); return; }

  root.append(
    h("nav", { class: "crumbs", "aria-label": "Breadcrumb" }, h("a", { href: "#/students" }, "Students"), " / ", st.code),
    h("h1", { tabindex: "-1" }, st.code));

  const dates = h("section", { class: "card" }, h("h2", {}, "Key dates"),
    h("p", { class: "muted" }, "Deadlines are worked out from these. Leave blank any that do not apply."));
  const grid = h("div", { class: "form-grid" });
  for (const f of KEY_DATE_FIELDS) {
    const input = dateInput(st.dates[f.key] ?? "");
    input.addEventListener("change", () => mutate(() => { if (input.value) st.dates[f.key] = input.value; else delete st.dates[f.key]; }));
    grid.append(field(f.label, input));
  }
  dates.append(grid);
  root.append(dates);

  const goalsCard = h("section", { class: "card" }, h("h2", {}, "Goals"));
  if (!st.goals.length) goalsCard.append(emptyState("No goals yet. Add one to see the graph."));
  else {
    const ul = h("ul", { class: "plain stack" });
    for (const g of st.goals) {
      const n = checkGoal(g).length;
      const dismissed = allFlags(g).length - n;
      ul.append(h("li", { class: "goal-row" },
        h("a", { href: `#/goals/${g.id}`, class: "strong" }, g.area || "Untitled goal"),
        h("span", { class: "muted" }, ` · ${g.dataPoints.length} data point${g.dataPoints.length === 1 ? "" : "s"} · `),
        n ? h("span", { class: "note-count" }, icon("warn", 18), `${n} wording note${n === 1 ? "" : "s"}`) : h("span", { class: "muted" }, "No wording notes"),
        dismissed ? h("span", { class: "muted" }, ` (${dismissed} marked fine)`) : null));
    }
    goalsCard.append(ul);
  }
  const area = textInput("", { maxlength: "60" });
  const addGoal = () => {
    const g = newGoal(area.value.trim());
    mutate(() => void st.goals.push(g));
    navigate(`#/goals/${g.id}`);
  };
  area.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addGoal(); } });
  goalsCard.append(h("div", { class: "add-row" }, field("New goal area", area, { hint: 'For example "Articulation" or "Reading fluency".' }),
    h("button", { type: "button", class: "btn primary", onclick: addGoal }, "Add goal")));
  root.append(goalsCard);
}
