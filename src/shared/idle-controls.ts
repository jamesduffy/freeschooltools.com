/** Fade a controls bar out after `ms` of no mouse or key activity; show it again on any movement or key.
 *  Controls stay visible while they contain keyboard focus. Returns a stop function. */
export function autoHideControls(bar: HTMLElement, ms = 3000): () => void {
  let t: number | undefined;
  const show = () => { bar.classList.remove("faded"); window.clearTimeout(t); t = window.setTimeout(hide, ms); };
  const hide = () => { if (!bar.contains(document.activeElement)) bar.classList.add("faded"); else t = window.setTimeout(hide, ms); };
  const evs = ["mousemove", "mousedown", "keydown", "touchstart"] as const;
  evs.forEach((e) => window.addEventListener(e, show));
  show();
  return () => { evs.forEach((e) => window.removeEventListener(e, show)); window.clearTimeout(t); };
}
