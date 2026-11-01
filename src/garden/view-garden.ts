import { h } from "../shared/dom";
import { autoHideControls } from "../shared/idle-controls";
import { isFullscreen, toggleFullscreen } from "../shared/fullscreen";
import { keepAwake, releaseAwake } from "../shared/wakelock";
import { announceText, fmt, percentOf, progressText } from "./growth";
import { LIMITS, checkCustom, parseWhole, type Garden } from "./model";
import { createScene, type SceneChange } from "./scene";
import { playChime } from "./sound";
import { add, edit, findGarden, getStore, setGardenTotal, shelve, undo, updateSettings, type Changed } from "./state";
import { downloadText, exportFileName, exportGardenText } from "./storage";
import { themeFor } from "./theme";
import { dialogOpen, field, modal, nextId, showErrors } from "./ui";

/** The full-screen garden. Returns a function that undoes everything this screen set up. */
export function gardenView(root: HTMLElement, id: string, go: (hash: string) => void): () => void {
  const first = findGarden(id);
  if (!first) {
    root.append(h("div", { class: "wrap card", style: "margin:48px auto;max-width:560px" }, h("h1", { tabindex: "-1" }, "Garden not found"),
      h("p", {}, "That garden is not saved in this browser."), h("a", { class: "btn primary", href: "#/" }, "Back to gardens")));
    return () => {};
  }
  const theme = themeFor(first.theme);
  const scene = createScene(theme);
  document.body.classList.add("garden-mode");

  // ---- text on the picture --------------------------------------------------------
  const nameEl = h("h1", { class: "name", tabindex: "-1" });
  const countEl = h("p", { class: "count" });
  const pctEl = h("p", { class: "pct" });
  const pill = h("div", { class: "goal-pill" }, nameEl, countEl, pctEl);
  const fill = h("div", {});
  const bar = h("div", { class: "top-bar", role: "progressbar", "aria-label": "Progress toward the goal", "aria-valuemin": 0, "aria-valuemax": 100 }, fill);
  const toast = h("div", { class: "toast", hidden: true });
  const live = h("div", { class: "sr-only", role: "status", "aria-live": "polite" });
  const celebrationHost = h("div", {});
  let toastTimer: number | undefined;
  const say = (text: string) => { toast.textContent = text; toast.hidden = false; window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2600); };

  // ---- controls ---------------------------------------------------------------------
  const btn = (label: string, onclick: () => void, cls = "btn small", extra: Record<string, string> = {}) => h("button", { type: "button", class: cls, onclick, ...extra }, label);
  const undoBtn = btn("Undo", () => doUndo(), "btn small", { title: "Undo the last amount (Z)" });
  const shelfBtn = btn("Move to the shelf", () => void moveToShelf(), "btn small primary");
  const fsBtn = btn("Full screen", () => void toggleFullscreen(), "btn small", { title: "Full screen (F)" });
  const customInput = h("input", { type: "text", inputmode: "numeric", id: nextId("custom"), "aria-label": "Amount to add", autocomplete: "off" });
  const customErr = h("span", { class: "field-err", role: "alert", id: nextId("cerr") });
  customInput.setAttribute("aria-describedby", customErr.id);
  const customForm = h("form", { class: "custom", hidden: true, onsubmit: (e: Event) => { e.preventDefault(); submitCustom(); } },
    customInput, h("button", { type: "submit", class: "btn small primary" }, "Add"), btn("Cancel", () => closeCustom(true)), customErr);
  customInput.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); closeCustom(true); } });
  const customBtn = btn("Add custom", () => { customForm.hidden = !customForm.hidden; if (!customForm.hidden) { customInput.value = ""; customErr.textContent = ""; customInput.focus(); } });

  const settings = () => getStore().settings;
  const numbersBox = h("input", { type: "checkbox", id: nextId("n"), onchange: () => { updateSettings({ showNumbers: numbersBox.checked }); render(false); } });
  const awakeBox = h("input", { type: "checkbox", id: nextId("a"), onchange: () => { updateSettings({ keepScreenAwake: awakeBox.checked }); if (awakeBox.checked) void keepAwake(); else void releaseAwake(); } });
  const soundSel = h("select", { id: nextId("s"), "aria-label": "Sound", onchange: () => { updateSettings({ sound: soundSel.value === "chime" ? "chime" : "off" }); syncSound(); if (settings().sound === "chime") playChime(settings().volume); } },
    h("option", { value: "off" }, "Sound off"), h("option", { value: "chime" }, "Soft chime"));
  const volume = h("input", { type: "range", min: 0, max: 1, step: 0.05, "aria-label": "Chime volume", id: nextId("v"),
    oninput: () => updateSettings({ volume: Number(volume.value) }), onchange: () => playChime(settings().volume) });
  const syncSound = () => { volume.disabled = settings().sound === "off"; };

  const bar2 = h("div", { class: "controls" },
    h("div", { class: "row" },
      h("div", { class: "group add", role: "group", "aria-label": "Add to the total" },
        h("strong", {}, "Add"), btn("+1", () => doAdd(1), "btn primary", { title: "Add 1 (+ key)", "aria-label": "Add 1" }), btn("+5", () => doAdd(5), "btn primary", { title: "Add 5 (5 key)", "aria-label": "Add 5" }),
        btn("+10", () => doAdd(10), "btn primary", { title: "Add 10", "aria-label": "Add 10" }), customBtn, customForm),
      h("span", { class: "sep" }),
      h("div", { class: "group" }, undoBtn, btn("Set total", () => void setTotalDialog()), btn("Edit goal", () => void editDialog()), shelfBtn)),
    h("div", { class: "row" },
      h("label", { class: "check", for: numbersBox.id }, numbersBox, "Show numbers"),
      soundSel, h("label", { class: "small-label", for: volume.id }, "Volume"), volume,
      h("label", { class: "check", for: awakeBox.id }, awakeBox, "Keep screen awake"),
      fsBtn, btn("Export", () => exportNow()), h("a", { class: "btn small", href: "#/" }, "All gardens")),
    h("p", { class: "keys" }, "Keys: ", h("kbd", {}, "+"), " adds 1, ", h("kbd", {}, "5"), " adds 5, ", h("kbd", {}, "Z"), " undoes, ", h("kbd", {}, "F"), " full screen. Do not put student names in garden names."));

  const stage = h("div", { class: "stage" }, scene.el, bar, pill, toast, celebrationHost, bar2, live);
  root.append(h("a", { class: "skip", href: "#", onclick: (e: Event) => { e.preventDefault(); nameEl.focus(); } }, "Skip to the garden"), stage);

  // ---- drawing the current state ------------------------------------------------------
  let g: Garden = first;
  function render(animate: boolean): SceneChange {
    g = findGarden(id) ?? g;
    const ch = scene.update(g.total, g.goal, { animate });
    const show = settings().showNumbers;
    nameEl.textContent = g.name;
    countEl.textContent = progressText(g.total, g.goal, g.unit);
    pctEl.textContent = `${fmt(percentOf(g.total, g.goal))} percent`;
    countEl.hidden = pctEl.hidden = !show;
    const pct = Math.min(100, (g.total * 100) / g.goal);
    fill.style.width = `${pct}%`;
    bar.setAttribute("aria-valuenow", String(Math.round(pct)));
    bar.setAttribute("aria-valuetext", progressText(g.total, g.goal, g.unit));
    undoBtn.disabled = g.recent.length === 0;
    shelfBtn.hidden = !g.finishedOn;
    numbersBox.checked = show; soundSel.value = settings().sound; volume.value = String(settings().volume); awakeBox.checked = settings().keepScreenAwake; syncSound();
    document.title = `${g.name} · Class Garden`;
    return ch;
  }

  function showCelebration() {
    const keep = btn("Keep growing", () => { celebrationHost.replaceChildren(); (bar2.querySelector(".add .btn") as HTMLElement | null)?.focus(); }, "btn primary");
    celebrationHost.replaceChildren(h("section", { class: "celebration", "aria-labelledby": "cel-h" },
      h("p", { class: "headline", id: "cel-h" }, `Your class reached ${fmt(g.goal)} ${g.unit}!`),
      h("div", { class: "btn-row" }, keep, btn("Move to the shelf", () => void moveToShelf(), "btn"))));
    keep.focus();
  }

  function afterChange(lead: string | undefined, finishedNow: boolean) {
    const ch = render(true);
    const parts: string[] = [];
    if (lead) parts.push(`${lead}.`);
    parts.push(announceText(g.total, g.goal, g.unit));
    for (const kind of ch.arrived) { const c = theme.creatures.find((x) => x.kind === kind); if (c) parts.push(`${c.label}.`); }
    if (ch.bonusAppeared) parts.push("A bonus bloom appeared.");
    if (finishedNow) parts.push(`Goal reached! Your class reached ${fmt(g.goal)} ${g.unit}.`);
    live.textContent = parts.join(" ");
    if (settings().sound === "chime" && (ch.arrived.length > 0 || finishedNow)) playChime(settings().volume);
    if (finishedNow) { scene.celebrate(); showCelebration(); }
  }

  // ---- actions ----------------------------------------------------------------------------
  function doAdd(n: number) {
    const r = add(id, n); if (!r) return;
    say(`Added ${fmt(r.added)}`);
    afterChange(`Added ${fmt(r.added)}`, r.finishedNow);
  }
  function doUndo() {
    const r = undo(id); if (!r) return;
    say(`Removed ${fmt(r.removed)}`);
    afterChange(`Removed ${fmt(r.removed)}`, false);
  }
  function closeCustom(refocus: boolean) { customForm.hidden = true; customErr.textContent = ""; if (refocus) customBtn.focus(); }
  function submitCustom() {
    const c = checkCustom(customInput.value, g);
    if (!c.ok) { customErr.textContent = c.error; customInput.setAttribute("aria-invalid", "true"); customInput.focus(); return; }
    customInput.removeAttribute("aria-invalid");
    closeCustom(true);
    doAdd(c.amount);
  }
  function exportNow() { downloadText(exportFileName(g), exportGardenText(g), "application/json"); say("Garden file saved"); }

  async function moveToShelf() {
    const r = shelve(id);
    if (!r.ok) { say(r.message); live.textContent = r.message; celebrationHost.replaceChildren(); return; }
    go("#/shelf");
  }

  async function setTotalDialog() {
    const input = h("input", { type: "text", inputmode: "numeric", autocomplete: "off", value: String(g.total) });
    const f = field("New total", input, { hint: `Type the correct total, from 0 to ${fmt(LIMITS.totalMax)}. This also clears the Undo list.` });
    const ok = await modal<number>("Set total", (done) => {
      const submit = () => {
        const n = parseWhole(input.value);
        if (n === null || n > LIMITS.totalMax) { f.setError(`Enter a whole number from 0 to ${fmt(LIMITS.totalMax)}.`); input.focus(); return; }
        done(n);
      };
      return [h("form", { onsubmit: (e: Event) => { e.preventDefault(); submit(); } }, f.el,
        h("p", {}, `Now: ${progressText(g.total, g.goal, g.unit)}.`),
        h("div", { class: "btn-row" }, btn("Cancel", () => (input.closest("dialog") as HTMLDialogElement).close(), "btn"), h("button", { type: "submit", class: "btn primary" }, "Set total")))];
    });
    if (ok === null) return;
    const r = setGardenTotal(id, ok) as Changed | null; if (!r) return;
    say(`Total set to ${fmt(ok)}`);
    afterChange(`Total set to ${fmt(ok)}`, r.finishedNow);
  }

  async function editDialog() {
    const name = h("input", { type: "text", value: g.name, maxlength: LIMITS.name, autocomplete: "off" });
    const unit = h("input", { type: "text", value: g.unit, maxlength: LIMITS.unit, autocomplete: "off" });
    const goal = h("input", { type: "text", inputmode: "numeric", value: String(g.goal), autocomplete: "off" });
    const fs = { name: field("Garden name", name, { hint: "Do not use student names." }), unit: field("What you are counting", unit, { hint: "For example: books read, minutes of kindness." }), goal: field("Goal", goal, { hint: `A whole number from 1 to ${fmt(LIMITS.goalMax)}. Nothing already counted is lost.` }) };
    const saved = await modal<Changed>("Edit goal", (done) => [h("form", {
      onsubmit: (e: Event) => {
        e.preventDefault();
        const r = edit(id, { name: name.value, unit: unit.value, goal: goal.value });
        if (!r.ok) { showErrors(fs, r.errors); (r.errors?.name ? name : r.errors?.unit ? unit : goal).focus(); return; }
        done(r);
      } }, fs.name.el, fs.unit.el, fs.goal.el,
      h("div", { class: "btn-row" }, btn("Cancel", () => (name.closest("dialog") as HTMLDialogElement).close(), "btn"), h("button", { type: "submit", class: "btn primary" }, "Save")))]);
    if (!saved) return;
    afterChange("Goal updated", saved.finishedNow);
  }

  // ---- keyboard ------------------------------------------------------------------------------
  const onKey = (e: KeyboardEvent) => {
    if (dialogOpen() || e.repeat) return;
    const t = e.target instanceof Element ? e.target : null;
    if (t?.closest("input, textarea, select, [contenteditable='true']")) return;
    const key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && !e.altKey && key === "z") { e.preventDefault(); doUndo(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (key === "+" || key === "=" || e.code === "NumpadAdd") { e.preventDefault(); doAdd(1); }
    else if (key === "5") { e.preventDefault(); doAdd(5); }
    else if (key === "z") { e.preventDefault(); doUndo(); }
    else if (key === "f") { e.preventDefault(); void toggleFullscreen(); }
  };
  document.addEventListener("keydown", onKey);
  const onFs = () => { fsBtn.textContent = isFullscreen() ? "Exit full screen" : "Full screen"; };
  document.addEventListener("fullscreenchange", onFs);
  const stopHide = autoHideControls(bar2, 3500);

  render(false);
  if (settings().keepScreenAwake) void keepAwake();
  nameEl.focus({ preventScroll: true });

  return () => {
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("fullscreenchange", onFs);
    stopHide();
    window.clearTimeout(toastTimer);
    void releaseAwake();
    document.body.classList.remove("garden-mode");
  };
}
