import { CHIMES, DEFAULT_SETTINGS, MARKERS, parsePlan, type ParsedPlan, type Plan, type Settings } from "./model";

export const KEY_PREFIX = "timer.";
export const STORAGE_KEY = "timer.v1";
export const SCHEMA_VERSION = 1;

/** The slice of the Storage API we use, so tests can pass a fake. */
export type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type Store = { schemaVersion: 1; plans: Plan[]; lastPlanId: string | null; settings: Settings };
export const emptyStore = (): Store => ({ schemaVersion: 1, plans: [], lastPlanId: null, settings: { ...DEFAULT_SETTINGS } });

export type LoadResult =
  | { kind: "empty" }
  | { kind: "ok"; store: Store }
  | { kind: "invalid"; reason: string }
  | { kind: "newer" }
  | { kind: "unavailable"; reason: string };

export function validateSettings(v: unknown): Settings {
  const d = DEFAULT_SETTINGS;
  const o = (typeof v === "object" && v !== null ? v : {}) as Record<string, unknown>;
  const vol = typeof o.volume === "number" && Number.isFinite(o.volume) ? Math.min(1, Math.max(0, o.volume)) : d.volume;
  return {
    chime: CHIMES.find((c) => c === o.chime) ?? d.chime,
    volume: vol,
    warnOneMinute: typeof o.warnOneMinute === "boolean" ? o.warnOneMinute : d.warnOneMinute,
    showNumbers: typeof o.showNumbers === "boolean" ? o.showNumbers : d.showNumbers,
    marker: MARKERS.find((m) => m === o.marker) ?? d.marker,
    keepScreenAwake: typeof o.keepScreenAwake === "boolean" ? o.keepScreenAwake : d.keepScreenAwake,
  };
}

/** Never throws. Bad plans are dropped, bad settings fall back to defaults. */
export function parseStoreText(raw: string): LoadResult {
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return { kind: "invalid", reason: "The saved text is not valid JSON." }; }
  if (typeof data !== "object" || data === null || Array.isArray(data)) return { kind: "invalid", reason: "The saved data has the wrong shape." };
  const o = data as Record<string, unknown>;
  if (typeof o.schemaVersion === "number" && o.schemaVersion > SCHEMA_VERSION) return { kind: "newer" };
  if (o.schemaVersion !== SCHEMA_VERSION) return { kind: "invalid", reason: "The saved data has no known version." };
  if (!Array.isArray(o.plans)) return { kind: "invalid", reason: "The saved data has no plan list." };
  const plans: Plan[] = [];
  for (const p of o.plans) {
    const r = parsePlan(p, false);
    if (r.ok && !plans.some((q) => q.id === r.plan.id)) plans.push(r.plan);
  }
  const lastPlanId = typeof o.lastPlanId === "string" ? o.lastPlanId : null;
  return { kind: "ok", store: { schemaVersion: 1, plans, lastPlanId, settings: validateSettings(o.settings) } };
}

export function loadStore(kv: KV): LoadResult {
  let raw: string | null;
  try { raw = kv.getItem(STORAGE_KEY); } catch (e) { return { kind: "unavailable", reason: String(e) }; }
  if (raw === null) return { kind: "empty" };
  return parseStoreText(raw);
}

export function saveStore(kv: KV, store: Store): { ok: true } | { ok: false; error: string } {
  try { kv.setItem(STORAGE_KEY, JSON.stringify(store)); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Removes only this tool's keys (prefix "timer."), never anything else on the domain. */
export function deleteAllToolKeys(storage: Storage): void {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && k.startsWith(KEY_PREFIX)) keys.push(k);
  }
  for (const k of keys) storage.removeItem(k);
}

// ---- plan files ---------------------------------------------------------------------
export const MAX_IMPORT_BYTES = 200_000;

/** The exported file is exactly the Plan object, with no wrapper. */
export const exportPlanText = (plan: Plan): string => JSON.stringify(plan, null, 2);

export function exportFileName(plan: Plan): string {
  const slug = plan.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "plan";
  return `timer-plan-${slug}.json`;
}

/** Trigger a browser download of text. No network involved. */
export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Check the text of an imported plan file. Never throws. Unknown fields are ignored. */
export function parsePlanFileText(text: string): ParsedPlan {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, reason: "This file is too big to be a plan." };
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { ok: false, reason: "This file is not valid JSON." }; }
  return parsePlan(data, true);
}
