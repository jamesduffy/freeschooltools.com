import "../shared/styles.css";
import "./iep.css";
import { h } from "../shared/dom";
import { footerText, logo } from "../shared/chrome";
import { boot, firstRunSeen, flushSave, getBlocked, getStatus, markFirstRunSeen, subscribe } from "./state";
import { downloadText, deleteAllToolKeys } from "./storage";
import { icon } from "./ui";
import { deadlinesView } from "./view-deadlines";
import { goalView } from "./view-goal";
import { settingsView } from "./view-settings";
import { studentsView, studentView } from "./view-students";

const app = document.getElementById("app")!;
boot();

// ---- shell -------------------------------------------------------------------
const saved = h("span", { class: "saved", role: "status", "aria-live": "polite" });
const saveBanner = h("div", { class: "save-banner", role: "alert", hidden: true });
const nav = h("nav", { class: "nav", "aria-label": "Main" },
  h("a", { href: "/" }, "← All tools"),
  ...[["#/students", "Students"], ["#/deadlines", "Deadlines"], ["#/settings", "Settings and data"]].map(([href, text]) => h("a", { href, "data-nav": href }, text)));
const main = h("main", { class: "wrap", id: "main" });
const notice = h("div", { class: "wrap notice-wrap" });

app.append(
  h("a", { class: "skip", href: "#main", onclick: (e: Event) => { e.preventDefault(); (main.querySelector("h1") as HTMLElement | null)?.focus(); } }, "Skip to content"),
  saveBanner,
  h("header", { class: "site-header no-print" }, h("div", { class: "wrap" },
    h("a", { class: "brand", href: "#/students" }, logo(), h("span", {}, "IEP Goal Toolkit")), nav, saved)),
  notice, main,
  h("footer", { class: "site-footer no-print" }, h("p", {}, footerText()), h("p", {}, h("a", { href: "/" }, "More free school tools"))));

function paintStatus() {
  const { status, errorText } = getStatus();
  saved.replaceChildren(...(status === "saved" ? [icon("check", 18), "Saved"] : status === "saving" ? ["Saving…"] : [icon("warn", 18), "Not saved"]));
  saveBanner.hidden = status !== "error";
  saveBanner.textContent = errorText;
}
subscribe(paintStatus);
paintStatus();
window.addEventListener("pagehide", flushSave);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushSave(); });

function paintNotice() {
  notice.replaceChildren();
  if (firstRunSeen() || getBlocked()) return;
  notice.append(h("section", { class: "card first-run", "aria-labelledby": "fr-h" },
    h("h2", { id: "fr-h" }, "Before you start"),
    h("p", {}, "Your data stays in this browser and is never sent anywhere. Use fake data or student codes only, because there is no name field on purpose. Clearing your browser data deletes everything, unless you saved a backup file."),
    h("button", { type: "button", class: "btn primary", onclick: () => { markFirstRunSeen(); paintNotice(); } }, "Got it")));
}

// ---- recovery screen for unreadable saved data ---------------------------------
function blockedView(root: HTMLElement) {
  const b = getBlocked()!;
  root.append(h("h1", { tabindex: "-1" }, "Saved data was not opened"),
    h("section", { class: "card" },
      h("p", {}, b.kind === "newer"
        ? "The data saved in this browser was written by a newer version of this tool, so it was left alone and nothing here can change it."
        : `The data saved in this browser could not be read (${b.reason}). It was left alone and nothing here can change it.`),
      h("p", {}, "You can save a copy of the raw saved text to a file, so nothing is lost."),
      h("div", { class: "btn-row" },
        h("button", { type: "button", class: "btn primary", onclick: () => downloadText("iepkit-raw-saved-data.txt", b.raw, "text/plain") }, "Save the raw saved text"),
        h("button", { type: "button", class: "btn danger", onclick: () => {
          if (!confirm("Delete the unreadable saved data and start fresh? Save the raw text first if you want to keep it.")) return;
          try { deleteAllToolKeys(window.localStorage); } catch { /* ignore */ }
          location.hash = "#/students"; location.reload();
        } }, "Delete it and start fresh"))));
}

// ---- router --------------------------------------------------------------------
function route() {
  const [, a, b] = (location.hash || "#/students").split("/");
  main.replaceChildren();
  paintNotice();
  let title = "Students";
  const blocked = !!getBlocked();
  if (blocked) { blockedView(main); title = "Saved data not opened"; }
  else if (a === "students" && b) { studentView(main, b); title = "Student"; }
  else if (a === "goals" && b) { goalView(main, b); title = "Goal"; }
  else if (a === "deadlines") { deadlinesView(main); title = "Deadlines"; }
  else if (a === "settings") { settingsView(main); title = "Settings and data"; }
  else { studentsView(main); }
  document.title = `${title} · IEP Goal Toolkit`;
  const active = a === "goals" ? "students" : a ?? "students";
  nav.querySelectorAll("a").forEach((el) => {
    if (el.getAttribute("data-nav") === `#/${active}`) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
  (main.querySelector("h1") as HTMLElement | null)?.focus({ preventScroll: true });
}
window.addEventListener("hashchange", route);
route();
