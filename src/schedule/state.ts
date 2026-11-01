import { emptyStore, KEY_PREFIX, localDateStr, newId, progressFor, type Progress, type Schedule, type Store } from "./model";
import { loadStore, saveStore, type KV, type LoadResult } from "./storage";

export type SaveStatus = "saved" | "saving" | "error";
export type Blocked = { kind: "invalid"; raw: string; reason: string } | { kind: "newer"; raw: string };

const SAVE_DELAY_MS = 400;
let store: Store = emptyStore();
let blocked: Blocked | null = null;
let kv: KV | null = null;
let status: SaveStatus = "saved";
let errorText = "";
let timer: number | undefined;
const listeners = new Set<() => void>();

function getKV(): KV | null { try { return window.localStorage; } catch { return null; } }

export function boot(): LoadResult {
  kv = getKV();
  if (!kv) { status = "error"; errorText = "This browser is not letting the page save anything (private browsing?). Your work will be lost when you close the tab. Use Export to keep a copy."; return { kind: "unavailable", reason: "no storage" }; }
  const res = loadStore(kv);
  if (res.kind === "ok") store = res.store;
  else if (res.kind === "invalid" || res.kind === "newer") blocked = res;
  else if (res.kind === "unavailable") { status = "error"; errorText = "Saved data could not be read from this browser."; }
  return res;
}

export const getStore = () => store;
export const getBlocked = () => blocked;
export const getStatus = () => ({ status, errorText });
export function subscribe(fn: () => void): () => void { listeners.add(fn); return () => listeners.delete(fn); }
const emit = () => listeners.forEach((fn) => fn());

function writeNow() {
  timer = undefined;
  if (blocked) return; // never overwrite data we could not read
  if (!kv) { status = "error"; emit(); return; }
  const r = saveStore(kv, store);
  if (r.ok) { status = "saved"; errorText = ""; }
  else { status = "error"; errorText = `Your changes could not be saved (${r.error}). Browser storage may be full or turned off. Use Export to keep a copy.`; }
  emit();
}

/** Change data, then save shortly after (debounced). */
export function mutate(fn: (s: Store) => void): void {
  if (blocked) return;
  fn(store);
  status = "saving";
  emit();
  window.clearTimeout(timer);
  timer = window.setTimeout(writeNow, SAVE_DELAY_MS);
}

export function flushSave(): void { if (timer !== undefined) { window.clearTimeout(timer); writeNow(); } }

export function clearBlockedAndReset(): void { blocked = null; store = emptyStore(); status = "saved"; errorText = ""; emit(); }

// ---- helpers over the store ------------------------------------------------------------
export function currentSchedule(): Schedule | null {
  return store.schedules.find((s) => s.id === store.currentId) ?? store.schedules[0] ?? null;
}
export function addSchedule(s: Schedule): void {
  mutate((st) => { st.schedules.push(s); st.currentId = s.id; });
}
/** Add a copy with fresh ids, so importing or starting from an example never collides with what is saved. */
export function withFreshIds(s: Schedule): Schedule {
  return { ...s, id: newId(), activities: s.activities.map((c) => ({ ...c, id: newId("c") })) };
}
export function deleteSchedule(id: string): void {
  mutate((st) => {
    st.schedules = st.schedules.filter((s) => s.id !== id);
    delete st.progress[id];
    if (st.currentId === id) st.currentId = st.schedules[0]?.id ?? null;
  });
}
export function selectSchedule(id: string): void { mutate((st) => { st.currentId = id; }); }

/** The saved progress for today (resets to the first card on a new date). */
export function todaysProgress(s: Schedule, now = new Date()): Progress {
  return progressFor(store.progress[s.id], localDateStr(now), s);
}
export function saveProgress(s: Schedule, p: Progress): void { mutate((st) => { st.progress[s.id] = p; }); }

export { KEY_PREFIX };
