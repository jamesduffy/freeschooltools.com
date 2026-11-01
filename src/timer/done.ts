import { h } from "../shared/dom";
import { prefersReducedMotion } from "./ring";
import type { Plan } from "./model";
import { button } from "./ui";

const COLORS = ["#F28B7D", "#F5A55B", "#F7D154", "#B5DB6A", "#6FD1A8", "#6EC3F0", "#8CA6F2", "#B493EA", "#F29BC7"];

export function createDone(onAgain: (p: Plan) => void, onBack: () => void) {
  let plan: Plan | null = null;
  let confetti: HTMLElement | null = null;
  let t = 0;
  const title = h("h1", { tabindex: "-1" }, "All done");
  const sub = h("p", { class: "done-sub" });
  const again = button("Run again", () => { if (plan) { stop(); onAgain(plan); } }, "primary big");
  const back = button("Back to setup", () => { stop(); onBack(); }, "big");
  const root = h("main", { class: "done" }, h("div", { class: "card done-card" }, title, sub, h("div", { class: "btn-row center" }, again, back)));

  function stop() { window.clearTimeout(t); confetti?.remove(); confetti = null; }

  return {
    el: root,
    /** About 60 simple confetti pieces for 3 seconds, then they are removed. Skipped with reduced motion. */
    show(p: Plan) {
      plan = p;
      stop();
      sub.textContent = `${p.name} is finished. Nice work, everyone.`;
      if (!prefersReducedMotion()) {
        confetti = h("div", { class: "confetti", "aria-hidden": "true" });
        for (let i = 0; i < 60; i++) {
          const piece = h("span", { class: "piece" });
          piece.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;background:${COLORS[i % COLORS.length]};animation-delay:${(Math.random() * 0.8).toFixed(2)}s;animation-duration:${(1.8 + Math.random() * 1.2).toFixed(2)}s;--drift:${Math.round(Math.random() * 120 - 60)}px;--spin:${Math.round(Math.random() * 540 + 180)}deg`;
          confetti.append(piece);
        }
        root.append(confetti);
        t = window.setTimeout(stop, 3000);
      }
      window.setTimeout(() => again.focus({ preventScroll: true }), 0);
    },
    stop,
  };
}
