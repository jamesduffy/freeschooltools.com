import { CURRENT_SCHEMA_VERSION, KEY_PREFIX, STORAGE_KEY, migrate, validateStore, type Store } from "./model";

/** The slice of the Storage API we use, so tests can pass a fake. */
export type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type LoadResult =
  | { kind: "empty" }
  | { kind: "ok"; store: Store }
  | { kind: "invalid"; raw: string; reason: string }
  | { kind: "newer"; raw: string }
  | { kind: "unavailable"; reason: string };

export function loadStore(kv: KV): LoadResult {
  let raw: string | null;
  try { raw = kv.getItem(STORAGE_KEY); } catch (e) { return { kind: "unavailable", reason: String(e) }; }
  if (raw === null) return { kind: "empty" };
  return parseStoreText(raw);
}

export function parseStoreText(raw: string): LoadResult {
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return { kind: "invalid", raw, reason: "The saved text is not valid JSON." }; }
  if (typeof data === "object" && data !== null && typeof (data as { schemaVersion?: unknown }).schemaVersion === "number") {
    const v = (data as { schemaVersion: number }).schemaVersion;
    if (v > CURRENT_SCHEMA_VERSION) return { kind: "newer", raw };
    data = migrate(data as { schemaVersion: number });
  }
  const res = validateStore(data);
  return res.ok ? { kind: "ok", store: res.store } : { kind: "invalid", raw, reason: res.reason };
}

export function saveStore(kv: KV, store: Store): { ok: true } | { ok: false; error: string } {
  try { kv.setItem(STORAGE_KEY, JSON.stringify(store)); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Removes only this tool's keys (prefix "schedule."), never anything else on the domain. */
export function deleteAllToolKeys(storage: Storage): void {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) { const k = storage.key(i); if (k && k.startsWith(KEY_PREFIX)) keys.push(k); }
  for (const k of keys) storage.removeItem(k);
}

/** Trigger a browser download of text. No network involved. */
export function downloadText(filename: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
