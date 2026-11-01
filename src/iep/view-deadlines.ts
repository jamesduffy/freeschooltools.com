import { h } from "../shared/dom";
import { prettyDate, todayYmd } from "./dates";
import { computeDeadlines, timeLeftText, type Status } from "./deadlines";
import { buildIcs } from "./ics";
import { RULES } from "./rules";
import { getStore } from "./state";
import { downloadText } from "./storage";
import { emptyState, icon, statusBadge } from "./ui";

export const NOT_LEGAL_ADVICE = "Dates are a planning aid, not legal advice. Confirm with your district.";

export function deadlinesView(root: HTMLElement): void {
  const store = getStore();
  const today = todayYmd();
  const list = computeDeadlines(store.students, store.calendar, today);
  const count = (s: Status) => list.filter((d) => d.status === s).length;

  root.append(
    h("h1", { tabindex: "-1" }, "Deadlines"),
    h("p", { class: "muted" }, `All students, soonest first. Counting from today, ${prettyDate(today)}.`));

  if (!list.length) {
    root.append(h("section", { class: "card" }, emptyState(store.students.length
      ? "No deadlines yet. Open a student and enter key dates, such as the last IEP meeting."
      : "No students yet. Add a student on the Students screen, or load demo data."),
      h("a", { class: "btn", href: "#/students" }, "Go to students")));
  } else {
    root.append(h("div", { class: "counts" },
      ...(["Overdue", "Due within 30 days", "Upcoming"] as Status[]).map((st) =>
        h("div", { class: "card count" }, h("div", { class: "big" }, String(count(st))), statusBadge(st)))));

    const reminder = h("input", { type: "checkbox", id: "reminder" });
    const exportable = list.filter((d) => d.daysRemaining >= 0);
    root.append(h("section", { class: "card cal" },
      h("div", {}, h("h2", {}, "Put these on your calendar"),
        h("p", { class: "muted" }, `One all-day event per deadline that is not yet overdue (${exportable.length}), using student codes only.`)),
      h("div", { class: "cal-actions" },
        h("label", { class: "check", for: "reminder" }, reminder, "Remind me 14 days before"),
        h("button", { type: "button", class: "btn primary", disabled: exportable.length ? undefined : true, onclick: () =>
          downloadText(`iepkit-deadlines-${today}.ics`, buildIcs(exportable, { reminder: (reminder as HTMLInputElement).checked, now: new Date() }), "text/calendar") },
          "Download calendar file"))));

    const tbody = h("tbody", {});
    for (const d of list) {
      const note = d.notes.length ? h("ul", { class: "notes" }, ...d.notes.map((n) => h("li", {}, n))) : null;
      tbody.append(h("tr", {},
        h("td", {}, d.code),
        h("td", {}, h("div", { class: "strong" }, d.rule.name),
          h("span", { class: "unverified" }, icon("warn", 16), d.rule.verified ? "Rule verified" : "Rule not yet verified")),
        h("td", {}, prettyDate(d.due)),
        h("td", {}, timeLeftText(d.daysRemaining)),
        h("td", {}, statusBadge(d.status)),
        h("td", {}, h("details", {}, h("summary", {}, "Show math"), h("p", { class: "math" }, d.math), note))));
    }
    root.append(h("section", { class: "card" }, h("div", { class: "table-wrap" }, h("table", { class: "data deadlines" },
      h("thead", {}, h("tr", {}, ...["Student", "Deadline", "Due", "Time left", "Status", "How it was worked out"].map((t) => h("th", { scope: "col" }, t)))), tbody))));
  }

  root.append(
    h("p", { class: "strong" }, NOT_LEGAL_ADVICE),
    h("section", { class: "card" }, h("details", {}, h("summary", {}, "Rules used for these dates"),
      h("p", { class: "muted" }, "These rules live in src/iep/rules.ts so a special education professional can review them. None is verified yet."),
      h("div", { class: "table-wrap" }, h("table", { class: "data" },
        h("thead", {}, h("tr", {}, ...["Deadline", "Starts from", "Length", "Skip long breaks?", "Citation to verify", "Verified"].map((t) => h("th", { scope: "col" }, t)))),
        h("tbody", {}, ...RULES.map((r) => h("tr", {},
          h("td", {}, r.name), h("td", {}, r.startLabel.replace(/^the /, "")), h("td", {}, `${r.length} ${r.unit}`),
          h("td", {}, r.skipLongBreaks ? "Yes" : "No"), h("td", {}, r.citation), h("td", {}, r.verified ? "Yes" : "No"))))))
      , h("p", { class: "muted" }, "Day counts are calendar days; day 1 is the day after the start date. A school break is skipped only if it contains more than 5 weekdays. Dates are never moved for weekends or holidays."))));
}
