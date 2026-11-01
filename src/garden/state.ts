import { addAmount, addGardenToStore, checkFields, deleteFromShelf, editGarden, emptyStore, makeId, moveToShelf, newGarden, replaceGarden, setTotal, todayISO, undoLast,
  type FieldErrors, type Garden, type GardenInput, type Settings, type Store, type ThemeId } from "./model";
import { loadStore, parseGardenFile, saveStore, type KV } from "./storage";

export type Notice = { kind: "invalid"; raw: string; reason: string } | { kind: "newer"; raw: string };
export type SaveStatus = "saved" | "error";

const BACKUP_KEY = "garden.v1.backup";

let store: Store = emptyStore();
let kv: KV | null = null;
let notice: Notice | null = null;
let readOnly = false;
let status: SaveStatus = "saved";
let errorText = "";
const listeners = new Set<() => void>();

function getKV(): KV | null { try { return window.localStorage; } catch { return null; } }

/** Load saved data. Unreadable data falls back to an empty garden list; a copy of it is kept under garden.v1.backup.
 *  Data from a newer version is left completely alone and saving is turned off. */
export function boot(): void {
  kv = getKV();
  if (!kv) { status = "error"; errorText = "This browser is not letting the page save anything (private browsing?). Your gardens will be lost when you close the tab. Use Export to keep a copy."; return; }
  const res = loadStore(kv);
  if (res.kind === "ok") store = res.store;
  else if (res.kind === "invalid") {
    notice = res;
    try { kv.setItem(BACKUP_KEY, res.raw); } catch { /* best effort */ }
  } else if (res.kind === "newer") { notice = res; readOnly = true; status = "error"; errorText = "The saved gardens were made by a newer version of this tool. They were left alone, and changes made now will not be saved."; }
  else if (res.kind === "unavailable") { status = "error"; errorText = "Saved gardens could not be read from this browser. Changes may not be saved."; }
}

export const getStore = (): Store => store;
export const getNotice = (): Notice | null => notice;
export const dismissNotice = (): void => { notice = null; emit(); };
export const getStatus = (): { status: SaveStatus; errorText: string } => ({ status, errorText });
export function subscribe(fn: () => void): () => void { listeners.add(fn); return () => void listeners.delete(fn); }
const emit = () => listeners.forEach((fn) => fn());

function commit(next: Store): void {
  store = next;
  if (kv && !readOnly) {
    const r = saveStore(kv, store);
    if (r.ok) { status = "saved"; errorText = ""; }
    else { status = "error"; errorText = `Your changes could not be saved (${r.error}). Browser storage may be full or turned off. Use Export to keep a copy.`; }
  }
  emit();
}

export const findGarden = (id: string): Garden | undefined => store.gardens.find((g) => g.id === id);
export const findShelved = (id: string): Garden | undefined => store.shelf.find((g) => g.id === id);

export type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string; errors?: FieldErrors };

export function createGarden(input: GardenInput, theme: ThemeId = "flowers"): Result<{ garden: Garden }> {
  const c = checkFields(input);
  if (!c.ok) return { ok: false, message: "Please fix the highlighted fields.", errors: c.errors };
  const garden = newGarden(c.value, makeId(), todayISO(), theme);
  const r = addGardenToStore(store, garden);
  if (!r.ok) return r;
  commit(r.store);
  return { ok: true, garden };
}

export type Changed = { garden: Garden; finishedNow: boolean };

export function add(id: string, amount: number): (Changed & { added: number }) | null {
  const g = findGarden(id); if (!g) return null;
  const r = addAmount(g, amount, todayISO()); if (!r) return null;
  commit(replaceGarden(store, r.garden));
  return r;
}
export function undo(id: string): { garden: Garden; removed: number } | null {
  const g = findGarden(id); if (!g) return null;
  const r = undoLast(g); if (!r) return null;
  commit(replaceGarden(store, r.garden));
  return r;
}
export function setGardenTotal(id: string, total: number): Changed | null {
  const g = findGarden(id); if (!g) return null;
  const r = setTotal(g, total, todayISO()); if (!r) return null;
  commit(replaceGarden(store, r.garden));
  return r;
}
export function edit(id: string, input: GardenInput): Result<Changed> {
  const g = findGarden(id); if (!g) return { ok: false, message: "That garden was not found." };
  const c = checkFields(input);
  if (!c.ok) return { ok: false, message: "Please fix the highlighted fields.", errors: c.errors };
  const r = editGarden(g, c.value, todayISO());
  commit(replaceGarden(store, r.garden));
  return { ok: true, ...r };
}
export function shelve(id: string): Result {
  const r = moveToShelf(store, id);
  if (!r.ok) return r;
  commit(r.store);
  return { ok: true };
}
export function deleteShelved(id: string): void { commit(deleteFromShelf(store, id)); }

export function updateSettings(patch: Partial<Settings>): void { commit({ ...store, settings: { ...store.settings, ...patch } }); }

/** Adds an imported garden under a fresh id, so it can never clash with one that exists. */
export function importGardenText(text: string): Result<{ garden: Garden }> {
  const p = parseGardenFile(text);
  if (!p.ok) return { ok: false, message: p.reason };
  const garden: Garden = { ...p.garden, id: makeId() };
  const r = addGardenToStore(store, garden);
  if (!r.ok) return r;
  commit(r.store);
  return { ok: true, garden };
}
