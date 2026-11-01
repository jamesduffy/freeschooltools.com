/** Garden data model and the pure rules for changing it. No DOM code in this file. */

export const KEY_PREFIX = "garden.";
export const STORAGE_KEY = "garden.v1";
export const SCHEMA_VERSION = 1;

export const LIMITS = {
  name: 30,
  unit: 20,
  goalMax: 100000,
  recent: 20,
  active: 6,
  shelf: 50,
  /** A sanity cap so a slipped key can not make the number silly. The spec only says "whole number". */
  totalMax: 10_000_000,
} as const;

export type ThemeId = "flowers";
export const THEME_IDS: ThemeId[] = ["flowers"];

export type Garden = {
  id: string;
  name: string;
  unit: string;
  goal: number;
  total: number;
  theme: ThemeId;
  createdOn: string;
  finishedOn?: string;
  recent: number[];
};

export type Settings = {
  showNumbers: boolean;
  sound: "off" | "chime";
  volume: number;
  keepScreenAwake: boolean;
};

export type Store = { schemaVersion: 1; gardens: Garden[]; shelf: Garden[]; settings: Settings };

export const defaultSettings = (): Settings => ({ showNumbers: true, sound: "off", volume: 0.5, keepScreenAwake: false });
export const emptyStore = (): Store => ({ schemaVersion: 1, gardens: [], shelf: [], settings: defaultSettings() });

// ---- small helpers -----------------------------------------------------------
export function todayISO(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);

/** Parse typed text into a whole number, allowing commas and spaces. Returns null when it is not one. */
export function parseWhole(text: string): number | null {
  const t = text.replace(/[,\s]/g, "");
  if (!/^\d{1,9}$/.test(t)) return null;
  return Number(t);
}

export const cleanText = (v: string, max: number): string => v.replace(/\s+/g, " ").trim().slice(0, max);

export function makeId(): string {
  try { if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID(); } catch { /* fall through */ }
  return `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ---- fields ------------------------------------------------------------------
export type GardenInput = { name: string; unit: string; goal: string | number };
export type FieldErrors = { name?: string; unit?: string; goal?: string };

export function checkFields(input: GardenInput): { ok: true; value: { name: string; unit: string; goal: number } } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const name = cleanText(input.name, 1000);
  const unit = cleanText(input.unit, 1000);
  if (!name) errors.name = "Give the garden a name.";
  else if (name.length > LIMITS.name) errors.name = `Use ${LIMITS.name} characters or fewer.`;
  if (!unit) errors.unit = "Say what you are counting, such as books read.";
  else if (unit.length > LIMITS.unit) errors.unit = `Use ${LIMITS.unit} characters or fewer.`;
  const goal = typeof input.goal === "number" ? (isInt(input.goal) ? input.goal : null) : parseWhole(input.goal);
  if (goal === null || goal < 1 || goal > LIMITS.goalMax) errors.goal = `Enter a whole number from 1 to ${LIMITS.goalMax.toLocaleString("en-US")}.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, unit, goal: goal as number } };
}

export function newGarden(value: { name: string; unit: string; goal: number }, id: string, today: string, theme: ThemeId = "flowers"): Garden {
  return { id, name: value.name, unit: value.unit, goal: value.goal, total: 0, theme, createdOn: today, recent: [] };
}

// ---- changing the total --------------------------------------------------------
/** Records the first time the goal is reached. Once set it is never cleared, so the celebration plays once. */
function stamp(g: Garden, today: string): { garden: Garden; finishedNow: boolean } {
  if (g.finishedOn === undefined && g.total >= g.goal) return { garden: { ...g, finishedOn: today }, finishedNow: true };
  return { garden: g, finishedNow: false };
}

export type Change = { garden: Garden; finishedNow: boolean };

/** Add a whole number of 1 or more. Returns null if the amount is not usable. */
export function addAmount(g: Garden, amount: number, today: string): (Change & { added: number }) | null {
  if (!isInt(amount) || amount < 1) return null;
  const total = Math.min(LIMITS.totalMax, g.total + amount);
  const added = total - g.total;
  if (added < 1) return null;
  const recent = [...g.recent, added].slice(-LIMITS.recent);
  return { ...stamp({ ...g, total, recent }, today), added };
}

/** Remove the most recent amount. Returns null when there is nothing to undo. The celebration record stays. */
export function undoLast(g: Garden): { garden: Garden; removed: number } | null {
  if (g.recent.length === 0) return null;
  const removed = g.recent[g.recent.length - 1] as number;
  return { garden: { ...g, total: Math.max(0, g.total - removed), recent: g.recent.slice(0, -1) }, removed };
}

/** Type the correct total directly. Clears Undo history. */
export function setTotal(g: Garden, total: number, today: string): Change | null {
  if (!isInt(total) || total < 0 || total > LIMITS.totalMax) return null;
  return stamp({ ...g, total, recent: [] }, today);
}

/** Change name, unit and goal. Nothing is lost. If the new goal is already met, the goal counts as reached. */
export function editGarden(g: Garden, value: { name: string; unit: string; goal: number }, today: string): Change {
  return stamp({ ...g, name: value.name, unit: value.unit, goal: value.goal }, today);
}

/** The biggest amount the Add custom field accepts. */
export const customMax = (g: Garden): number => Math.max(1, g.goal);

export function checkCustom(text: string, g: Garden): { ok: true; amount: number } | { ok: false; error: string } {
  const n = parseWhole(text);
  if (n === null || n < 1 || n > customMax(g)) return { ok: false, error: `Enter a whole number from 1 to ${customMax(g).toLocaleString("en-US")}.` };
  return { ok: true, amount: n };
}

// ---- the store: active gardens and the shelf -----------------------------------
export type StoreResult = { ok: true; store: Store } | { ok: false; message: string };

export function addGardenToStore(s: Store, g: Garden): StoreResult {
  if (s.gardens.length >= LIMITS.active) return { ok: false, message: `You can have ${LIMITS.active} active gardens at a time. Move a finished garden to the shelf first.` };
  return { ok: true, store: { ...s, gardens: [...s.gardens, g] } };
}

export function replaceGarden(s: Store, g: Garden): Store {
  return { ...s, gardens: s.gardens.map((x) => (x.id === g.id ? g : x)) };
}

export function moveToShelf(s: Store, id: string): StoreResult {
  const g = s.gardens.find((x) => x.id === id);
  if (!g) return { ok: false, message: "That garden was not found." };
  if (!g.finishedOn) return { ok: false, message: "Only a garden that reached its goal can go on the shelf." };
  if (s.shelf.length >= LIMITS.shelf) return { ok: false, message: `The shelf holds ${LIMITS.shelf} gardens. Delete one from the shelf first.` };
  return { ok: true, store: { ...s, gardens: s.gardens.filter((x) => x.id !== id), shelf: [g, ...s.shelf] } };
}

export function deleteFromShelf(s: Store, id: string): Store {
  return { ...s, shelf: s.shelf.filter((x) => x.id !== id) };
}

// ---- validation ----------------------------------------------------------------
const GARDEN_KEYS = ["id", "name", "unit", "goal", "total", "theme", "createdOn", "finishedOn", "recent"];

/** Returns a clean Garden, or a reason it is not one. Unknown fields are rejected, so nothing extra is ever kept. */
export function validateGarden(v: unknown): { ok: true; garden: Garden } | { ok: false; reason: string } {
  const bad = (reason: string) => ({ ok: false as const, reason });
  if (typeof v !== "object" || v === null || Array.isArray(v)) return bad("A garden is not an object.");
  const o = v as Record<string, unknown>;
  for (const k of Object.keys(o)) if (!GARDEN_KEYS.includes(k)) return bad(`Unexpected field "${k.slice(0, 30)}".`);
  if (typeof o.id !== "string" || o.id.length < 1 || o.id.length > 80) return bad("A garden has no id.");
  if (typeof o.name !== "string" || cleanText(o.name, 1000) !== o.name || o.name.length < 1 || o.name.length > LIMITS.name) return bad("A garden name is missing or too long.");
  if (typeof o.unit !== "string" || cleanText(o.unit, 1000) !== o.unit || o.unit.length < 1 || o.unit.length > LIMITS.unit) return bad("A garden unit is missing or too long.");
  if (!isInt(o.goal) || o.goal < 1 || o.goal > LIMITS.goalMax) return bad("A goal must be a whole number from 1 to 100,000.");
  if (!isInt(o.total) || o.total < 0 || o.total > LIMITS.totalMax) return bad("A total must be a whole number of 0 or more.");
  if (!THEME_IDS.includes(o.theme as ThemeId)) return bad("Unknown theme.");
  if (!isIsoDate(o.createdOn)) return bad("The created date is not a date.");
  if (o.finishedOn !== undefined && !isIsoDate(o.finishedOn)) return bad("The finished date is not a date.");
  if (!Array.isArray(o.recent) || o.recent.length > LIMITS.recent || !o.recent.every((n) => isInt(n) && n >= 1 && n <= LIMITS.totalMax)) return bad("The recent amounts are not valid.");
  const garden: Garden = { id: o.id, name: o.name, unit: o.unit, goal: o.goal, total: o.total, theme: o.theme as ThemeId, createdOn: o.createdOn as string, recent: [...(o.recent as number[])] };
  if (o.finishedOn !== undefined) garden.finishedOn = o.finishedOn as string;
  return { ok: true, garden };
}

/** Settings are forgiving: a missing or odd value falls back to its default. */
export function cleanSettings(v: unknown): Settings {
  const d = defaultSettings();
  if (typeof v !== "object" || v === null) return d;
  const o = v as Record<string, unknown>;
  return {
    showNumbers: typeof o.showNumbers === "boolean" ? o.showNumbers : d.showNumbers,
    sound: o.sound === "chime" ? "chime" : "off",
    volume: typeof o.volume === "number" && o.volume >= 0 && o.volume <= 1 ? o.volume : d.volume,
    keepScreenAwake: typeof o.keepScreenAwake === "boolean" ? o.keepScreenAwake : d.keepScreenAwake,
  };
}

export function validateStore(v: unknown): { ok: true; store: Store } | { ok: false; reason: string } {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return { ok: false, reason: "The saved data is not an object." };
  const o = v as Record<string, unknown>;
  if (o.schemaVersion !== 1) return { ok: false, reason: "Unknown data version." };
  if (!Array.isArray(o.gardens) || !Array.isArray(o.shelf)) return { ok: false, reason: "The saved data has no list of gardens." };
  if (o.gardens.length > LIMITS.active) return { ok: false, reason: "Too many active gardens." };
  if (o.shelf.length > LIMITS.shelf) return { ok: false, reason: "Too many shelved gardens." };
  const seen = new Set<string>();
  const read = (list: unknown[]): { gardens: Garden[] } | { reason: string } => {
    const out: Garden[] = [];
    for (const item of list) {
      const r = validateGarden(item);
      if (!r.ok) return { reason: r.reason };
      if (seen.has(r.garden.id)) return { reason: "Two gardens share an id." };
      seen.add(r.garden.id);
      out.push(r.garden);
    }
    return { gardens: out };
  };
  const a = read(o.gardens); if ("reason" in a) return { ok: false, reason: a.reason };
  const b = read(o.shelf); if ("reason" in b) return { ok: false, reason: b.reason };
  return { ok: true, store: { schemaVersion: 1, gardens: a.gardens, shelf: b.gardens, settings: cleanSettings(o.settings) } };
}

/** Room to change the format later. Version 1 needs no change. */
export function migrate<T extends { schemaVersion: number }>(data: T): T { return data; }
