import { h } from "../shared/dom";
import { toggleFullscreen } from "../shared/fullscreen";
import { autoHideControls } from "../shared/idle-controls";
import { keepAwake, releaseAwake } from "../shared/wakelock";
import { announcement, firstThenStage, localDateStr, resolveIndex, stepBack, stepNext, stepTo, type Schedule } from "./model";
import { openPrint } from "./print";
import { boardEl, fitBoard } from "./render";
import { currentSchedule, getStore, mutate, saveProgress, todaysProgress } from "./state";

/** The full screen display. Returns a function that tears it down. */
export function boardView(root: HTMLElement): () => void {
  const found = currentSchedule();
  if (!found) { location.hash = "#/edit"; return () => {}; }
  const sch: Schedule = found;
  document.body.classList.add("board-open");

  const host = h("div", { class: "board-host", style: "flex:1;min-height:0;display:flex;flex-direction:column" });
  const note = h("p", { class: "board-note", role: "status", hidden: true });
  const live = h("div", { class: "sr-only", role: "status", "aria-live": "polite" });
  const screen = h("div", { class: "board-screen", id: "main", "aria-label": `Schedule board: ${sch.name}` });
  let lastKey = "";
  let lastIndex = -1;
  let refocusNow = false;

  // ---- controls ------------------------------------------------------------------------
  const settings = () => getStore().settings;
  const resolved = () => resolveIndex(sch, getStore().progress[sch.id], settings(), new Date());
  const back = h("button", { type: "button", class: "btn", onclick: () => doBack() }, "Back");
  const next = h("button", { type: "button", class: "btn primary", onclick: () => doNext() }, "Next");
  const resetBtn = h("button", { type: "button", class: "btn", onclick: () => askReset() }, "Reset day");
  const resetAsk = h("span", { class: "reset-ask", hidden: true, role: "group", "aria-label": "Confirm reset" },
    "Start the day over?",
    h("button", { type: "button", class: "btn danger", onclick: () => { doReset(); } }, "Yes, reset"),
    h("button", { type: "button", class: "btn", onclick: () => { resetAsk.hidden = true; resetBtn.hidden = false; resetBtn.focus(); } }, "Cancel"));
  const fsBtn = h("button", { type: "button", class: "btn", onclick: () => void toggleFullscreen(screen) }, "Fullscreen (F)");
  const hcBtn = h("button", { type: "button", class: "btn", "aria-pressed": "false", onclick: () => { mutate((st) => { st.settings.highContrast = !st.settings.highContrast; }); render(true); } }, "High contrast");
  const printBtn = h("button", { type: "button", class: "btn", onclick: () => openPrint(sch, settings(), printBtn) }, "Print");
  const editLink = h("a", { class: "btn", href: "#/edit" }, "Edit");
  const hint = h("p", { class: "board-hint" }, "Keys: ", h("kbd", {}, "→"), " or ", h("kbd", {}, "Space"), " Next · ", h("kbd", {}, "←"), " Back · ", h("kbd", {}, "F"), " Fullscreen");
  const bar = h("div", { class: "board-bar", role: "toolbar", "aria-label": "Board controls" }, back, next, resetBtn, resetAsk, fsBtn, hcBtn, printBtn, editLink, hint);

  screen.append(host, note, bar, live);
  root.replaceChildren(screen);

  // ---- actions ---------------------------------------------------------------------------
  const manual = () => !resolved().following;
  function doNext() { if (!manual()) return; saveProgress(sch, stepNext(todaysProgress(sch), sch)); render(); }
  function doBack() { if (!manual()) return; saveProgress(sch, stepBack(todaysProgress(sch), sch)); render(); }
  function pick(i: number) { if (!manual()) return; refocusNow = true; saveProgress(sch, stepTo(todaysProgress(sch), sch, i)); render(); }
  function askReset() { if (!manual()) return; resetBtn.hidden = true; resetAsk.hidden = false; (resetAsk.querySelector("button.danger") as HTMLElement).focus(); }
  function doReset() {
    saveProgress(sch, { date: localDateStr(new Date()), index: 0 });
    resetAsk.hidden = true; resetBtn.hidden = false; resetBtn.focus();
    render();
  }

  // ---- drawing -----------------------------------------------------------------------------
  function render(force = false) {
    const now = new Date();
    const r = resolved();
    const st = settings();
    const key = [r.index, r.following, r.problem, st.highContrast, st.showClock && `${now.getHours()}:${now.getMinutes()}`, st.showTimes, localDateStr(now)].join("|");
    if (!force && key === lastKey) return;
    lastKey = key;
    const el = boardEl({ schedule: sch, index: r.index, settings: st, now, onPick: r.following ? undefined : pick });
    host.replaceChildren(el);
    fitBoard(el);
    screen.classList.toggle("hc", st.highContrast);
    hcBtn.setAttribute("aria-pressed", String(st.highContrast));
    const following = r.following;
    note.hidden = !(r.problem || following);
    note.textContent = r.problem ? `${r.problem}. Staying in Manual.` : following ? "Following the clock. Next and Back are off." : "";
    for (const b of [back, next, resetBtn]) (b as HTMLButtonElement).disabled = following;
    const max = sch.mode === "firstThen" ? 2 : sch.activities.length - 1;
    back.setAttribute("aria-disabled", String(r.index <= 0));
    next.setAttribute("aria-disabled", String(r.index >= max));
    next.textContent = sch.mode === "firstThen" ? (firstThenStage(r.index) === "first" ? "Done with First" : firstThenStage(r.index) === "then" ? "Done with Then" : "All done") : "Next";
    if (r.index !== lastIndex) {
      if (lastIndex !== -1) live.textContent = announcement(sch, r.index);
      lastIndex = r.index;
    }
    if (refocusNow) { refocusNow = false; (el.querySelector(".now .sc-btn") as HTMLElement | null)?.focus(); }
  }

  if (sch.activities.length === 0) {
    host.append(h("div", { class: "board-main" }, h("p", { class: "sc-label", style: "font-size:36px;text-align:center;margin-top:80px" }, "This schedule has no cards yet. Choose Edit to add some.")));
    for (const b of [back, next, resetBtn, hcBtn]) (b as HTMLButtonElement).disabled = true;
  } else render(true);

  // ---- events --------------------------------------------------------------------------------
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t?.closest("input, textarea, select, [contenteditable='true']")) return; // never while typing in a field
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector("dialog[open]")) return;
    const onButton = !!t?.closest("button, a, summary");
    if (e.key === "ArrowRight" || (e.key === " " && !onButton)) { e.preventDefault(); doNext(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); doBack(); }
    else if (e.key === "f" || e.key === "F") { e.preventDefault(); void toggleFullscreen(screen); }
  };
  document.addEventListener("keydown", onKey);
  const stopHide = autoHideControls(bar, 4000);
  const ro = new ResizeObserver(() => { const el = host.firstElementChild as HTMLElement | null; if (el) fitBoard(el); });
  ro.observe(host);
  const tick = window.setInterval(() => render(), 1000);
  if (settings().keepScreenAwake) void keepAwake();
  window.setTimeout(() => next.focus({ preventScroll: true }), 0);

  return () => {
    document.removeEventListener("keydown", onKey);
    stopHide(); ro.disconnect(); window.clearInterval(tick);
    void releaseAwake();
    document.body.classList.remove("board-open");
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  };
}
