import { KEY_PREFIX, SCHEMA_VERSION, STORAGE_KEY, migrate, validateGarden, validateStore, type Garden, type Store } from "./model";

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

/** Never throws. */
export function parseStoreText(raw: string): LoadResult {
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return { kind: "invalid", raw, reason: "The saved text is not valid JSON." }; }
  if (typeof data === "object" && data !== null && typeof (data as { schemaVersion?: unknown }).schemaVersion === "number") {
    const v = (data as { schemaVersion: number }).schemaVersion;
    if (v > SCHEMA_VERSION) return { kind: "newer", raw };
    data = migrate(data as { schemaVersion: number });
  }
  const res = validateStore(data);
  return res.ok ? { kind: "ok", store: res.store } : { kind: "invalid", raw, reason: res.reason };
}

export function saveStore(kv: KV, store: Store): { ok: true } | { ok: false; error: string } {
  try { kv.setItem(STORAGE_KEY, JSON.stringify(store)); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Removes only keys that start with "garden.", never anything else on the domain. */
export function deleteAllToolKeys(storage: Storage): void {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && k.startsWith(KEY_PREFIX)) keys.push(k);
  }
  for (const k of keys) storage.removeItem(k);
}

// ---- export and import of one garden ---------------------------------------------
export const FILE_KIND = "class-garden";

export const exportFileName = (g: Garden): string => {
  const slug = g.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "garden";
  return `garden-${slug}.json`;
};

export const exportGardenText = (g: Garden): string => JSON.stringify({ kind: FILE_KIND, schemaVersion: SCHEMA_VERSION, garden: g }, null, 2);

export const MAX_IMPORT_BYTES = 100_000;

/** Validates a garden file. Never throws. The caller gives the garden a fresh id. */
export function parseGardenFile(text: string): { ok: true; garden: Garden } | { ok: false; reason: string } {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, reason: "That file is too big to be a garden." };
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { ok: false, reason: "That file is not a garden file (it is not valid JSON)." }; }
  if (typeof data !== "object" || data === null || Array.isArray(data)) return { ok: false, reason: "That file is not a garden file." };
  const o = data as Record<string, unknown>;
  if (o.kind !== FILE_KIND) return { ok: false, reason: "That file is not a Class Garden file." };
  if (typeof o.schemaVersion === "number" && o.schemaVersion > SCHEMA_VERSION) return { ok: false, reason: "That file was made by a newer version of this tool." };
  if (o.schemaVersion !== SCHEMA_VERSION) return { ok: false, reason: "That file has an unknown version." };
  const r = validateGarden(o.garden);
  return r.ok ? r : { ok: false, reason: `That garden file is not valid: ${r.reason}` };
}

/** Trigger a browser download of text. No network involved. */
export function downloadText(filename: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
