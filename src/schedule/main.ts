import "../shared/styles.css";
import "./schedule.css";
import { h } from "../shared/dom";
import { boot, flushSave, getBlocked, clearBlockedAndReset } from "./state";
import { deleteAllToolKeys, downloadText } from "./storage";
import { installSprite } from "./render";
import { editView } from "./view-edit";
import { boardView } from "./view-board";
import { mountHomeLink } from "../shared/home-link";

const app = document.getElementById("app")!;
boot();
installSprite();

let cleanup: (() => void) | null = null;

function blockedView(root: HTMLElement) {
  const b = getBlocked()!;
  root.replaceChildren(h("main", { class: "wrap", id: "main", style: "padding-top:32px" }, h("h1", { tabindex: "-1" }, "Saved data was not opened"),
    h("section", { class: "card" },
      h("p", {}, b.kind === "newer"
        ? "The data saved in this browser was written by a newer version of this tool, so it was left alone and nothing here can change it."
        : `The data saved in this browser could not be read (${b.reason}). It was left alone and nothing here can change it.`),
      h("p", {}, "You can save a copy of the raw saved text to a file, so nothing is lost."),
      h("div", { class: "btn-row" },
        h("button", { type: "button", class: "btn primary", onclick: () => downloadText("schedule-raw-saved-data.txt", b.raw, "text/plain") }, "Save the raw saved text"),
        h("button", { type: "button", class: "btn danger", onclick: () => {
          if (!confirm("Delete the unreadable saved data and start fresh? Save the raw text first if you want to keep it.")) return;
          try { deleteAllToolKeys(window.localStorage); } catch { /* ignore */ }
          clearBlockedAndReset(); location.hash = "#/edit"; location.reload();
        } }, "Delete it and start fresh")))));
  document.title = "Saved data not opened · Visual Schedule Board";
}

function route() {
  cleanup?.(); cleanup = null;
  document.body.classList.remove("board-open");
  if (getBlocked()) { blockedView(app); return; }
  if ((location.hash || "#/edit") === "#/board") {
    document.title = "Board · Visual Schedule Board";
    cleanup = boardView(app);
  } else {
    document.title = "Visual Schedule Board";
    cleanup = editView(app);
    window.scrollTo(0, 0);
  }
}
window.addEventListener("hashchange", route);
window.addEventListener("pagehide", flushSave);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushSave(); });
route();

mountHomeLink();
