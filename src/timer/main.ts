import "../shared/styles.css";
import "./timer.css";
import { h } from "../shared/dom";
import { footerText } from "../shared/chrome";
import { releaseAwake } from "../shared/wakelock";
import { Sound } from "./audio";
import { createDone } from "./done";
import { createRun } from "./run";
import { createSettingsDialog } from "./settings";
import { createSetup } from "./setup";
import { boot, flushSave, resetAfterWipe, state, subscribe } from "./state";
import { deleteAllToolKeys } from "./storage";
import type { Plan } from "./model";
import { mountHomeLink } from "../shared/home-link";

const app = document.getElementById("app")!;
boot();

const sound = new Sound();
const live = h("div", { class: "sr-only", role: "status", "aria-live": "polite", "aria-atomic": "true" });
const saveBanner = h("div", { class: "save-banner", role: "alert", hidden: true });
const noticeBar = h("div", { class: "notice-bar", role: "status", hidden: true });
const screens = h("div", { class: "screens" });
let view: "setup" | "run" | "done" = "setup";

function announce(text: string) {
  live.textContent = "";
  window.setTimeout(() => { live.textContent = text; }, 30);
}

const setup = createSetup({
  start: () => { startRun(state.plan); },
  openSettings: (opener) => settings.open(opener),
});
const run = createRun({
  sound, announce,
  openSettings: (opener) => settings.open(opener),
  goSetup: () => show("setup"),
  goDone: (p) => { show("done"); done.show(p); },
});
const done = createDone((p) => startRun(p), () => show("setup"));
const settings = createSettingsDialog(sound, () => run.settingsChanged(), () => {
  try { deleteAllToolKeys(window.localStorage); } catch { /* storage not available */ }
  resetAfterWipe();
  run.settingsChanged();
  setup.show();
});

function startRun(p: Plan) {
  show("run");
  run.enter(p, true); // still inside the click that pressed Start
}

function show(v: typeof view) {
  view = v;
  screens.replaceChildren(v === "setup" ? setup.el : v === "run" ? run.el : done.el);
  document.body.classList.toggle("is-run", v !== "setup");
  document.title = v === "setup" ? "Classroom Pie Timer" : v === "run" ? "Running · Classroom Pie Timer" : "All done · Classroom Pie Timer";
  if (v === "setup") { void releaseAwake(); setup.show(); }
  window.scrollTo(0, 0);
}

function paintStatus() {
  saveBanner.hidden = state.status !== "error";
  saveBanner.textContent = state.errorText;
}
subscribe(paintStatus);
paintStatus();
if (state.notice) { noticeBar.hidden = false; noticeBar.textContent = state.notice; }

window.addEventListener("keydown", (e) => { if (view === "run") run.key(e); });
window.addEventListener("pagehide", flushSave);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushSave(); });

app.append(saveBanner, noticeBar, screens, live,
  h("footer", { class: "site-footer no-print" }, h("p", {}, footerText())));
show("setup");

mountHomeLink(() => (document.body.classList.contains("is-run") ? "Leave the timer? A running timer will stop." : null));
