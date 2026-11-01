import { h, s } from "../shared/dom";
import { banner, footerText, logo } from "../shared/chrome";
import { PALETTE } from "../shared/palette";
import { EMOJI_SET, GROUP_LABELS, ICONS, searchIcons } from "./icons";
import {
  clampLabel, clockProblem, exportFileName, exportPlan, isTime, MAX_CARDS, MAX_LABEL, MAX_SCHEDULES, newCard, newSchedule, parseImport,
  resolveIndex, type Card, type Mode, type Schedule,
} from "./model";
import { openPrint } from "./print";
import { boardEl, cardColor, fitBoard, iconEl, iconName } from "./render";
import { addSchedule, currentSchedule, deleteSchedule, getStatus, getStore, mutate, selectSchedule, subscribe, withFreshIds } from "./state";
import { STARTERS } from "./starters";
import { deleteAllToolKeys, downloadText } from "./storage";

let uid = 0;
const nid = (p: string) => `${p}${++uid}`;

const checkIcon = () => s("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, s("path", { d: "M5 12.5 10 18 19 7", fill: "none", stroke: "currentColor", "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round" }));

/** The Edit screen: card editor on the left, a live preview of the board on the right. */
export function editView(root: HTMLElement): () => void {
  const host = h("div");
  root.replaceChildren(host);
  let flash: { kind: "info" | "error" | "warn"; text: string } | null = null;
  let previewEl: HTMLElement | null = null;
  let clockMsgEl: HTMLElement | null = null;
  let ro: ResizeObserver | null = null;
  const saved = h("span", { class: "saved", role: "status", "aria-live": "polite" });
  const saveBanner = h("div", { class: "save-banner", role: "alert", hidden: true });

  function paintStatus() {
    const { status, errorText } = getStatus();
    saved.textContent = status === "saved" ? "Saved" : status === "saving" ? "Saving…" : "Not saved";
    saveBanner.hidden = status !== "error";
    saveBanner.textContent = errorText;
  }
  const unsub = subscribe(paintStatus);

  const sch = () => currentSchedule();
  const settings = () => getStore().settings;

  // ---- preview -----------------------------------------------------------------------------
  function refreshPreview() {
    const sc = sch();
    if (!previewEl || !sc) return;
    const r = resolveIndex(sc, getStore().progress[sc.id], settings(), new Date());
    const b = boardEl({ schedule: sc, index: sc.activities.length ? r.index : 0, settings: settings(), now: new Date() });
    previewEl.replaceChildren(b);
    fitBoard(b, false);
  }
  function refreshClockMsg() {
    const sc = sch();
    if (!clockMsgEl || !sc) return;
    const p = settings().mode === "clock" ? clockProblem(sc) : null;
    clockMsgEl.hidden = !p;
    clockMsgEl.textContent = p ? `${p}. The board stays in Manual until this is fixed.` : "";
  }
  const touch = () => { refreshPreview(); refreshClockMsg(); };

  // ---- build ---------------------------------------------------------------------------------
  function build(focusSel?: string) {
    ro?.disconnect(); ro = null; previewEl = null; clockMsgEl = null;
    const sc = sch();
    const frag: Node[] = [
      h("a", { class: "skip", href: "#main", onclick: (e: Event) => { e.preventDefault(); (host.querySelector("h1") as HTMLElement | null)?.focus(); } }, "Skip to content"),
      banner("Prototype. Do not put student names in schedules or labels. Saved in this browser only."),
      saveBanner,
      h("header", { class: "site-header" }, h("div", { class: "wrap" },
        h("a", { class: "brand", href: "/schedule/" }, logo(), h("span", {}, "Visual Schedule Board")),
        h("div", { class: "head-actions" }, saved,
          sc ? h("a", { class: "btn primary", href: "#/board", id: "show-board" }, "Show board") : null))),
    ];
    const main = h("main", { class: "wrap", id: "main" });
    if (!sc) main.append(startPanel()); else main.append(editorGrid(sc));
    frag.push(main,
      h("footer", { class: "site-footer" }, h("p", {}, "A visual support for classroom routines."), h("p", {}, footerText()), h("p", {}, h("a", { href: "/" }, "More free school tools"))));
    host.replaceChildren(...frag);
    paintStatus();
    if (sc) setupPreview();
    if (focusSel) { for (const sel of focusSel.split("||")) { const el = host.querySelector<HTMLElement>(sel); if (el) { el.focus(); break; } } }
    else if (!sc) (host.querySelector("h1") as HTMLElement | null)?.focus({ preventScroll: true });
  }

  function flashEl(): HTMLElement | null {
    if (!flash) return null;
    const f = flash; flash = null;
    return h("p", { class: `msg ${f.kind}`, role: f.kind === "error" ? "alert" : "status" }, f.text);
  }

  // ---- first visit: pick a starter or start from scratch ---------------------------------------
  function startPanel(): HTMLElement {
    return h("section", { class: "card first-start" },
      h("h1", { tabindex: "-1" }, "Visual Schedule Board"),
      h("p", {}, "Picture cards that show what is happening now and what is next. Pick a starter schedule and change anything you like, or start from scratch."),
      h("p", { class: "privacy-note" }, "Do not put student names in schedules or labels. Everything stays in this browser."),
      flashEl(),
      h("h2", {}, "Starter schedules"), starterButtons(),
      h("div", { class: "btn-row", style: "margin-top:16px" },
        h("button", { type: "button", class: "btn", onclick: () => newBlank() }, "Start from scratch"),
        importControl()));
  }
  function starterButtons(): HTMLElement {
    return h("div", { class: "starter-grid" }, ...STARTERS.map((st) =>
      h("button", { type: "button", class: "btn", onclick: () => {
        if (getStore().schedules.length >= MAX_SCHEDULES) { flash = { kind: "error", text: `You can save at most ${MAX_SCHEDULES} schedules.` }; build(); return; }
        addSchedule(withFreshIds(st.make()));
        flash = { kind: "info", text: `Added "${st.name}". Every card can be changed.` };
        build("#sched-name");
      } }, st.name, h("small", {}, st.description))));
  }
  function newBlank() {
    if (getStore().schedules.length >= MAX_SCHEDULES) { flash = { kind: "error", text: `You can save at most ${MAX_SCHEDULES} schedules.` }; build(); return; }
    addSchedule(newSchedule("My schedule", "day", [newCard("")]));
    build("#sched-name");
  }

  // ---- import / export -----------------------------------------------------------------------
  function importControl(): HTMLElement {
    const input = h("input", { type: "file", accept: ".json,application/json", class: "sr-only", id: "import-file", tabindex: "-1" });
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      input.value = "";
      if (!file) return;
      let text = "";
      try { text = await file.text(); } catch { flash = { kind: "error", text: "That file could not be read." }; build(); return; }
      if (getStore().schedules.length >= MAX_SCHEDULES) { flash = { kind: "error", text: `You can save at most ${MAX_SCHEDULES} schedules.` }; build(); return; }
      const res = parseImport(text);
      if (!res.ok) { flash = { kind: "error", text: `Not imported. ${res.reason}` }; build(); return; }
      addSchedule(withFreshIds(res.schedule));
      flash = { kind: res.notes.length ? "warn" : "info", text: `Imported "${res.schedule.name}" with ${res.schedule.activities.length} cards. ${res.notes.join(" ")}`.trim() };
      build("#sched-name");
    });
    return h("span", {}, input, h("button", { type: "button", class: "btn", onclick: () => input.click() }, "Import a plan file"));
  }

  // ---- the main editor -------------------------------------------------------------------------
  function editorGrid(sc: Schedule): HTMLElement {
    const left = h("div", { class: "edit-col" }, scheduleSection(sc), cardsSection(sc), boardSection(), filesSection(sc), dataSection());
    const frame = h("div", { class: "preview-frame" }, h("div", { class: "preview-stage", inert: true, "aria-hidden": "true" }));
    const right = h("div", { class: "preview-col" },
      h("h2", {}, "Preview"),
      frame,
      h("p", { class: "muted" }, "This is how the board looks on a classroom screen. It updates as you type."));
    return h("div", { class: "edit-grid" }, left, right);
  }
  function setupPreview() {
    const frame = host.querySelector<HTMLElement>(".preview-frame");
    previewEl = host.querySelector<HTMLElement>(".preview-stage");
    if (!frame || !previewEl) return;
    const fit = () => { previewEl!.style.transform = `scale(${frame.clientWidth / 1280})`; };
    ro = new ResizeObserver(fit); ro.observe(frame); fit();
    refreshPreview(); refreshClockMsg();
  }

  function scheduleSection(sc: Schedule): HTMLElement {
    const st = getStore();
    const pickId = nid("pick");
    const select = h("select", { id: pickId, onchange: (e: Event) => { selectSchedule((e.target as HTMLSelectElement).value); build("#sched-pick"); } },
      ...st.schedules.map((x) => h("option", { value: x.id, ...(x.id === sc.id ? { selected: true } : {}) }, x.name || "Untitled")));
    select.id = "sched-pick";
    const name = h("input", { type: "text", id: "sched-name", value: sc.name, maxlength: 60, autocomplete: "off",
      oninput: (e: Event) => { const v = (e.target as HTMLInputElement).value; mutate(() => { sc.name = v; }); (select.selectedOptions[0] as HTMLOptionElement).textContent = v || "Untitled"; refreshPreview(); } });
    const radio = (value: Mode, text: string, hint: string) => {
      const id = nid("mode");
      const input = h("input", { type: "radio", name: "mode", id, value, ...(sc.mode === value ? { checked: true } : {}), onchange: () => switchMode(sc, value) });
      return h("label", { class: "opt", for: id }, input, h("span", {}, h("strong", {}, text), " ", h("span", { class: "muted" }, hint)));
    };
    return h("section", { class: "card", "aria-labelledby": "h-sched" },
      h("h1", { id: "h-sched", tabindex: "-1" }, "Visual Schedule Board"),
      h("p", { class: "privacy-note" }, "Do not put student names in schedules or labels."),
      flashEl(),
      h("div", { class: "field", style: "margin-top:14px" }, h("label", { for: "sched-pick" }, "Saved schedules"), h("div", { class: "btn-row" }, select,
        h("button", { type: "button", class: "btn", onclick: () => newBlank() }, "New schedule"),
        h("button", { type: "button", class: "btn danger", onclick: () => {
          if (!confirm(`Delete the schedule "${sc.name}"? This cannot be undone.`)) return;
          deleteSchedule(sc.id); build();
        } }, "Delete this schedule"))),
      h("div", { class: "field" }, h("label", { for: "sched-name" }, "Schedule name"), name),
      h("fieldset", {}, h("legend", {}, "Layout"),
        radio("day", "Whole day", `A column of up to ${MAX_CARDS} cards.`),
        radio("firstThen", "First and Then", "Two big cards, for one short sequence such as work, then break.")));
  }

  function switchMode(sc: Schedule, mode: Mode) {
    if (mode === sc.mode) return;
    if (mode === "firstThen" && sc.activities.length > 2 && !confirm(`First and Then keeps only the first 2 cards. The other ${sc.activities.length - 2} will be removed from this schedule. Continue?`)) { build(); return; }
    mutate(() => {
      sc.mode = mode;
      if (mode === "firstThen") { sc.activities = sc.activities.slice(0, 2); while (sc.activities.length < 2) sc.activities.push(newCard("")); }
    });
    build(`input[name=mode][value=${mode}]`);
  }

  function cardsSection(sc: Schedule): HTMLElement {
    const ft = sc.mode === "firstThen";
    const list = h("ol", { class: "editors" }, ...sc.activities.map((c, i) => editorEl(sc, c, i)));
    const full = !ft && sc.activities.length >= MAX_CARDS;
    return h("section", { class: "card", "aria-labelledby": "h-cards" },
      h("h2", { id: "h-cards" }, ft ? "The two cards" : `Cards (${sc.activities.length} of ${MAX_CARDS})`),
      sc.activities.length === 0 ? h("p", { class: "muted" }, "No cards yet. Add the first one.") : null,
      list,
      ft ? null : h("div", { class: "btn-row", style: "margin-top:14px" },
        h("button", { type: "button", class: "btn primary", id: "add-card", ...(full ? { disabled: true } : {}), onclick: () => {
          const c = newCard("");
          mutate(() => { sc.activities.push(c); });
          build(`#lbl-${c.id}`);
        } }, "Add card"),
        full ? h("span", { class: "muted" }, `A schedule can have at most ${MAX_CARDS} cards.`) : null));
  }

  function editorEl(sc: Schedule, c: Card, i: number): HTMLElement {
    const ft = sc.mode === "firstThen";
    const n = sc.activities.length;
    const title = ft ? (i === 0 ? "First card" : "Then card") : `Card ${i + 1}`;
    const move = (d: -1 | 1) => {
      mutate(() => { const j = i + d; const arr = sc.activities; [arr[i], arr[j]] = [arr[j]!, arr[i]!]; });
      build(`#mv-${c.id}-${d < 0 ? "up" : "down"}:not(:disabled)||#mv-${c.id}-${d < 0 ? "down" : "up"}`);
    };
    const labelInput = h("input", { type: "text", id: `lbl-${c.id}`, value: c.name, maxlength: MAX_LABEL, autocomplete: "off",
      oninput: (e: Event) => { const v = clampLabel((e.target as HTMLInputElement).value); mutate(() => { c.name = v; }); touch(); } });
    const hintId = nid("h");
    labelInput.setAttribute("aria-describedby", hintId);
    const li = h("li", { class: "editor", style: `--c:${cardColor(c)}` });
    const picBtn = h("button", { type: "button", class: "btn pic-btn", "aria-expanded": "false", onclick: () => togglePicker() }, iconEl(c.icon, 40), h("span", {}, `Picture: ${iconName(c.icon)}`), h("span", { class: "muted" }, " Change"));
    let picker: HTMLElement | null = null;
    function repaintPic() {
      picBtn.replaceChildren(...[iconEl(c.icon, 40), h("span", {}, `Picture: ${iconName(c.icon)}`), h("span", { class: "muted" }, " Change")].filter((x): x is HTMLElement | SVGElement => !!x));
      li.style.setProperty("--c", cardColor(c));
      swatchRepaint();
    }
    function togglePicker() {
      if (picker) { picker.remove(); picker = null; picBtn.setAttribute("aria-expanded", "false"); return; }
      picker = pickerEl(c, (icon) => {
        mutate(() => { if (icon === undefined) delete c.icon; else c.icon = icon; });
        picker?.remove(); picker = null; picBtn.setAttribute("aria-expanded", "false");
        repaintPic(); touch(); picBtn.focus();
      });
      picBtn.setAttribute("aria-expanded", "true");
      picBtn.parentElement!.after(picker);
      (picker.querySelector("input") as HTMLElement).focus();
    }
    const timeInput = h("input", { type: "time", id: `time-${c.id}`, value: c.startTime ?? "", "aria-describedby": `timehint-${c.id}`,
      oninput: (e: Event) => { const v = (e.target as HTMLInputElement).value; mutate(() => { if (isTime(v)) c.startTime = v; else delete c.startTime; }); touch(); } });
    const swatches = h("div", { class: "swatches", role: "radiogroup", "aria-label": `Color for ${title}` });
    function swatchRepaint() {
      swatches.replaceChildren(
        h("button", { type: "button", role: "radio", class: "swatch auto", "aria-checked": String(c.color === undefined), title: "Automatic color for this kind of picture", onclick: () => setColor(undefined) }, "Auto"),
        ...PALETTE.map((p) => h("button", { type: "button", role: "radio", class: "swatch", style: `--c:${p.hex}`, "aria-checked": String(c.color === p.id), "aria-label": p.name, title: p.name, onclick: () => setColor(p.id) }, c.color === p.id ? checkIcon() : null)));
    }
    function setColor(id: string | undefined) {
      mutate(() => { if (id === undefined) delete c.color; else c.color = id; });
      repaintPic(); touch();
      (swatches.querySelector("[aria-checked=true]") as HTMLElement | null)?.focus();
    }
    swatchRepaint();
    li.append(
      h("div", { class: "editor-head" }, h("h3", {}, title), h("div", { class: "btn-row" },
        h("button", { type: "button", class: "btn", id: `mv-${c.id}-up`, "aria-label": `Move ${title} up`, ...(i === 0 ? { disabled: true } : {}), onclick: () => move(-1) }, "Move up"),
        h("button", { type: "button", class: "btn", id: `mv-${c.id}-down`, "aria-label": `Move ${title} down`, ...(i === n - 1 ? { disabled: true } : {}), onclick: () => move(1) }, "Move down"),
        ft ? null : h("button", { type: "button", class: "btn danger", "aria-label": `Delete ${title}`, onclick: () => {
          mutate(() => { sc.activities.splice(i, 1); });
          build(sc.activities.length ? `#lbl-${sc.activities[Math.max(0, i - 1)]!.id}` : "#add-card");
        } }, "Delete"))),
      h("div", { class: "field" }, h("label", { for: `lbl-${c.id}` }, "Label"), labelInput, h("div", { class: "hint", id: hintId }, `Up to ${MAX_LABEL} characters. Shown on the card with the picture.`)),
      h("div", { class: "editor-row" },
        h("div", { class: "field" }, h("div", { class: "label-like", style: "font-weight:700;margin-bottom:6px" }, "Picture"), picBtn),
        h("div", { class: "field" }, h("label", { for: `time-${c.id}` }, "Start time (optional)"), timeInput, h("div", { class: "hint", id: `timehint-${c.id}` }, "Clear it to remove the time.")),
        h("div", { class: "field" }, h("div", { style: "font-weight:700;margin-bottom:6px" }, "Color"), swatches)));
    return li;
  }

  function pickerEl(c: Card, onPick: (icon: string | undefined) => void): HTMLElement {
    const sid = nid("ps");
    const search = h("input", { type: "search", id: sid, autocomplete: "off", "aria-controls": `${sid}-grid`, oninput: () => paint() });
    const grid = h("div", { class: "pick-grid", id: `${sid}-grid`, role: "group", "aria-label": "Built in pictures" });
    const count = h("p", { class: "sr-only", role: "status", "aria-live": "polite" });
    const btn = (id: string | undefined, name: string, body: Node | null, cls = "") =>
      h("button", { type: "button", class: `pick-btn ${cls}`, "aria-pressed": String(c.icon === id && id !== undefined), "aria-label": name, onclick: () => onPick(id) }, body, cls.includes("emo") ? null : h("span", {}, name));
    function paint() {
      const hits = searchIcons(search.value);
      grid.replaceChildren(...hits.map((i) => btn(i.id, i.name, iconEl(i.id, 48))));
      count.textContent = hits.length ? `${hits.length} pictures` : "No picture matches that";
      if (!hits.length) grid.append(h("p", { class: "muted" }, "No picture matches that. Try another word, or use an emoji below."));
    }
    paint();
    const emojis = h("div", { class: "pick-grid", role: "group", "aria-label": "Emoji" },
      ...EMOJI_SET.map((e) => btn(e, `Emoji ${e}`, iconEl(e, 36), "emo")));
    const wrap = h("div", { class: "picker", role: "group", "aria-label": "Choose a picture" },
      h("div", { class: "field" }, h("label", { for: sid }, "Search pictures by name"), search),
      count, grid,
      h("h4", {}, "Emoji"), emojis,
      h("div", { class: "btn-row" }, h("button", { type: "button", class: "btn", onclick: () => onPick(undefined) }, "No picture"), h("button", { type: "button", class: "btn", onclick: () => { wrap.remove(); } }, "Close")));
    wrap.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Escape") { e.stopPropagation(); wrap.remove(); } });
    void ICONS; void GROUP_LABELS;
    return wrap;
  }

  function boardSection(): HTMLElement {
    const st = settings();
    const check = (label: string, key: "showTimes" | "showClock" | "highContrast" | "keepScreenAwake", hint = "") => {
      const id = nid("opt");
      return h("label", { class: "opt", for: id }, h("input", { type: "checkbox", id, ...(st[key] ? { checked: true } : {}), onchange: (e: Event) => { const v = (e.target as HTMLInputElement).checked; mutate((x) => { x.settings[key] = v; }); touch(); } }), h("span", {}, label, hint ? h("span", { class: "muted" }, ` ${hint}`) : null));
    };
    const adv = (value: "manual" | "clock", text: string, hint: string) => {
      const id = nid("adv");
      return h("label", { class: "opt", for: id }, h("input", { type: "radio", name: "advance", id, value, ...(st.mode === value ? { checked: true } : {}), onchange: () => { mutate((x) => { x.settings.mode = value; }); touch(); } }), h("span", {}, h("strong", {}, text), " ", h("span", { class: "muted" }, hint)));
    };
    clockMsgEl = h("p", { class: "msg warn", role: "status", hidden: true });
    return h("section", { class: "card", "aria-labelledby": "h-board" },
      h("h2", { id: "h-board" }, "On the board"),
      h("fieldset", {}, h("legend", {}, "How the board moves on"),
        adv("manual", "Manual", "You press Next or Back, or tap a card."),
        adv("clock", "Follow the clock", "Every card needs a start time, in order."),
        clockMsgEl),
      h("fieldset", {}, h("legend", {}, "Show"),
        check("Start times beside each card", "showTimes"), check("Clock in the corner", "showClock"), check("High contrast", "highContrast"), check("Keep the screen awake while the board is showing", "keepScreenAwake")));
  }

  function filesSection(sc: Schedule): HTMLElement {
    return h("section", { class: "card", "aria-labelledby": "h-files" },
      h("h2", { id: "h-files" }, "Starters, files and printing"),
      h("h3", { style: "margin:0 0 8px;font-size:16px" }, "Add a starter schedule"),
      starterButtons(),
      h("div", { class: "btn-row", style: "margin-top:16px" },
        h("button", { type: "button", class: "btn", onclick: () => downloadText(exportFileName(sc), JSON.stringify(exportPlan(sc), null, 2), "application/json") }, "Export this schedule"),
        importControl(),
        h("button", { type: "button", class: "btn", id: "print-open", onclick: (e: Event) => openPrint(sc, settings(), e.currentTarget as HTMLElement) }, "Print")),
      h("p", { class: "muted" }, "The exported file is a plan file the Classroom Pie Timer can open. Cards without a length will ask for one there."));
  }

  function dataSection(): HTMLElement {
    return h("section", { class: "card", "aria-labelledby": "h-data" },
      h("h2", { id: "h-data" }, "Saved data"),
      h("p", {}, "Schedules are saved only in this browser, under names that start with \"schedule.\". Nothing is sent anywhere."),
      h("button", { type: "button", class: "btn danger", onclick: () => {
        if (!confirm("Delete all schedules and settings saved by this tool in this browser? Other tools are not touched. This cannot be undone.")) return;
        try { deleteAllToolKeys(window.localStorage); } catch { /* storage unavailable */ }
        location.hash = "#/edit"; location.reload();
      } }, "Delete everything this tool saved"));
  }

  build();
  return () => { unsub(); ro?.disconnect(); };
}
