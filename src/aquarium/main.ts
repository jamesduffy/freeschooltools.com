import "../shared/styles.css";
import "./aquarium.css";
import { h } from "../shared/dom";
import { banner, footerText, logo } from "../shared/chrome";
import { toggleFullscreen } from "../shared/fullscreen";
import { autoHideControls } from "../shared/idle-controls";
import { fishSvg, spriteSheet } from "./art";
import { SESSION_LABEL, SESSION_MULTIPLIER, SPECIES, SOUND, formatClock, minutesText, type SessionLength } from "./config";
import { growthProgress, growthScale } from "./engine";
import type { ErrorKind } from "./mic";
import { Mic } from "./mic";
import { READ_INTERVAL_MS, Session } from "./session";
import { loadStore, saveStore, type KV, type Store } from "./storage";
import { Tank } from "./tank";
import { mountHomeLink } from "../shared/home-link";

// ---- storage ----------------------------------------------------------------------
function getKV(): KV | null { try { return window.localStorage; } catch { return null; } }
const kv = getKV();
const loaded = loadStore(kv);
const store: Store = loaded.store;

let saveTimer: number | undefined;
function saveNow() {
  window.clearTimeout(saveTimer); saveTimer = undefined;
  store.tank = { bank: session.engine.bank, arrived: session.engine.arrived };
  saveStore(kv, store);
}
function saveSoon() { if (saveTimer === undefined) saveTimer = window.setTimeout(saveNow, 600); }

// ---- session -----------------------------------------------------------------------
const session = new Session(new Mic(), store.settings, store.tank.bank, store.tank.arrived);
let view: "start" | "collection" | "play" = "start";
const app = document.getElementById("app")!;
const tank = new Tank();
let cardQueue: number[] = [];
let cardTimer: number | undefined;
let ticker: number | undefined;
let lastTick = 0;
let ticks = 0;
let stopAutoHide: (() => void) | null = null;
let lastScale = -1;

session.onArrive = (i) => {
  const sp = SPECIES[i];
  if (!sp) return;
  if (!store.discovered.includes(sp.id)) store.discovered.push(sp.id);
  tank.show(i + 1, false);
  if (store.settings.showFactCards) { cardQueue.push(i); showNextCard(); }
  saveNow();
};
session.onChange = () => {
  if (view === "start") {
    if (session.phase === "calibrating") goPlay(); else paintStart();
  } else if (view === "play") paintPlay();
};

function startTicker() {
  if (ticker !== undefined) return;
  lastTick = performance.now();
  ticker = window.setInterval(() => {
    const now = performance.now();
    const dt = now - lastTick; lastTick = now;
    session.tick(dt);
    if (++ticks % 100 === 0 && session.phase === "running") saveSoon(); // about every 10 seconds
  }, READ_INTERVAL_MS);
}
function stopTicker() { window.clearInterval(ticker); ticker = undefined; }

// Stop the microphone completely whenever the tab is hidden or the page goes away.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") { session.pause("hidden"); saveNow(); }
});
window.addEventListener("pagehide", () => { session.end(); saveNow(); });

// ---- shared bits -------------------------------------------------------------------
function statusPill(cls = ""): HTMLElement {
  const on = session.listening;
  return h("span", { class: `aq-status ${cls} ${on ? "on" : ""}`, role: "status" }, h("span", { class: "aq-dot", "aria-hidden": "true" }), on ? "Listening" : "Not listening");
}

const MESSAGES: Record<ErrorKind, string[]> = {
  denied: [
    "The microphone is turned off for this page. To allow it, click the lock icon next to the web address, switch Microphone to Allow, and press Try again.",
    "This tool only measures how loud the room is. Nothing is recorded or saved. If it is already allowed, this computer's settings may block the microphone. Ask your school's tech team.",
  ],
  nomic: ["No microphone was found. Check that one is plugged in and turned on, then press Try again."],
  blocked: ["This computer's settings may block the microphone. Ask your school's tech team."],
  other: ["The microphone could not start. Press Try again."],
};
const PAUSE_MESSAGES = {
  user: "Listening is paused and the microphone is off. Fish are waiting for you.",
  hidden: "This tab was hidden, so listening stopped and the microphone was turned off. Press Resume when you are ready.",
  unplugged: "The microphone stopped working. It may have been unplugged. Check it, then press Resume.",
} as const;

function errorBox(kind: ErrorKind, extra?: Node): HTMLElement {
  return h("div", { class: "aq-msg", role: "alert" }, ...MESSAGES[kind].map((t) => h("p", {}, t)), extra);
}

function focusSoon(el: HTMLElement | null) { window.setTimeout(() => el?.focus({ preventScroll: true }), 0); }

// ---- start screen -------------------------------------------------------------------
function chrome(main: HTMLElement): HTMLElement[] {
  return [
    h("a", { class: "skip", href: "#main", onclick: (e: Event) => { e.preventDefault(); (main.querySelector("h1") as HTMLElement | null)?.focus(); } }, "Skip to content"),
    banner("Prototype. Measures volume only. Nothing is recorded or sent anywhere."),
    h("header", { class: "site-header" }, h("div", { class: "wrap" },
      h("a", { class: "brand", href: "/" }, logo(), h("span", {}, "Quiet Aquarium")), statusPill())),
    main,
    h("footer", { class: "site-footer" }, h("p", {}, footerText()), h("p", {}, h("a", { href: "/" }, "More free school tools"))),
  ];
}

function goStart() {
  stopAutoHide?.(); stopAutoHide = null; stopTicker();
  clearCard();
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  view = "start";
  paintStart(true);
}

function paintStart(focusHeading = false) {
  if (view !== "start") return;
  const busy = session.phase === "starting";
  const radios = (Object.keys(SESSION_LABEL) as SessionLength[]).map((k) => {
    const input = h("input", { type: "radio", name: "len", value: k, onchange: () => { store.settings.session = k; saveSoon(); } }) as HTMLInputElement;
    input.checked = store.settings.session === k;
    return h("label", {}, input, SESSION_LABEL[k]);
  });
  const retry = h("div", { class: "btn-row" }, h("button", { type: "button", class: "btn primary", onclick: () => { void session.start(); } }, "Try again"));
  const main = h("main", { class: "wrap", id: "main" }, h("div", { class: "card aq-start" },
    h("h1", { tabindex: "-1" }, "Quiet Aquarium"),
    h("p", {}, "Fish grow, and rarer ones swim in, the longer your class stays calm."),
    h("p", { class: "aq-privacy" }, "Measures how loud the room is. Nothing is recorded or saved."),
    h("fieldset", {}, h("legend", {}, "Session length"), h("div", { class: "aq-seg" }, ...radios),
      h("p", { class: "muted" }, "Short brings fish in twice as fast. Long takes twice as long.")),
    session.phase === "error" && session.error ? errorBox(session.error, retry) : null,
    h("div", { class: "btn-row" },
      h("button", { type: "button", class: "btn primary", id: "aq-start", disabled: busy, onclick: () => { void session.start(); } }, busy ? "Waiting for the microphone…" : "Start"),
      h("button", { type: "button", class: "linklike", onclick: () => { view = "collection"; paintCollection(); } }, "See the fish collection")),
    h("p", { class: "muted" }, "Press Start and your browser will ask to use the microphone. Then the tool spends 5 seconds learning how loud your room usually is.")));
  app.replaceChildren(...chrome(main));
  if (focusHeading) focusSoon(main.querySelector("h1"));
}

// ---- collection ---------------------------------------------------------------------
function paintCollection() {
  const mult = SESSION_MULTIPLIER[store.settings.session];
  const items = SPECIES.map((sp) => {
    const found = store.discovered.includes(sp.id);
    return h("li", { class: "card aq-item" },
      h("div", { class: `art ${found ? "" : "sil"}`, role: "img", "aria-label": found ? sp.name : "Fish not found yet" }, fishSvg(sp.id)),
      found
        ? [h("h2", {}, sp.name), h("p", {}, h("span", { class: "tag" }, sp.rarity)), h("p", {}, sp.fact)]
        : [h("h2", {}, "Not found yet"), h("p", {}, `Needs ${minutesText(sp.at * mult)} of calm time (${SESSION_LABEL[store.settings.session]} session).`)]);
  });
  const main = h("main", { class: "wrap", id: "main" },
    h("div", { class: "page-head" }, h("h1", { tabindex: "-1" }, "Fish collection"),
      h("button", { type: "button", class: "btn", onclick: () => { view = "start"; paintStart(true); } }, "Back")),
    h("ul", { class: "aq-grid" }, ...items));
  app.replaceChildren(h("div", { style: "position:absolute;width:0;height:0" }, spriteSheet()), ...chrome(main));
  focusSoon(main.querySelector("h1"));
}

// ---- play screen --------------------------------------------------------------------
type PlayEls = {
  root: HTMLElement; status: HTMLElement; clock: HTMLElement; meter: HTMLElement; meterFill: HTMLElement; meterMark: HTMLElement;
  cardSlot: HTMLElement; overlay: HTMLElement; controls: HTMLElement; pauseBtn: HTMLButtonElement; progress: HTMLElement | null;
};
let els: PlayEls | null = null;
let overlayKey = "";

function goPlay() {
  view = "play";
  tank.clear();
  tank.show(session.engine.arrived, true);
  lastScale = -1;
  app.replaceChildren(buildPlay());
  startTicker();
  paintPlay();
  stopAutoHide = autoHideControls(els!.controls, 4000);
}

function check(label: string, hint: string | null, get: () => boolean, set: (v: boolean) => void): HTMLElement {
  const input = h("input", { type: "checkbox", onchange: (e: Event) => { set((e.target as HTMLInputElement).checked); saveSoon(); paintPlay(); } }) as HTMLInputElement;
  input.checked = get();
  return h("label", { class: "aq-check" }, input, h("span", {}, label, hint ? h("small", {}, hint) : null));
}

function buildPlay(): HTMLElement {
  const st = store.settings;
  const status = h("span");
  const clock = h("div", { class: "aq-clock" });
  const meterFill = h("div", { class: "aq-meter-fill" });
  const meterMark = h("div", { class: "aq-meter-mark", style: "left:60%" });
  const meter = h("div", { class: "aq-meter", "aria-hidden": "true" }, meterFill, meterMark);
  const cardSlot = h("div", { role: "status", "aria-live": "polite" });
  const overlay = h("div");
  const pauseBtn = h("button", { type: "button", class: "btn", onclick: () => { if (session.phase === "paused" || session.phase === "error") void session.resume(); else session.pause("user"); } }, "Pause listening");

  const slider = h("input", { type: "range", id: "aq-sens", min: SOUND.offsetMinDb, max: SOUND.offsetMaxDb, step: 1, value: st.sensitivityDb,
    "aria-valuetext": `${st.sensitivityDb} decibels above the room's usual level`,
    oninput: (e: Event) => { const v = Number((e.target as HTMLInputElement).value); st.sensitivityDb = v; (e.target as HTMLElement).setAttribute("aria-valuetext", `${v} decibels above the room's usual level`); saveSoon(); } }) as HTMLInputElement;

  const newTank = h("span", { class: "aq-confirm" });
  const paintNewTank = (confirming: boolean) => {
    newTank.replaceChildren(...(confirming
      ? [h("span", { role: "alert" }, "Clear this tank and start over? Fish you have found stay in the collection."),
         h("button", { type: "button", class: "btn", id: "aq-newtank-yes", onclick: () => { session.newTank(); tank.clear(); tank.show(0, true); lastScale = -1; saveNow(); paintNewTank(false); paintPlay(); } }, "Yes, clear it"),
         h("button", { type: "button", class: "btn", onclick: () => { paintNewTank(false); focusSoon(newTank.querySelector("button")); } }, "Keep it")]
      : [h("button", { type: "button", class: "btn", id: "aq-newtank", onclick: () => { paintNewTank(true); focusSoon(newTank.querySelector("#aq-newtank-yes")); } }, "New tank")]));
  };
  paintNewTank(false);

  const controls = h("div", { class: "aq-controls", role: "group", "aria-label": "Aquarium controls" },
    h("div", { class: "row" },
      pauseBtn,
      h("button", { type: "button", class: "btn", id: "aq-recal", onclick: () => { void session.recalibrate(); } }, "Recalibrate"),
      h("label", { class: "aq-slider", for: "aq-sens" }, "Sensitivity", h("small", {}, "Stricter"), slider, h("small", {}, "More relaxed")),
      h("button", { type: "button", class: "btn", id: "aq-full", onclick: () => { void toggleFullscreen(els!.root); } }, "Fullscreen"),
      h("button", { type: "button", class: "btn", id: "aq-end", onclick: () => { session.end(); saveNow(); goStart(); } }, "End session")),
    h("div", { class: "row" },
      check("Loud moments pause growth", "For rooms where quiet is not possible, turn this off.", () => st.loudPausesGrowth, (v) => { st.loudPausesGrowth = v; }),
      check("Show meter", null, () => st.showMeter, (v) => { st.showMeter = v; }),
      check("Show calm time", null, () => st.showCalmTime, (v) => { st.showCalmTime = v; }),
      check("Show fact cards", null, () => st.showFactCards, (v) => { st.showFactCards = v; if (!v) clearCard(); }),
      newTank));

  const root = h("div", { class: "aq-play", id: "aq-play" }, tank.el, status, meter, clock, cardSlot, overlay, controls);
  els = { root, status, clock, meter, meterFill, meterMark, cardSlot, overlay, controls, pauseBtn, progress: null };
  overlayKey = "";
  return root;
}

function paintPlay() {
  if (!els || view !== "play") return;
  const e = els;
  const st = store.settings;
  const phase = session.phase;

  const pill = statusPill("hud");
  e.status.replaceWith(pill); e.status = pill;

  // meter
  e.meter.hidden = !st.showMeter;
  e.meterFill.style.width = `${(session.meter * 100).toFixed(1)}%`;
  e.meter.classList.toggle("over", session.roomState === "noisy");
  e.meterMark.style.left = "60%";

  // calm time (the only number on screen, optional)
  e.clock.hidden = !st.showCalmTime;
  e.clock.textContent = `Calm time ${formatClock(session.engine.bank)}`;

  // growth
  const mult = session.multiplier;
  const scale = growthScale(growthProgress(session.engine, mult));
  if (Math.abs(scale - lastScale) > 0.004) { tank.setScale(scale); lastScale = scale; }

  e.pauseBtn.textContent = phase === "paused" || phase === "error" ? "Resume" : "Pause listening";
  e.pauseBtn.disabled = phase === "starting";

  // overlay
  const key = phase === "paused" ? `paused-${session.pauseReason}` : phase === "error" ? `error-${session.error}` : phase;
  if (phase === "calibrating") {
    if (overlayKey !== "calibrating") {
      const bar = h("div", { style: "width:0" });
      e.overlay.replaceChildren(h("div", { class: "aq-overlay" }, h("div", { class: "aq-panel" },
        h("h2", {}, "Room check"),
        h("p", {}, "Learning how loud your room is. Start when it feels calm."),
        h("div", { class: "aq-progress", role: "progressbar", "aria-label": "Room check", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": 0 }, bar))));
      e.progress = bar; overlayKey = "calibrating";
    }
    const pct = Math.round(session.calibrationProgress * 100);
    if (e.progress) { e.progress.style.width = `${pct}%`; e.progress.parentElement?.setAttribute("aria-valuenow", String(pct)); }
  } else if (phase === "paused" || phase === "error" || phase === "starting") {
    if (overlayKey !== key) {
      overlayKey = key;
      const btns = h("div", { class: "btn-row" },
        phase === "starting" ? null : h("button", { type: "button", class: "btn primary", id: "aq-overlay-resume", onclick: () => { void session.resume(); } }, phase === "error" ? "Try again" : "Resume"),
        phase === "error" ? h("button", { type: "button", class: "btn", onclick: () => { session.end(); goStart(); } }, "Back to start") : null);
      const body: Node[] = phase === "error" && session.error
        ? [h("h2", {}, "Not listening"), ...MESSAGES[session.error].map((t) => h("p", {}, t))]
        : phase === "starting"
          ? [h("h2", {}, "Waiting for the microphone"), h("p", {}, "Your browser may ask to use the microphone.")]
          : [h("h2", {}, "Listening is paused"), h("p", {}, PAUSE_MESSAGES[session.pauseReason ?? "user"])];
      e.overlay.replaceChildren(h("div", { class: "aq-overlay", role: phase === "error" ? "alert" : "status" }, h("div", { class: "aq-panel" }, ...body, btns)));
      focusSoon(e.overlay.querySelector("#aq-overlay-resume"));
    }
  } else if (overlayKey !== "") {
    e.overlay.replaceChildren(); overlayKey = "";
    focusSoon(e.pauseBtn);
  }
}

// ---- fact cards ---------------------------------------------------------------------
function clearCard() {
  window.clearTimeout(cardTimer); cardTimer = undefined; cardQueue = [];
  els?.cardSlot.replaceChildren();
}
function showNextCard() {
  if (cardTimer !== undefined || !els) return;
  const i = cardQueue.shift();
  if (i === undefined) return;
  const sp = SPECIES[i];
  if (!sp) return;
  els.cardSlot.replaceChildren(h("div", { class: "aq-card" },
    h("div", { class: "kicker" }, "A new visitor"),
    h("h2", {}, sp.name),
    h("p", {}, h("span", { class: "tag" }, sp.rarity)),
    h("p", { style: "margin-top:8px" }, sp.fact),
    store.settings.showCalmTime ? h("p", { class: "small" }, `Your class kept the room calm for ${minutesText(session.engine.bank)}.`) : null));
  cardTimer = window.setTimeout(() => { cardTimer = undefined; els?.cardSlot.replaceChildren(); showNextCard(); }, 8000);
}

// ---- boot ---------------------------------------------------------------------------
window.addEventListener("beforeunload", () => { if (view === "play") session.end(); });
paintStart();

mountHomeLink();
