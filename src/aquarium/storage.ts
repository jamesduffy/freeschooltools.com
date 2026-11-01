import { SESSION_MULTIPLIER, SPECIES, SOUND, type SessionLength, type SpeciesId } from "./config";
import { clampOffset } from "./sound";

export const STORAGE_KEY = "aquarium.v1";
export const KEY_PREFIX = "aquarium.";
export const CURRENT_SCHEMA_VERSION = 1;

/** The slice of the Storage API we use, so tests can pass a fake. */
export type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type Settings = {
  sensitivityDb: number;
  session: SessionLength;
  loudPausesGrowth: boolean;
  showMeter: boolean;
  showCalmTime: boolean;
  showFactCards: boolean;
};

/** Never contains loudness readings or anything from the microphone. */
export type Store = {
  schemaVersion: 1;
  settings: Settings;
  discovered: SpeciesId[];
  tank: { bank: number; arrived: number };
};

export function defaultStore(): Store {
  return {
    schemaVersion: 1,
    settings: { sensitivityDb: SOUND.offsetDefaultDb, session: "standard", loudPausesGrowth: true, showMeter: false, showCalmTime: false, showFactCards: true },
    discovered: [],
    tank: { bank: 0, arrived: 0 },
  };
}

const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Never throws. Anything unreadable falls back to the default for that field. Returns null if not an object at all. */
export function validateStore(data: unknown): Store | null {
  if (!isObj(data)) return null;
  const d = defaultStore();
  const s = isObj(data.settings) ? data.settings : {};
  const settings: Settings = {
    sensitivityDb: typeof s.sensitivityDb === "number" ? clampOffset(s.sensitivityDb) : d.settings.sensitivityDb,
    session: typeof s.session === "string" && s.session in SESSION_MULTIPLIER ? (s.session as SessionLength) : d.settings.session,
    loudPausesGrowth: bool(s.loudPausesGrowth, d.settings.loudPausesGrowth),
    showMeter: bool(s.showMeter, d.settings.showMeter),
    showCalmTime: bool(s.showCalmTime, d.settings.showCalmTime),
    showFactCards: bool(s.showFactCards, d.settings.showFactCards),
  };
  const known = new Set<string>(SPECIES.map((x) => x.id));
  const discovered = Array.isArray(data.discovered)
    ? [...new Set(data.discovered.filter((x): x is SpeciesId => typeof x === "string" && known.has(x)))]
    : [];
  const t = isObj(data.tank) ? data.tank : {};
  const bank = typeof t.bank === "number" && Number.isFinite(t.bank) && t.bank >= 0 ? Math.min(t.bank, 1e7) : 0;
  const arrivedRaw = typeof t.arrived === "number" && Number.isFinite(t.arrived) ? Math.floor(t.arrived) : 0;
  const arrived = Math.min(SPECIES.length, Math.max(0, arrivedRaw));
  return { schemaVersion: 1, settings, discovered, tank: { bank, arrived } };
}

export type LoadResult =
  | { kind: "empty"; store: Store }
  | { kind: "ok"; store: Store }
  | { kind: "invalid"; store: Store }
  | { kind: "unavailable"; store: Store };

/** Never throws. Always returns a usable store. */
export function loadStore(kv: KV | null): LoadResult {
  if (!kv) return { kind: "unavailable", store: defaultStore() };
  let raw: string | null;
  try { raw = kv.getItem(STORAGE_KEY); } catch { return { kind: "unavailable", store: defaultStore() }; }
  if (raw === null) return { kind: "empty", store: defaultStore() };
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return { kind: "invalid", store: defaultStore() }; }
  if (isObj(data) && typeof data.schemaVersion === "number" && data.schemaVersion > CURRENT_SCHEMA_VERSION) return { kind: "invalid", store: defaultStore() };
  const store = validateStore(data);
  return store ? { kind: "ok", store } : { kind: "invalid", store: defaultStore() };
}

export function saveStore(kv: KV | null, store: Store): boolean {
  if (!kv) return false;
  try { kv.setItem(STORAGE_KEY, JSON.stringify(store)); return true; } catch { return false; }
}

/** Removes only keys that start with "aquarium.", never anything else on the domain. */
export function deleteAllToolKeys(storage: Storage): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) { const k = storage.key(i); if (k && k.startsWith(KEY_PREFIX)) keys.push(k); }
    for (const k of keys) storage.removeItem(k);
  } catch { /* storage unavailable */ }
}
