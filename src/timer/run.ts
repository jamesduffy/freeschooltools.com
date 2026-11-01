import { h } from "../shared/dom";
import { isFullscreen, toggleFullscreen } from "../shared/fullscreen";
import { autoHideControls } from "../shared/idle-controls";
import { keepAwake, releaseAwake, wakeLockSupported } from "../shared/wakelock";
import { paletteHex, PALETTE_TEXT } from "../shared/palette";
import { toneFor, type Sound } from "./audio";
import { adjustCurrent, CHIMES_LABEL, formatClock, locate, nextStart, slicesOf, spokenLength, type Plan, type Settings } from "./model";
import { createRing, prefersReducedMotion } from "./ring";
import { CueTracker, Runner, type Cue } from "./runner";
import { state, updateSettings } from "./state";
import { button, icon, toggle } from "./ui";

type Deps = {
  sound: Sound;
  announce: (text: string) => void;
  openSettings: (opener: HTMLElement) => void;
  goSetup: () => void;
  goDone: (plan: Plan) => void;
};

const BANNER_MS = 3000;
const GAP_NOTE_MS = 20000;

export function createRun(deps: Deps) {
  const runner = new Runner(() => performance.now());
  const cues = new CueTracker();
  const ring = createRing();
  let original: Plan = state.plan;
  let plan: Plan = state.plan;
  let raf = 0, interval = 0, lastFrame = 0, lastTick = 0, bannerTimer = 0, noteTimer = 0;
  let centerKey = "", agendaKey = "";

  // ---- DOM ------------------------------------------------------------------------
  const cEmoji = h("div", { class: "c-emoji", "aria-hidden": "true" });
  const cName = h("div", { class: "c-name" });
  const cBadge = h("div", { class: "c-badge" });
  const cClock = h("div", { class: "c-clock" });
  const cNext = h("div", { class: "c-next" });
  const bannerEl = h("div", { class: "slide-banner", "aria-hidden": "true", hidden: true });
  const wrap = h("div", { class: "ring-wrap" }, ring.svg, h("div", { class: "ring-center" }, cEmoji, cName, cBadge, cClock, cNext), bannerEl);
  const keys = h("details", { class: "keys" }, h("summary", {}, "Keyboard shortcuts"),
    h("p", {}, "Space: start, pause, resume. N: next activity. R: reset. F: fullscreen. Plus: add one minute. Minus: take one minute."));
  const agendaList = h("ol", { class: "agenda-list plain" });
  const noteEl = h("p", { class: "run-note", role: "status", "aria-live": "polite" });
  const awakeNote = h("p", { class: "run-note", hidden: true }, "This browser cannot keep the screen awake. Please turn off your computer's screen timeout instead.");
  const agenda = h("aside", { class: "agenda", "aria-label": "Agenda" }, h("h2", { class: "agenda-title" }), agendaList, noteEl, awakeNote, keys);

  const playBtn = h("button", { type: "button", class: "btn primary big", onclick: () => toggleRun() });
  const nextBtn = button([icon("next", 18), "Next activity"], () => next());
  const plusBtn = button([icon("plus", 18), "Add one minute"], () => minute(60));
  const minusBtn = button([icon("minus", 18), "Take one minute"], () => minute(-60));
  const resetBtn = button([icon("reset", 18), "Reset"], () => reset());
  const fsBtn = button([icon("full", 18), "Fullscreen"], () => { void toggleFullscreen(); });
  const numbers = toggle("Show numbers", true, (v) => { updateSettings({ showNumbers: v }); paint(true); });
  const chimeSel = h("select", { "aria-label": "Sound", onchange: () => { deps.sound.unlock(); updateSettings({ chime: chimeSel.value as Settings["chime"] }); } },
    ...(["off", "soft", "bell"] as const).map((c) => h("option", { value: c }, CHIMES_LABEL[c])));
  const vol = h("input", { type: "range", min: 0, max: 1, step: 0.05, "aria-label": "Volume", oninput: () => updateSettings({ volume: Number(vol.value) }) });
  const settingsBtn = button([icon("gear", 18), "Settings"], () => deps.openSettings(settingsBtn));
  const backBtn = button([icon("back", 18), "Back to setup"], () => back());
  const bar = h("div", { class: "controls", role: "toolbar", "aria-label": "Timer controls" },
    playBtn, nextBtn, plusBtn, minusBtn, resetBtn, fsBtn, numbers.el,
    h("label", { class: "inline-field" }, "Sound ", chimeSel), h("label", { class: "inline-field" }, "Volume ", vol), settingsBtn, backBtn);
  const root = h("div", { class: "run" }, h("div", { class: "run-stage" }, wrap, agenda), bar);
  let stopHide: (() => void) | null = null;

  // ---- helpers ---------------------------------------------------------------------
  const settings = () => state.settings;
  const slices = () => slicesOf(plan);
  const say = (m: string) => {
    noteEl.textContent = m;
    window.clearTimeout(noteTimer);
    if (m) noteTimer = window.setTimeout(() => { noteEl.textContent = ""; }, 8000);
  };

  function showBanner(text: string) {
    bannerEl.textContent = text;
    bannerEl.hidden = false;
    bannerEl.classList.remove("in");
    void bannerEl.getBoundingClientRect();
    if (!prefersReducedMotion()) bannerEl.classList.add("in");
    window.clearTimeout(bannerTimer);
    bannerTimer = window.setTimeout(() => { bannerEl.hidden = true; }, BANNER_MS);
  }

  function syncControls() {
    const st = settings();
    const state_ = runner.state;
    playBtn.replaceChildren(icon(state_ === "running" ? "pause" : "play", 22), state_ === "running" ? "Pause" : state_ === "paused" ? "Resume" : "Start");
    numbers.input.checked = st.showNumbers;
    chimeSel.value = st.chime;
    vol.value = String(st.volume);
    fsBtn.setAttribute("aria-pressed", isFullscreen() ? "true" : "false");
    awakeNote.hidden = !(st.keepScreenAwake && !wakeLockSupported());
    const idle = state_ === "idle";
    nextBtn.disabled = idle; plusBtn.disabled = idle; minusBtn.disabled = idle;
    resetBtn.disabled = idle;
  }

  function buildAgenda() {
    const sl = slices();
    (agenda.querySelector(".agenda-title") as HTMLElement).textContent = plan.name;
    agendaList.replaceChildren(...sl.map((s) => h("li", { "data-i": s.id },
      h("span", { class: "ag-mark" }),
      h("span", { class: "ag-swatch", style: `background:${s.free ? "#CBD3DC" : paletteHex(s.color)};color:${PALETTE_TEXT}` }, s.icon ?? ""),
      h("span", { class: "ag-name" }, s.name),
      h("span", { class: "ag-time" }, formatClock(s.seconds)),
      h("span", { class: "ag-flag" }))));
    agendaKey = "";
  }

  function paintAgenda(idx: number, done: boolean) {
    const key = `${idx}|${done}|${settings().showNumbers}|${slices().map((s) => s.seconds).join(",")}`;
    if (key === agendaKey) return;
    agendaKey = key;
    const sl = slices();
    Array.from(agendaList.children).forEach((li, i) => {
      const isDone = done || i < idx, cur = !done && i === idx, nxt = !done && i === idx + 1;
      li.className = isDone ? "done" : cur ? "current" : nxt ? "next" : "";
      if (cur) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
      const mark = li.querySelector(".ag-mark")!, flag = li.querySelector(".ag-flag")!, time = li.querySelector(".ag-time") as HTMLElement;
      mark.replaceChildren(...(isDone ? [icon("check", 20), h("span", { class: "sr-only" }, "Done: ")] : []));
      flag.textContent = cur ? "Now" : nxt ? "Up next" : "";
      time.textContent = formatClock(sl[i]?.seconds ?? 0);
      time.hidden = !settings().showNumbers;
    });
  }

  /** Redraw what changed. The ring skips work itself when the marker has not moved. */
  function paint(force = false) {
    const sl = slices();
    const el = runner.elapsed();
    const loc = locate(sl, el);
    ring.setElapsed(el);
    ring.setPulse(runner.state === "running" && !loc.done && loc.left <= 10);
    const cur = sl[loc.index];
    const nxt = sl[loc.index + 1];
    const showNum = settings().showNumbers;
    const shown = Math.ceil(loc.left - 1e-6);
    const key = `${loc.index}|${shown}|${runner.state}|${showNum}|${cur?.name}|${nxt?.name}|${cur?.icon}`;
    if (force || key !== centerKey) {
      centerKey = key;
      cEmoji.textContent = cur?.icon ?? "";
      cEmoji.hidden = !cur?.icon;
      cName.textContent = cur?.name ?? "";
      cBadge.textContent = runner.state === "paused" ? "Paused" : runner.state === "idle" ? "Ready to start" : "";
      cBadge.hidden = !cBadge.textContent;
      cClock.textContent = formatClock(shown);
      cClock.classList.toggle("long", shown >= 3600);
      cClock.hidden = !showNum;
      cNext.textContent = nxt ? `Up next: ${nxt.name}` : cur ? "Last activity" : "";
      cNext.hidden = !showNum;
    }
    paintAgenda(loc.index, loc.done);
  }

  // ---- the clock loop ---------------------------------------------------------------
  function handle(cs: Cue[]) {
    const sl = slices();
    for (const c of cs) {
      if (c.kind === "slice") {
        const s = sl[c.index];
        if (!s) continue;
        ring.bounce(c.index);
        showBanner(`${c.initial ? "Now" : "Next"}: ${s.name}`);
        deps.announce(`${c.initial ? "Starting" : "Next"}: ${s.name}, ${spokenLength(s.seconds)}`);
        if (!c.initial) {
          const a = ring.arcs()[c.index];
          if (a) ring.burst(a.start);
          const t = toneFor("change", settings());
          if (t) deps.sound.play(t, settings().volume);
        }
      } else if (c.kind === "warn") {
        const t = toneFor("warn", settings());
        if (t) deps.sound.play(t, settings().volume);
      } else if (c.kind === "done") {
        finish();
        return;
      }
    }
  }

  function tick() {
    if (runner.state === "idle") return;
    const now = performance.now();
    if (runner.state === "running" && lastTick && now - lastTick > GAP_NOTE_MS) {
      say("The page was asleep for a while. The timer has caught up to where it is now.");
    }
    lastTick = now;
    handle(cues.update(slices(), runner.elapsed()));
    if (!isIdle()) paint();
  }
  const isIdle = () => runner.state === "idle";

  function startLoop() {
    stopLoop();
    lastTick = performance.now();
    const frame = (t: number) => {
      raf = window.requestAnimationFrame(frame);
      if (t - lastFrame < 33) return; // about 30 frames per second
      lastFrame = t;
      tick();
    };
    raf = window.requestAnimationFrame(frame);
    interval = window.setInterval(tick, 1000); // keeps cues on time when frames are skipped
  }
  function stopLoop() { window.cancelAnimationFrame(raf); window.clearInterval(interval); raf = 0; interval = 0; }

  // ---- actions -------------------------------------------------------------------------
  function awake(on: boolean) { if (on && settings().keepScreenAwake) void keepAwake(); else if (!on) void releaseAwake(); }

  function start() {
    deps.sound.unlock(); // this runs inside the Start click, which the browser needs
    runner.start();
    awake(true);
    startLoop();
    syncControls();
    tick();
  }
  function toggleRun() {
    const s = runner.state;
    if (s === "idle") start();
    else if (s === "running") { runner.pause(); stopLoop(); awake(false); syncControls(); paint(true); deps.announce("Paused"); }
    else { deps.sound.unlock(); runner.resume(); awake(true); startLoop(); syncControls(); tick(); paint(true); deps.announce("Resumed"); }
  }
  function next() {
    if (runner.state === "idle") return;
    const sl = slices();
    const loc = locate(sl, runner.elapsed());
    if (loc.done) return;
    runner.setElapsed(nextStart(sl, loc.index));
    tick();
    paint(true);
  }
  function minute(delta: number) {
    if (runner.state === "idle") return;
    const r = adjustCurrent(plan, runner.elapsed(), delta);
    if (!r.ok) { say(r.message); return; }
    plan = r.plan;
    say("");
    ring.setSlices(slices(), true);
    buildAgenda();
    paint(true);
    deps.announce(delta > 0 ? "Added one minute" : "Took one minute off");
  }
  function reset() {
    if (runner.state === "idle") return;
    if (!window.confirm("Reset the timer back to the start?")) return;
    runner.reset(); cues.reset(); stopLoop(); awake(false);
    plan = original;
    ring.setSlices(slices());
    buildAgenda(); say("");
    bannerEl.hidden = true;
    syncControls(); paint(true);
  }
  function back() {
    if (runner.state !== "idle" && !window.confirm("Stop the timer and go back to setup?")) return;
    leave();
    deps.goSetup();
  }
  function finish() {
    stopLoop(); awake(false);
    const t = toneFor("change", settings());
    if (t) deps.sound.play(t, settings().volume);
    deps.announce("All done");
    const p = original;
    leave();
    deps.goDone(p);
  }
  function leave() {
    stopLoop(); awake(false);
    runner.reset(); cues.reset();
    stopHide?.(); stopHide = null;
    window.clearTimeout(bannerTimer);
    if (isFullscreen()) void toggleFullscreen();
  }

  // ---- public ----------------------------------------------------------------------------
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { tick(); if (runner.state !== "idle") paint(true); } });
  document.addEventListener("fullscreenchange", syncControls);

  return {
    el: root,
    /** Show the run screen for a plan. With `autostart` this must be called from a click or key press. */
    enter(p: Plan, autostart: boolean) {
      original = p; plan = p;
      runner.reset(); cues.reset(); stopLoop();
      ring.setMarker(settings().marker);
      ring.setSlices(slices());
      buildAgenda(); say(""); bannerEl.hidden = true;
      stopHide?.();
      bar.classList.remove("faded");
      stopHide = autoHideControls(bar, 4000);
      syncControls(); paint(true);
      if (autostart) start();
      window.setTimeout(() => playBtn.focus({ preventScroll: true }), 0);
    },
    /** Settings changed in the panel. */
    settingsChanged() {
      ring.setMarker(settings().marker);
      syncControls(); paint(true);
      if (runner.state === "running") awake(true);
      if (!settings().keepScreenAwake) void releaseAwake();
    },
    key(e: KeyboardEvent): boolean {
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      const t = e.target instanceof Element ? e.target : null;
      if (t && (t.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']") || t.closest("dialog[open]"))) return false;
      if (document.querySelector("dialog[open]")) return false;
      const k = e.key.toLowerCase();
      if (k === " ") {
        if (t && t.closest("button, summary, a")) return false; // let the focused control handle Space
        toggleRun();
      } else if (k === "n") next();
      else if (k === "r") reset();
      else if (k === "f") void toggleFullscreen();
      else if (k === "+" || k === "=") minute(60);
      else if (k === "-" || k === "_") minute(-60);
      else return false;
      e.preventDefault();
      return true;
    },
  };
}
