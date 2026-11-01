import { autoHideControls } from "./idle-controls";

/** A small "All tools" link in the top-left corner of a tool, back to the main menu.
 *  It fades out when the mouse and keyboard are idle (so it never sits on a classroom projector),
 *  comes back on any movement or key press, and is hidden when printing and in fullscreen.
 *  `confirmLeave` can return a question to ask first when leaving would lose unsaved work. */
export function mountHomeLink(confirmLeave?: () => string | null): void {
  if (document.getElementById("home-pill")) return;
  const style = document.createElement("style");
  style.textContent = `
#home-pill{position:fixed;top:max(10px,env(safe-area-inset-top));left:max(10px,env(safe-area-inset-left));z-index:99999;display:inline-flex;align-items:center;gap:6px;
 min-height:36px;padding:6px 12px;border-radius:999px;background:#fff;color:#1b2430;border:1px solid #8793a3;box-shadow:0 1px 4px rgba(0,0,0,.25);
 font:700 16px/1.2 "Atkinson Hyperlegible",system-ui,sans-serif;text-decoration:none}
#home-pill:hover{background:#e8eef0;color:#1b2430}
#home-pill:focus-visible{outline:3px solid #1b6bd8;outline-offset:2px}
#home-pill.faded{opacity:0;pointer-events:none;transition:opacity .4s}
#home-pill.faded:focus-visible{opacity:1;pointer-events:auto}
:fullscreen #home-pill,body.is-fullscreen #home-pill{display:none}
@media print{#home-pill{display:none}}`;
  const a = document.createElement("a");
  a.id = "home-pill";
  a.href = "/";
  a.textContent = "← All tools";
  a.setAttribute("aria-label", "Back to all free school tools");
  a.addEventListener("click", (e) => {
    const q = confirmLeave?.();
    if (q && !confirm(q)) e.preventDefault();
  });
  document.head.append(style);
  document.body.append(a);
  autoHideControls(a, 4000);
}
