import "../shared/styles.css";
import "./home.css";
import { h } from "../shared/dom";
import { footerText, logo } from "../shared/chrome";
import { SUGGESTION_FORM_URL, tools } from "../tools";

const app = document.getElementById("app")!;

const toolCards = tools.map((t) =>
  h("article", { class: "card tool" },
    h("div", { class: "tool-head" }, h("h2", {}, t.name), h("span", { class: "tag" }, t.status)),
    h("p", {}, t.summary),
    h("a", { class: "btn primary", href: t.path, "aria-label": `Open ${t.name}` }, "Open")));

const suggest = h("article", { class: "card tool" },
  h("h2", {}, "Suggest a tool"),
  h("p", {}, "Tell us what slows you down and we will consider building it."),
  h("a", { class: "btn", href: SUGGESTION_FORM_URL, target: "_blank", rel: "noopener noreferrer" }, "Open the suggestion form (new tab)"),
  h("p", { class: "muted" }, "Please do not include student names or information."));

app.append(
  h("header", { class: "site-header" }, h("div", { class: "wrap" },
    h("a", { class: "brand", href: "/" }, logo(), h("span", {}, "Free School Tools")))),
  h("main", { class: "wrap" },
    h("h1", {}, "Free tools for school staff"),
    h("p", { class: "lead" }, "Small tools that run in your browser."),
    h("div", { class: "grid" }, ...toolCards, suggest)),
  h("footer", { class: "site-footer" },
    h("p", {}, "Privacy: these tools make no network requests while you use them and have no analytics. What you enter is saved only in your own browser."),
    h("p", {}, footerText())));
