import { h } from "../shared/dom";
import { PALETTE, paletteHex, PALETTE_TEXT } from "../shared/palette";
import { banner } from "../shared/chrome";
import {
  addActivity, clampSlice, clampTotal, finishImport, formatClock, LIMITS, materializeFree, MESSAGES, moveActivity, newPlan, overBy,
  raiseTotal, removeActivity, shrinkToFit, slicesOf, splitEvenly, sumSeconds, leftover, type Activity, type Plan, type Result,
} from "./model";
import { createRing } from "./ring";
import { deletePlan, setPlan, state } from "./state";
import { EMOJI, STARTER_PLANS, startFromStarter } from "./starters";
import { downloadText, exportFileName, exportPlanText, MAX_IMPORT_BYTES, parsePlanFileText } from "./storage";
import { button, field, icon, nextId } from "./ui";

type Hooks = { start: () => void; openSettings: (opener: HTMLElement) => void };

/** Minutes and seconds with plus and minus buttons for one minute. Typing is allowed. */
function durationInput(legend: string, get: () => number, set: (sec: number) => { value: number; message?: string }, say: (m: string) => void, min: number) {
  const mid = nextId("min"), sid = nextId("sec");
  const mins = h("input", { type: "number", id: mid, min: 0, max: 360, inputmode: "numeric" });
  const secs = h("input", { type: "number", id: sid, min: 0, max: 59, inputmode: "numeric" });
  const fill = () => { const t = get(); mins.value = String(Math.floor(t / 60)); secs.value = String(t % 60); };
  const read = () => (Number(mins.value || 0) * 60 + Number(secs.value || 0));
  const apply = (sec: number, final: boolean) => {
    if (!Number.isFinite(sec)) return;
    if (!final && (sec < min || sec > LIMITS.maxTotal)) return; // wait until typing settles before complaining
    const r = set(sec);
    if (r.message) say(r.message);
    if (final || r.message) fill();
  };
  mins.addEventListener("input", () => apply(read(), false));
  secs.addEventListener("input", () => apply(read(), false));
  mins.addEventListener("change", () => apply(read(), true));
  secs.addEventListener("change", () => apply(read(), true));
  const bump = (d: number) => apply(get() + d, true);
  const el = h("fieldset", { class: "duration" },
    h("legend", {}, legend),
    h("div", { class: "dur-row" },
      button([icon("minus", 18)], () => bump(-60), "small", { "aria-label": `${legend}: one minute less` }),
      mins, h("label", { for: mid }, "min"), secs, h("label", { for: sid }, "sec"),
      button([icon("plus", 18)], () => bump(60), "small", { "aria-label": `${legend}: one minute more` })));
  fill();
  return { el, fill };
}

export function createSetup(hooks: Hooks) {
  const ring = createRing();
  const root = h("div", { class: "setup" });
  const say = (m: string) => { note.textContent = m; };
  const note = h("p", { class: "msg-note", role: "status", "aria-live": "polite" });
  const centerName = h("div", { class: "pre-name" });
  const centerTotal = h("div", { class: "pre-total" });
  const summary = h("div", { class: "summary", "aria-live": "polite" });
  const startBtn = h("button", { type: "button", class: "btn primary big", onclick: () => hooks.start() }, icon("play", 22), "Start");
  const startWhy = h("p", { class: "muted start-why" });
  const list = h("ol", { class: "acts plain" });
  const planSelect = h("select", { id: "plan-select" });
  const nameInput = h("input", { type: "text", maxlength: LIMITS.maxName, autocomplete: "off" });
  const fileInput = h("input", { type: "file", accept: ".json,application/json", class: "sr-only", tabindex: "-1", "aria-hidden": "true" });
  const importDlg = h("dialog", { class: "settings", "aria-labelledby": "imp-h" });

  const plan = () => state.plan;
  const commit = (p: Plan, structural = false) => {
    setPlan(p);
    refreshLive();
    if (structural) buildList();
  };
  const apply = (r: Result, structural = true) => {
    if (!r.ok) { say(r.message); return; }
    say("");
    commit(r.plan, structural);
  };

  // ---- total time -----------------------------------------------------------------
  const total = durationInput("Total time", () => plan().totalSeconds, (sec) => {
    const c = clampTotal(sec);
    commit({ ...plan(), totalSeconds: c.value });
    return c;
  }, say, LIMITS.minTotal);

  // ---- activity rows ------------------------------------------------------------------
  function swatchBtn(a: Activity, id: string, name: string) {
    const on = a.color === id;
    return h("button", {
      type: "button", class: `swatch${on ? " on" : ""}`, "aria-pressed": on ? "true" : "false", "aria-label": name, title: name,
      style: `background:${paletteHex(id)};color:${PALETTE_TEXT}`,
      "data-key": `c:${id}`,
      onclick: () => { setActivity(a.id, { color: id }); buildList(a.id, `c:${id}`); },
    }, on ? icon("check", 18) : null);
  }
  function emojiBtn(a: Activity, e: string | null) {
    const on = (a.icon ?? null) === e;
    return h("button", {
      type: "button", class: `emo${on ? " on" : ""}`, "aria-pressed": on ? "true" : "false", "aria-label": e ?? "No icon",
      "data-key": `e:${e ?? ""}`,
      onclick: () => { setActivity(a.id, e ? { icon: e } : { icon: undefined }); buildList(a.id, `e:${e ?? ""}`); },
    }, e ?? "None");
  }
  function setActivity(id: string, patch: Partial<Activity>) {
    const acts = plan().activities.map((a) => {
      if (a.id !== id) return a;
      const next = { ...a, ...patch };
      if (patch.icon === undefined && "icon" in patch) delete next.icon;
      return next;
    });
    commit({ ...plan(), activities: acts });
  }

  function row(a: Activity, i: number, count: number): HTMLElement {
    const nm = h("input", { type: "text", maxlength: LIMITS.maxName, autocomplete: "off", value: a.name });
    nm.addEventListener("input", () => {
      if (nm.value.length >= LIMITS.maxName) say(MESSAGES.maxName); else say("");
      setActivity(a.id, { name: nm.value });
    });
    const dur = durationInput(`Activity ${i + 1} length`, () => plan().activities.find((x) => x.id === a.id)?.seconds ?? 0, (sec) => {
      const c = clampSlice(sec);
      setActivity(a.id, { seconds: c.value });
      return c;
    }, say, LIMITS.minSlice);
    const cur = plan().activities.find((x) => x.id === a.id) ?? a;
    const look = h("details", { class: "look" },
      h("summary", {}, "Color and icon ",
        h("span", { class: "swatch mini", style: `background:${paletteHex(cur.color)}` }), " ", h("span", { "aria-hidden": "true" }, cur.icon ?? "")),
      h("div", { class: "look-body" },
        h("div", { role: "group", "aria-label": `Activity ${i + 1} color`, class: "swatches" }, ...PALETTE.map((p) => swatchBtn(cur, p.id, p.name))),
        h("div", { role: "group", "aria-label": `Activity ${i + 1} icon`, class: "emojis" }, emojiBtn(cur, null), ...EMOJI.map((e) => emojiBtn(cur, e)))));
    return h("li", { class: "act", "data-id": a.id },
      h("div", { class: "act-top" },
        h("span", { class: "act-num", "aria-hidden": "true", style: `background:${paletteHex(cur.color)};color:${PALETTE_TEXT}` }, String(i + 1)),
        field(`Activity ${i + 1} name`, nm, "grow"), dur.el),
      look,
      h("div", { class: "btn-row" },
        button("Move up", () => { commit(moveActivity(plan(), a.id, -1), true); }, "small", i === 0 ? { disabled: "" } : {}),
        button("Move down", () => { commit(moveActivity(plan(), a.id, 1), true); }, "small", i === count - 1 ? { disabled: "" } : {}),
        button("Delete", () => { say(""); commit(removeActivity(plan(), a.id), true); }, "small danger")));
  }

  const freeBox = h("div", { class: "free-box" });
  /** Rebuild the rows. After a color or icon pick, keep that row's picker open and focused. */
  function buildList(openId?: string, focusKey?: string) {
    const p = plan();
    list.replaceChildren(...p.activities.map((a, i) => row(a, i, p.activities.length)));
    if (openId) {
      const li = Array.from(list.children).find((c) => c.getAttribute("data-id") === openId);
      const det = li?.querySelector("details");
      if (det) det.open = true;
      (Array.from(li?.querySelectorAll("button[data-key]") ?? []).find((b) => b.getAttribute("data-key") === focusKey) as HTMLElement | undefined)?.focus();
    }
  }
  function paintFree() {
    const left = leftover(plan());
    freeBox.replaceChildren();
    if (left > 0) {
      freeBox.append(h("div", { class: "act free" },
        h("p", { class: "strong" }, `Free time: ${formatClock(left)} left over`),
        h("p", { class: "muted" }, "This gray, hatched slice runs like any other. Add an activity to use the time, or turn it into an activity you can rename."),
        button("Turn Free time into an activity", () => apply(materializeFree(plan())), "small")));
    }
  }

  // ---- things that change on every edit -------------------------------------------------
  function refreshLive() {
    const p = plan();
    ring.setSlices(slicesOf(p));
    centerName.textContent = p.name;
    centerTotal.textContent = formatClock(p.totalSeconds);
    ring.svg.setAttribute("aria-label", `${p.name}: ${slicesOf(p).map((s) => `${s.name} ${formatClock(s.seconds)}`).join(", ")}`);
    const sum = sumSeconds(p.activities), over = overBy(p), left = leftover(p);
    summary.replaceChildren();
    if (over > 0) {
      summary.append(
        h("p", { class: "over" }, icon("warn", 22), `Over by ${formatClock(over)}`),
        h("p", { class: "muted" }, `Activities add up to ${formatClock(sum)}, but the total is ${formatClock(p.totalSeconds)}.`),
        h("div", { class: "btn-row" },
          button("Raise total to match", () => apply(raiseTotal(plan()), false) , "small"),
          button("Shrink to fit", () => apply(shrinkToFit(plan())), "small")));
    } else {
      summary.append(h("p", {}, `Activities: ${formatClock(sum)} of ${formatClock(p.totalSeconds)}`, left > 0 ? ` (Free time ${formatClock(left)})` : ""));
    }
    startBtn.disabled = over > 0;
    startWhy.textContent = over > 0 ? "Fix the time above before you start." : "";
    total.fill();
    paintFree();
    syncSelect();
  }

  function syncSelect() {
    const p = plan();
    planSelect.replaceChildren(
      h("optgroup", { label: "My plans" }, ...state.saved.map((s) => h("option", { value: `p:${s.id}`, ...(s.id === p.id ? { selected: true } : {}) }, s.name))),
      h("optgroup", { label: "Starter plans (examples you can edit)" }, ...STARTER_PLANS.map((s) => h("option", { value: `s:${s.id}` }, s.name))));
  }
  planSelect.addEventListener("change", () => {
    const v = planSelect.value;
    let next: Plan | null = null;
    if (v.startsWith("p:")) next = state.saved.find((s) => `p:${s.id}` === v) ?? null;
    else if (v.startsWith("s:")) next = startFromStarter(v.slice(2));
    if (next) openPlan(next);
  });
  function openPlan(p: Plan) {
    say("");
    setPlan(p);
    nameInput.value = p.name;
    buildList();
    refreshLive();
  }
  nameInput.addEventListener("input", () => {
    if (nameInput.value.length >= LIMITS.maxName) say(MESSAGES.maxName); else say("");
    commit({ ...plan(), name: nameInput.value || "Untitled" });
  });

  // ---- import and export ---------------------------------------------------------------
  function importDialog(parsed: Extract<ReturnType<typeof parsePlanFileText>, { ok: true }>) {
    const inputs = new Map<string, HTMLInputElement>();
    importDlg.replaceChildren(
      h("h2", { id: "imp-h" }, "How long should each activity be?"),
      h("p", {}, "These activities came without a length. Choose how many minutes each one should take."),
      ...parsed.plan.activities.filter((a) => parsed.needsLength.includes(a.id)).map((a) => {
        const inp = h("input", { type: "number", min: 1, max: 360, value: "5" });
        inputs.set(a.id, inp);
        return field(`${a.name} (minutes)`, inp);
      }),
      h("div", { class: "btn-row" },
        button("Import", () => {
          const lengths: Record<string, number> = {};
          inputs.forEach((inp, id) => { lengths[id] = Math.round(Number(inp.value || 5) * 60); });
          const done = finishImport(parsed, lengths);
          importDlg.close();
          if (!done.ok) { say(`Not imported: ${done.reason}`); return; }
          openPlan(done.plan);
          say("Plan imported.");
        }, "primary"),
        button("Cancel", () => importDlg.close())));
    importDlg.showModal();
  }
  fileInput.addEventListener("change", async () => {
    const f = fileInput.files?.[0];
    fileInput.value = "";
    if (!f) return;
    if (f.size > MAX_IMPORT_BYTES) { say("Not imported: this file is too big to be a plan."); return; }
    let text = "";
    try { text = await f.text(); } catch { say("Not imported: the file could not be read."); return; }
    const r = parsePlanFileText(text);
    if (!r.ok) { say(`Not imported: ${r.reason}`); return; }
    if (r.needsLength.length) { importDialog(r); return; }
    const done = finishImport(r, {});
    if (!done.ok) { say(`Not imported: ${done.reason}`); return; }
    openPlan(done.plan);
    say("Plan imported.");
  });

  // ---- page --------------------------------------------------------------------------
  const settingsBtn = button([icon("gear", 20), "Settings"], () => hooks.openSettings(settingsBtn));
  const editor = h("section", { class: "card editor", "aria-labelledby": "plan-h" },
    h("h1", { id: "plan-h", tabindex: "-1" }, "Plan your lesson"),
    h("p", { class: "muted" }, "Do not type student names into activity names. Plans are saved only in this browser."),
    h("div", { class: "row picker" },
      field("Open a plan", planSelect, "grow"),
      button("New plan", () => openPlan(newPlan()), "small"),
      button("Delete this plan", () => {
        if (!window.confirm(`Delete the plan "${plan().name}" from this browser?`)) return;
        deletePlan(plan().id);
        openPlan(state.plan);
      }, "small danger")),
    h("div", { class: "row" }, field("Plan name", nameInput, "grow"), total.el),
    summary,
    h("div", { class: "btn-row" }, button("Split evenly", () => apply(splitEvenly(plan())), "small")),
    note,
    list,
    freeBox,
    h("div", { class: "btn-row" },
      button([icon("plus", 18), "Add activity"], () => apply(addActivity(plan())), "primary-outline"),
      button("Export plan", () => downloadText(exportFileName(plan()), exportPlanText(plan())), "small"),
      button("Import plan", () => fileInput.click(), "small")),
    fileInput);

  const preview = h("section", { class: "preview", "aria-label": "Preview of the ring" },
    h("div", { class: "ring-wrap" }, ring.svg, h("div", { class: "ring-center" }, centerName, centerTotal)),
    h("div", { class: "start-box" }, startBtn, startWhy));

  root.append(
    banner("Prototype. Saved in this browser only. Do not type student names."),
    h("header", { class: "site-header" }, h("div", { class: "wrap" },
      h("a", { class: "brand", href: "/timer/" }, "Classroom Pie Timer"),
      h("div", { class: "btn-row" }, h("a", { href: "/" }, "More free school tools"), settingsBtn))),
    h("main", { class: "wrap setup-grid", id: "main" }, preview, editor),
    importDlg);

  nameInput.value = plan().name;
  buildList();
  refreshLive();

  return {
    el: root,
    /** Call when the screen is shown again (for example after a run). */
    show() { nameInput.value = plan().name; buildList(); refreshLive(); window.setTimeout(() => (root.querySelector("#plan-h") as HTMLElement | null)?.focus({ preventScroll: true }), 0); },
    startButton: startBtn,
  };
}
