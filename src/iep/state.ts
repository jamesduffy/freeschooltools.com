import { emptyStore, KEY_PREFIX, type Store } from "./model";
import { loadStore, saveStore, type KV, type LoadResult } from "./storage";

export type SaveStatus = "saved" | "saving" | "error";
export type Blocked = { kind: "invalid"; raw: string; reason: string } | { kind: "newer"; raw: string };

const FIRST_RUN_KEY = `${KEY_PREFIX}firstrun`;
const SAVE_DELAY_MS = 400;

let store: Store = emptyStore();
let blocked: Blocked | null = null;
let kv: KV | null = null;
let status: SaveStatus = "saved";
let errorText = "";
let timer: number | undefined;
const listeners = new Set<() => void>();

function getKV(): KV | null {
  try { return window.localStorage; } catch { return null; }
}

/** Load saved data. If it is invalid or from a newer version it is left untouched and saving is disabled. */
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

export function replaceStore(next: Store): void {
  blocked = null;
  store = next;
  window.clearTimeout(timer);
  writeNow();
}

export function flushSave(): void {
  if (timer !== undefined) { window.clearTimeout(timer); writeNow(); }
}

export function firstRunSeen(): boolean {
  try { return kv?.getItem(FIRST_RUN_KEY) === "1"; } catch { return false; }
}
export function markFirstRunSeen(): void {
  try { kv?.setItem(FIRST_RUN_KEY, "1"); } catch { /* the notice just shows again next time */ }
}
