import "../shared/styles.css";
import "./ocean.css";
import { h } from "../shared/dom";
import { autoHideControls } from "../shared/idle-controls";
import { toggleFullscreen } from "../shared/fullscreen";
import { mountHomeLink } from "../shared/home-link";
import { keepAwake, releaseAwake } from "../shared/wakelock";
import { Diver, type View } from "./diver";
import { Life } from "./life";
import { LEVELS, OceanRenderer } from "./render";
import { OceanSound } from "./sound";
import { buildWorld, type Poi, type World } from "./world";

/** Ocean Aquarium: a live underwater scene to leave running and watch. A diver swims slowly through it by itself.
 *  Drag to look around, and the head drifts back. Everything is drawn in code; nothing is downloaded, recorded or sent. */

const KEY = "ocean-aquarium";
type Settings = { detail: "auto" | "0" | "1" | "2"; sound: boolean };
function loadSettings(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Settings>;
    return { detail: s.detail === "0" || s.detail === "1" || s.detail === "2" ? s.detail : "auto", sound: false };
  } catch { return { detail: "auto", sound: false }; }
}
function saveSettings(s: Settings) { try { localStorage.setItem(KEY, JSON.stringify({ detail: s.detail })); } catch { /* storage unavailable: fine */ } }

function guessLevel(): number {
  const coarse = matchMedia("(pointer: coarse)").matches;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency || 4;
  if (coarse) return mem > 6 ? 1 : 2;
  if (mem <= 4 || cores <= 2) return 2;
  if (cores <= 4) return 1;
  return 0;
}

const settings = loadSettings();
const app = document.getElementById("app")!;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

function failure(msg: string, detail?: string) {
  app.replaceChildren(h("div", { class: "oc-msg", role: "alert" }, h("div", {},
    h("h1", {}, "The ocean could not open"),
    h("p", {}, msg),
    h("p", {}, "Try a recent version of Chrome, Edge, Firefox or Safari, and make sure hardware acceleration is turned on in the browser settings."),
    h("p", {}, "Meanwhile, the ", h("a", { href: "/fishtank/" }, "Fish Tank"), " and ", h("a", { href: "/aquarium/" }, "Quiet Aquarium"), " work everywhere."),
    detail ? h("p", { style: "opacity:.6;font-size:14px" }, detail) : null)));
}

function start() {
  const canvas = h("canvas", { class: "oc-canvas", role: "img", "aria-label": "A live underwater scene. A diver swims slowly through kelp, coral and fish. Drag to look around." });
  const loadBar = h("i", {});
  const loading = h("div", { class: "oc-load", role: "status" }, h("div", {}, "Filling the ocean…"), h("div", { class: "bar" }, loadBar));
  const depthEl = h("span", { class: "oc-pill" }, "Depth 0 m");
  const hud = h("div", { class: "oc-hud" }, depthEl);
  const captionText = h("span", { "aria-live": "polite" });
  const caption = h("div", { class: "oc-caption" }, captionText);
  const root = h("div", { class: "oc-root" }, canvas, h("div", { class: "oc-vignette" }), hud, caption, loading);
  app.replaceChildren(root);
  mountHomeLink();
  const step = (p: number) => { loadBar.style.width = `${p}%`; };

  // let the loading screen paint, then build the world in a few pieces
  step(10);
  window.setTimeout(() => {
    let world: World, level = settings.detail === "auto" ? guessLevel() : Number(settings.detail);
    let life: Life, renderer: OceanRenderer;
    try {
      world = buildWorld(1);
      step(45);
      life = new Life(Date.now() % 1000, LEVELS[level]!.life);
      try { renderer = new OceanRenderer(canvas, world, life, level); }
      catch (e) { failure("This browser could not start 3D graphics (WebGL 2).", e instanceof Error ? e.message : undefined); return; }
    } catch (e) { failure("Something went wrong while building the ocean.", e instanceof Error ? e.message : undefined); return; }
    step(100);
    run(world, life, renderer, level);
  }, 60);

  function run(world: World, life0: Life, renderer: OceanRenderer, level0: number) {
    let life = life0, level = level0;
    const sound = new OceanSound();
    const pois = (): Poi[] => [...world.pois, ...life.pois];
    const w = world.wreck, away = Math.atan2(w.z, w.x), sx = w.x - Math.cos(away) * 6, sz = w.z - Math.sin(away) * 6; // swim in toward the wreck from the middle of the reef
    const diver = new Diver(Math.floor(Math.random() * 1e6) + 1, pois, { x: w.x * 0.45, z: w.z * 0.45 + 6, toX: sx + 0 * w.x, toZ: sz });
    if (reduceMotion) diver.pace = 0.7;
    if (import.meta.env.DEV) (window as unknown as { __ocean: unknown }).__ocean = { diver, get life() { return life; }, renderer, world };
    let paused = false;

    // ---- toolbar
    const soundBtn = h("button", { type: "button", class: "oc-btn", "aria-pressed": "false" }, "Sound off");
    soundBtn.addEventListener("click", async () => {
      if (sound.enabled) { sound.disable(); } else { await sound.enable(); }
      soundBtn.setAttribute("aria-pressed", String(sound.enabled)); soundBtn.textContent = sound.enabled ? "Sound on" : "Sound off";
    });
    const pauseBtn = h("button", { type: "button", class: "oc-btn", "aria-pressed": "false", title: "Hold the diver still" }, "Hold still");
    const setPause = (p: boolean) => { paused = p; diver.paused = p; pauseBtn.setAttribute("aria-pressed", String(p)); pauseBtn.textContent = p ? "Keep swimming" : "Hold still"; };
    pauseBtn.addEventListener("click", () => setPause(!paused));
    const fsBtn = h("button", { type: "button", class: "oc-btn" }, "Full screen");
    fsBtn.addEventListener("click", () => { void toggleFullscreen(root); });
    document.addEventListener("fullscreenchange", () => { fsBtn.textContent = document.fullscreenElement ? "Exit full screen" : "Full screen"; document.body.classList.toggle("is-fullscreen", !!document.fullscreenElement); });
    const sel = h("select", { class: "oc-sel", "aria-label": "Detail level" },
      h("option", { value: "auto" }, "Detail: Auto"), ...LEVELS.map((l, i) => h("option", { value: String(i) }, `Detail: ${l.name}`))) as HTMLSelectElement;
    sel.value = settings.detail;
    sel.addEventListener("change", () => { settings.detail = sel.value as Settings["detail"]; saveSettings(settings); applyLevel(settings.detail === "auto" ? guessLevel() : Number(settings.detail)); });
    const aboutBtn = h("button", { type: "button", class: "oc-btn", "aria-expanded": "false" }, "About");
    let about: HTMLElement | null = null;
    aboutBtn.addEventListener("click", () => {
      if (about) { about.remove(); about = null; aboutBtn.setAttribute("aria-expanded", "false"); return; }
      about = h("div", { class: "oc-about", role: "region", "aria-label": "About this tool" },
        h("h2", {}, "Ocean Aquarium"),
        h("p", {}, "A diver swims slowly and by itself through a reef made entirely by code: kelp, coral, sponges, a shipwreck, fish schools, mantas and jellyfish. Leave it running on a screen and watch."),
        h("p", {}, "Drag to look around. The diver's head drifts back on its own. Keys: Space holds still, M sound, F full screen, H hides the buttons."),
        h("p", {}, "Nothing is downloaded, recorded or sent anywhere."),
        h("p", {}, "The water look (colours fading with depth, caustic light, sun shafts, swaying kelp) borrows ideas from the MIT-licensed ", h("a", { href: "https://github.com/Noniv/abyssal-garden", rel: "noopener" }, "Abyssal Garden"), " by Maksymilian Dendura, rewritten here so it works on ordinary school computers."));
      root.append(about); aboutBtn.setAttribute("aria-expanded", "true");
    });
    const bar = h("div", { class: "oc-bar", role: "toolbar", "aria-label": "Ocean Aquarium controls" }, soundBtn, pauseBtn, fsBtn, sel, aboutBtn);
    root.append(bar);
    autoHideControls(bar, 4000);
    autoHideControls(hud, 4000);

    // ---- looking around: drag with a mouse or finger
    let dragging = false, lx = 0, ly = 0;
    canvas.addEventListener("pointerdown", (e) => { dragging = true; lx = e.clientX; ly = e.clientY; diver.holdLook(true); canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const k = 0.0055;
      diver.nudge(-(e.clientX - lx) * k, (e.clientY - ly) * k);
      lx = e.clientX; ly = e.clientY;
    });
    const up = () => { dragging = false; diver.holdLook(false); };
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    window.addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLSelectElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " " && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); setPause(!paused); }
      else if (e.key === "m" || e.key === "M") soundBtn.click();
      else if (e.key === "f" || e.key === "F") fsBtn.click();
      else if (e.key === "h" || e.key === "H") root.classList.toggle("hide-ui");
      else if (e.key === "Escape" && about) aboutBtn.click();
    });
    window.addEventListener("keydown", () => { void keepAwake(); }, { once: true });
    window.addEventListener("pointerdown", () => { void keepAwake(); }, { once: true });
    window.addEventListener("pagehide", () => { void releaseAwake(); sound.dispose(); });
    document.addEventListener("visibilitychange", () => sound.setHidden(document.hidden));
    window.addEventListener("resize", () => renderer.resize());

    // ---- changing detail rebuilds the animals at the new count
    function applyLevel(l: number) {
      if (l === level) return;
      level = l;
      renderer.setLevel(l);
      life = new Life(Date.now() % 1000, LEVELS[l]!.life);
      renderer.setLife(life);
      renderer.resize(Math.min(renderer.scale, LEVELS[l]!.scaleMax));
      msPoor = 0; msGood = 0;
    }

    // ---- caption and depth
    let shownName = "", captionTimer = 0, lastDepth = -1;
    function updateHud(dt: number, v: View) {
      const d = Math.round(-diver.y);
      if (d !== lastDepth) { lastDepth = d; depthEl.textContent = `Depth ${d} m`; }
      // only name something that is really in front of the camera
      let name = "";
      const wp = diver.watching;
      if (wp) {
        const dx = wp.x - v.x, dy = wp.y - v.y, dz = wp.z - v.z, dist = Math.hypot(dx, dy, dz);
        const cp = Math.cos(v.pitch), dot = (dx * Math.cos(v.yaw) * cp + dy * Math.sin(v.pitch) + dz * Math.sin(v.yaw) * cp) / (dist || 1);
        if (dist < 32 && dot > 0.9) name = wp.name;
      }
      captionTimer += dt;
      if (name && name !== shownName) { shownName = name; captionTimer = 0; captionText.textContent = `Watching ${name}`; captionText.classList.add("show"); }
      else if (shownName && (!name || captionTimer > 14)) { if (!name) shownName = ""; captionText.classList.remove("show"); }
    }

    // ---- main loop, with automatic resolution and detail control
    renderer.resize(Math.min(1, LEVELS[level]!.scaleMax));
    let last = performance.now(), t = 0, emaMs = 16, msPoor = 0, msGood = 0, frame = 0;
    const loop = (now: number) => {
      requestAnimationFrame(loop);
      if (renderer.isLost) { failure("The graphics card stopped the ocean. Reload the page to dive back in."); return; }
      const dt = Math.min((now - last) / 1000, 0.1); last = now;
      if (dt <= 0) return;
      t += dt;
      diver.update(dt);
      const v = diver.view();
      life.update(dt, v.x, v.y, v.z);
      renderer.draw(v, t, dt);
      updateHud(dt, v);
      if (frame++ === 3) loading.classList.add("done");
      if (frame === 90) loading.remove();

      emaMs += (dt * 1000 - emaMs) * 0.05;
      const slow = emaMs > 26, fast = emaMs < 15;
      msPoor = slow ? msPoor + 1 : 0; msGood = fast ? msGood + 1 : 0;
      // keep it smooth: first lower the resolution, then (in Auto) the amount of detail
      if (msPoor > 90) {
        msPoor = 0;
        if (renderer.scale > 0.6) renderer.resize(Math.max(0.55, renderer.scale - 0.12));
        else if (settings.detail === "auto" && level < 2) applyLevel(level + 1);
      } else if (msGood > 400 && renderer.scale < LEVELS[level]!.scaleMax) { msGood = 0; renderer.resize(Math.min(LEVELS[level]!.scaleMax, renderer.scale + 0.08)); }
    };
    requestAnimationFrame(loop);
  }
}

start();
