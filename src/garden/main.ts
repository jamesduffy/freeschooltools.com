import "../shared/styles.css";
import "./garden.css";
import { h } from "../shared/dom";
import { footerText, logo } from "../shared/chrome";
import { boot, getStatus, subscribe } from "./state";
import { gardenView } from "./view-garden";
import { gardensView, newGardenView } from "./view-gardens";
import { shelfView } from "./view-shelf";
import { mountHomeLink } from "../shared/home-link";

const app = document.getElementById("app")!;
boot();

// ---- shell: shown on every screen except the full screen garden -------------------------
const saveBanner = h("div", { class: "save-banner", role: "alert", hidden: true });
const nav = h("nav", { class: "nav", "aria-label": "Main" },
  ...[["#/", "Gardens"], ["#/shelf", "Shelf"]].map(([href, text]) => h("a", { href, "data-nav": href }, text)));
const main = h("main", { class: "wrap", id: "main" });
const chrome = [
  h("header", { class: "site-header" }, h("div", { class: "wrap" }, h("a", { class: "brand", href: "#/" }, logo(), h("span", {}, "Class Garden")), nav)),
];
const footer = h("footer", { class: "site-footer" }, h("p", {}, footerText()), h("p", {}, h("a", { href: "/" }, "More free school tools")));
const stageHost = h("div", {});
app.append(h("a", { class: "skip", href: "#main", onclick: (e: Event) => { e.preventDefault(); (main.querySelector("h1") as HTMLElement | null)?.focus(); } }, "Skip to content"),
  saveBanner, ...chrome, main, footer, stageHost);

function paintStatus() {
  const { status, errorText } = getStatus();
  saveBanner.hidden = status !== "error";
  saveBanner.textContent = errorText;
}
subscribe(paintStatus);
paintStatus();

// ---- router: plain hash routes, no library -----------------------------------------------
let dispose: (() => void) | null = null;
const go = (hash: string) => { if (location.hash === hash) route(); else location.hash = hash; };

function route() {
  dispose?.(); dispose = null;
  main.replaceChildren(); stageHost.replaceChildren();
  const parts = (location.hash || "#/").split("/");
  const a = parts[1] ?? "", b = parts[2];
  const onGarden = a === "garden" && !!b;
  chrome.forEach((el) => { el.hidden = onGarden; });
  footer.hidden = main.hidden = onGarden;
  document.body.classList.toggle("garden-mode", onGarden);
  let title = "Class Garden";
  if (onGarden) dispose = gardenView(stageHost, b!, go);
  else if (a === "new") { newGardenView(main, go); title = "New garden · Class Garden"; }
  else if (a === "shelf") { shelfView(main, go); title = "Shelf · Class Garden"; }
  else gardensView(main, go);
  if (!onGarden) {
    document.title = title;
    const cur = a === "shelf" ? "#/shelf" : "#/";
    nav.querySelectorAll("a").forEach((el) => { if (el.getAttribute("data-nav") === cur) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current"); });
    window.scrollTo(0, 0);
    (main.querySelector("h1") as HTMLElement | null)?.focus({ preventScroll: true });
  }
}
window.addEventListener("hashchange", route);
route();

mountHomeLink();
