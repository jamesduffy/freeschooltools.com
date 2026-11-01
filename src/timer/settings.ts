import { h } from "../shared/dom";
import { CHIMES, MARKERS, type Settings } from "./model";
import { toneFor } from "./audio";
import { state, updateSettings } from "./state";
import { button, field, nextId, toggle } from "./ui";
import type { Sound } from "./audio";

const MARKER_NAMES: Record<Settings["marker"], string> = { rocket: "Rocket", snail: "Snail", balloon: "Balloon", sun: "Sun" };
const CHIME_NAMES: Record<Settings["chime"], string> = { off: "Off", soft: "Soft chime", bell: "Bell" };

/** The settings panel, a native dialog (it traps focus and closes with Escape). */
export function createSettingsDialog(sound: Sound, onChange: () => void, onWipe: () => void) {
  const set = (patch: Partial<Settings>) => { updateSettings(patch); onChange(); };
  const dlg = h("dialog", { class: "settings", "aria-labelledby": "settings-h" });

  function paint() {
    const st = state.settings;
    const chime = h("select", { onchange: () => { sound.unlock(); set({ chime: chime.value as Settings["chime"] }); } },
      ...CHIMES.map((c) => h("option", { value: c, ...(st.chime === c ? { selected: true } : {}) }, CHIME_NAMES[c])));
    const vol = h("input", { type: "range", min: 0, max: 1, step: 0.05, value: st.volume, oninput: () => set({ volume: Number(vol.value) }) });
    const marker = h("select", { onchange: () => set({ marker: marker.value as Settings["marker"] }) },
      ...MARKERS.map((m) => h("option", { value: m, ...(st.marker === m ? { selected: true } : {}) }, MARKER_NAMES[m])));
    const hid = nextId("hint");
    dlg.replaceChildren(
      h("h2", { id: "settings-h" }, "Settings"),
      h("p", { class: "muted" }, "Sounds stay off until you turn them on. They play only after you press Start."),
      field("Sound", chime),
      field("Volume", vol),
      h("div", { class: "btn-row" }, button("Play a test sound", () => {
        sound.unlock();
        const kind = toneFor("change", state.settings);
        if (kind) sound.play(kind, state.settings.volume);
      }, "small", { "aria-describedby": hid }), h("span", { id: hid, class: "muted" }, "Nothing plays while Sound is Off.")),
      h("div", { class: "field" }, toggle("One minute warning (a quiet tone)", st.warnOneMinute, (v) => set({ warnOneMinute: v })).el),
      h("div", { class: "field" }, toggle("Show the numbers", st.showNumbers, (v) => set({ showNumbers: v })).el),
      field("Marker", marker),
      h("div", { class: "field" }, toggle("Keep the screen awake while the timer runs", st.keepScreenAwake, (v) => set({ keepScreenAwake: v })).el),
      h("hr"),
      h("p", { class: "muted" }, "Saved plans and settings live only in this browser. This deletes only this timer's saved data."),
      h("div", { class: "btn-row" },
        button("Delete this timer's saved data", () => {
          if (!window.confirm("Delete all saved plans and settings for the timer from this browser?")) return;
          onWipe();
          dlg.close();
        }, "danger"),
        button("Close", () => dlg.close(), "primary")));
  }
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  return {
    el: dlg,
    open(opener?: HTMLElement) {
      paint();
      dlg.showModal();
      dlg.addEventListener("close", () => opener?.focus(), { once: true });
    },
  };
}
