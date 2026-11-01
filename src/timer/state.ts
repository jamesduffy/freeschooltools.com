import { DEFAULT_SETTINGS, type Plan, type Settings } from "./model";
import { emptyStore, loadStore, saveStore, type KV } from "./storage";
import { startFromStarter } from "./starters";

export type SaveStatus = "saved" | "saving" | "error";

export const state: { plan: Plan; settings: Settings; saved: Plan[]; notice: string; status: SaveStatus; errorText: string } = {
  plan: startFromStarter("starter-reading")!,
  settings: { ...DEFAULT_SETTINGS },
  saved: [],
  notice: "",
  status: "saved",
  errorText: "",
};

let kv: KV | null = null;
let readOnly = false;
let timer: number | undefined;
const listeners = new Set<() => void>();
export const subscribe = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((fn) => fn());

/** Load saved plans and settings. Unreadable data falls back to defaults; newer data is left alone. */
export function boot(): void {
  try { kv = window.localStorage; } catch { kv = null; }
  if (!kv) { state.status = "error"; state.errorText = "This browser is not letting the page save anything (private browsing?). Use Export plan to keep a copy."; return; }
  const res = loadStore(kv);
  if (res.kind === "ok") {
    state.settings = res.store.settings;
    state.saved = res.store.plans;
    const last = res.store.plans.find((p) => p.id === res.store.lastPlanId);
    if (last) state.plan = last;
    else if (res.store.plans[0]) state.plan = res.store.plans[0];
  } else if (res.kind === "invalid") {
    state.notice = "Saved data in this browser could not be read, so the timer started fresh.";
  } else if (res.kind === "newer") {
    readOnly = true;
    state.notice = "Saved data in this browser came from a newer version of this tool, so it was left alone and nothing will be saved.";
  } else if (res.kind === "unavailable") {
    state.status = "error"; state.errorText = "Saved data could not be read from this browser.";
  }
}

function writeNow() {
  timer = undefined;
  if (readOnly) return;
  if (!kv) { state.status = "error"; emit(); return; }
  const store = emptyStore();
  store.plans = state.saved;
  store.lastPlanId = state.plan.id;
  store.settings = state.settings;
  const r = saveStore(kv, store);
  if (r.ok) { state.status = "saved"; state.errorText = ""; }
  else { state.status = "error"; state.errorText = `Your changes could not be saved (${r.error}). Browser storage may be full or turned off. Use Export plan to keep a copy.`; }
  emit();
}

function saveSoon() {
  if (readOnly) return;
  state.status = "saving";
  emit();
  window.clearTimeout(timer);
  timer = window.setTimeout(writeNow, 400);
}
export function flushSave(): void { if (timer !== undefined) { window.clearTimeout(timer); writeNow(); } }

/** The plan being edited changed: keep it in the saved list. */
export function setPlan(plan: Plan): void {
  state.plan = plan;
  const i = state.saved.findIndex((p) => p.id === plan.id);
  if (i >= 0) state.saved[i] = plan; else state.saved.push(plan);
  saveSoon();
}
export function updateSettings(patch: Partial<Settings>): void {
  state.settings = { ...state.settings, ...patch };
  saveSoon();
}
export function deletePlan(id: string): void {
  state.saved = state.saved.filter((p) => p.id !== id);
  if (state.plan.id === id) state.plan = state.saved[0] ?? startFromStarter("starter-reading")!;
  saveSoon();
}
export function resetAfterWipe(): void {
  state.saved = []; state.settings = { ...DEFAULT_SETTINGS }; state.plan = startFromStarter("starter-reading")!;
  window.clearTimeout(timer); timer = undefined;
}
