import { h } from "./dom";
import { CYCLE_MINUTES, START_POSITION, lightAt, phaseOf, positionAt, twilightAt, type Phase } from "./daynight";
import { guideIcon } from "./guide";

/** The look of day and night, shared by the tools that have it: a dark layer that fades in at night, a warm tint at dusk and dawn,
 *  and a small clock badge. Optional URL settings for trying it out: ?at=0.75 starts partway through the cycle (0 to 1),
 *  ?cycle=1 makes a whole cycle last 1 minute. */
export type DayNight = {
  clock: HTMLElement; // put this in a toolbar
  phase(): Phase;
  light(): number; // 1 in daylight, 0 in full night
  /** Add the night layers to a container. Call again after the container has been emptied. */
  mount(layer: HTMLElement): void;
  /** Call every frame. It only does work a few times a second. */
  tick(now: number): void;
};

const PHASE_TEXT: Record<Phase, string> = { day: "Day", dusk: "Dusk", night: "Night", dawn: "Dawn" };

export function createDayNight(opts: { onPhase?: (p: Phase) => void; onLight?: (light: number) => void; maxDark?: number } = {}): DayNight {
  const params = new URLSearchParams(location.search);
  const num = (k: string) => { const v = params.get(k); const n = v === null || v === "" ? NaN : Number(v); return Number.isFinite(n) ? n : null; };
  const cycleMs = Math.max(0.05, num("cycle") ?? CYCLE_MINUTES) * 60000;
  const startPos = num("at") ?? START_POSITION;
  const startedAt = performance.now();
  const where = (now: number) => positionAt(now - startedAt, cycleMs, startPos);
  const maxDark = opts.maxDark ?? 0.55;

  let phase: Phase = phaseOf(where(startedAt));
  let light = lightAt(where(startedAt));
  let layer: HTMLElement | null = null;
  let dark: HTMLElement | null = null, tint: HTMLElement | null = null;
  let last = -1e9;

  const icon = h("span", {});
  const label = h("span", {});
  const clock = h("span", { class: "clock", role: "status" }, icon, label);
  function paint() {
    icon.replaceChildren(guideIcon(phase === "day" ? "sun" : phase === "night" ? "moon" : "both", 18));
    label.textContent = PHASE_TEXT[phase];
    clock.setAttribute("aria-label", `It is ${PHASE_TEXT[phase].toLowerCase()}`);
  }
  paint();

  return {
    clock,
    phase: () => phase,
    light: () => light,
    mount(el) {
      layer = el;
      tint = h("div", { class: "twilight" });
      dark = h("div", { class: "dark" });
      el.append(tint, dark);
      last = -1e9;
    },
    tick(now) {
      if (now - last < 200) return;
      last = now;
      const pos = where(now);
      light = lightAt(pos);
      if (dark) dark.style.opacity = ((1 - light) * maxDark).toFixed(3);
      if (tint) tint.style.opacity = (twilightAt(pos) * 0.3).toFixed(3);
      layer?.classList.toggle("is-night", light < 0.4);
      opts.onLight?.(light);
      const next = phaseOf(pos);
      if (next !== phase) { phase = next; paint(); opts.onPhase?.(next); }
    },
  };
}
