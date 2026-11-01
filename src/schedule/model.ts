import { isPaletteId, PALETTE } from "../shared/palette";
import { ICON_IDS } from "./icons";

export type Mode = "day" | "firstThen";
export type Card = {
  id: string;
  name: string; // the label shown on the card, 30 characters at most
  icon?: string; // an id from the built in icon set, or one emoji
  color?: string; // palette id, same palette as the timer
  startTime?: string; // "HH:MM" in 24 hour local time
  seconds?: number; // optional length, used when exporting to the timer
};
export type Schedule = { id: string; name: string; mode: Mode; activities: Card[] };
export type Progress = { date: string; index: number };
export type Settings = {
  mode: "manual" | "clock";
  showTimes: boolean;
  showClock: boolean;
  highContrast: boolean;
  keepScreenAwake: boolean;
};

/** Everything saved under the one key `schedule.v1`. Progress is kept per schedule, by schedule id. */
export type Store = {
  schemaVersion: 1;
  schedules: Schedule[];
  currentId: string | null;
  progress: Record<string, Progress>;
  settings: Settings;
};

export const KEY_PREFIX = "schedule.";
export const STORAGE_KEY = "schedule.v1";
export const CURRENT_SCHEMA_VERSION = 1;
export const MAX_CARDS = 12;
export const MAX_LABEL = 30;
export const MAX_SCHEDULES = 30;

export const defaultSettings = (): Settings => ({ mode: "manual", showTimes: true, showClock: false, highContrast: false, keepScreenAwake: true });
export const emptyStore = (): Store => ({ schemaVersion: 1, schedules: [], currentId: null, progress: {}, settings: defaultSettings() });

let counter = 0;
export function newId(prefix = "s"): string {
  try {
    const c = (globalThis as { crypto?: Crypto }).crypto;
    if (c?.randomUUID) return `${prefix}-${c.randomUUID().slice(0, 12)}`;
  } catch { /* fall through */ }
  return `${prefix}-${Date.now().toString(36)}${(++counter).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const newCard = (name = "", extra: Partial<Card> = {}): Card => ({ id: newId("c"), name, ...extra });
export const newSchedule = (name = "My schedule", mode: Mode = "day", activities: Card[] = []): Schedule => ({ id: newId(), name, mode, activities });

// ---- small validators ----------------------------------------------------------------
export const isTime = (v: unknown): v is string => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export const isDateStr = (v: unknown): v is string => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

/** True for exactly one emoji (one grapheme that is a picture, not a digit or letter). */
export function isSingleEmoji(v: unknown): v is string {
  if (typeof v !== "string" || !v || v.length > 24) return false;
  if (!/\p{Emoji_Presentation}|\p{Extended_Pictographic}️|\p{Regional_Indicator}/u.test(v)) return false;
  try {
    return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(v)].length === 1;
  } catch { return true; }
}
export const isKnownIcon = (v: unknown): v is string => typeof v === "string" && (ICON_IDS as readonly string[]).includes(v);
export const isValidIcon = (v: unknown): v is string => isKnownIcon(v) || isSingleEmoji(v);

export const toMinutes = (t: string): number => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export function localDateStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export const localMinutes = (d: Date): number => d.getHours() * 60 + d.getMinutes();
export function localTimeStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}
/** 24 hour "HH:MM" to a friendly "1:05 PM". */
export function formatTime(t: string): string {
  const m = toMinutes(t);
  const h24 = Math.floor(m / 60), mm = m % 60;
  return `${h24 % 12 === 0 ? 12 : h24 % 12}:${String(mm).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
}

export function clampLabel(v: string): string {
  return [...v].slice(0, MAX_LABEL).join("");
}

// ---- advancing logic (pure: no DOM, the clock is passed in) --------------------------------
export const CLOCK_NEEDS_TIMES = "Add a time to every card to follow the clock";
export const CLOCK_NEEDS_DAY = "Following the clock works only in Whole day mode";

/** null when the schedule can follow the clock, otherwise the message to show. */
export function clockProblem(s: Schedule): string | null {
  if (s.mode !== "day") return CLOCK_NEEDS_DAY;
  if (s.activities.length === 0) return CLOCK_NEEDS_TIMES;
  let prev = -1;
  for (const c of s.activities) {
    if (!isTime(c.startTime)) return CLOCK_NEEDS_TIMES;
    const m = toMinutes(c.startTime);
    if (m <= prev) return "Start times must get later down the list to follow the clock";
    prev = m;
  }
  return null;
}

/** The last card whose start time is at or before `minutes`. Before the first card it is the first card. Assumes clockProblem is null. */
export function clockIndex(cards: Card[], minutes: number): number {
  let idx = 0;
  cards.forEach((c, i) => { if (isTime(c.startTime) && toMinutes(c.startTime) <= minutes) idx = i; });
  return idx;
}

export const maxIndex = (s: Schedule): number => (s.mode === "firstThen" ? 2 : Math.max(0, s.activities.length - 1));
const clampIndex = (s: Schedule, i: number): number => Math.min(maxIndex(s), Math.max(0, Math.trunc(Number.isFinite(i) ? i : 0)));

/** Saved progress counts only for the date it was saved. A new date, or no progress, starts at the first card. */
export function progressFor(p: Progress | undefined, today: string, s: Schedule): Progress {
  if (!p || p.date !== today) return { date: today, index: 0 };
  return { date: today, index: clampIndex(s, p.index) };
}
export const stepNext = (p: Progress, s: Schedule): Progress => ({ ...p, index: clampIndex(s, p.index + 1) });
export const stepBack = (p: Progress, s: Schedule): Progress => ({ ...p, index: clampIndex(s, p.index - 1) });
export const stepTo = (p: Progress, s: Schedule, i: number): Progress => ({ ...p, index: clampIndex(s, i) });

export type Resolved = { index: number; following: boolean; problem: string | null };
/** Which card is current right now, and whether the clock is driving it. */
export function resolveIndex(s: Schedule, p: Progress | undefined, settings: Settings, now: Date): Resolved {
  const today = localDateStr(now);
  if (settings.mode === "clock") {
    const problem = clockProblem(s);
    if (!problem) return { index: clockIndex(s.activities, localMinutes(now)), following: true, problem: null };
    return { index: progressFor(p, today, s).index, following: false, problem };
  }
  return { index: progressFor(p, today, s).index, following: false, problem: null };
}

export type FirstThenStage = "first" | "then" | "done";
export const firstThenStage = (index: number): FirstThenStage => (index <= 0 ? "first" : index === 1 ? "then" : "done");

/** Text for the polite live region. */
export function announcement(s: Schedule, index: number): string {
  const a = s.activities;
  if (a.length === 0) return "";
  if (s.mode === "firstThen") {
    const st = firstThenStage(index);
    if (st === "first") return `First: ${a[0]!.name}. Then: ${a[1]?.name ?? ""}`;
    if (st === "then") return `Now: ${a[1]?.name ?? ""}`;
    return "All done";
  }
  const now = a[index];
  if (!now) return "";
  const next = a[index + 1];
  return next ? `Now: ${now.name}. Next: ${next.name}` : `Now: ${now.name}`;
}

// ---- validation of a schedule (limits) -----------------------------------------------------
export function scheduleProblem(s: Schedule): string | null {
  if (s.mode === "firstThen" && s.activities.length !== 2) return "First and Then needs exactly 2 cards";
  if (s.activities.length > MAX_CARDS) return `A schedule can have at most ${MAX_CARDS} cards`;
  return null;
}

/** Default color for a card: by icon group so the same kind of activity looks the same every day. */
export const DEFAULT_COLOR = "slate";

// ---- strict validation for stored data ------------------------------------------------------
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function validCard(v: unknown): Card | null {
  if (!isObj(v) || typeof v.id !== "string" || !v.id || typeof v.name !== "string" || v.name.length > MAX_LABEL * 2) return null;
  const c: Card = { id: v.id, name: v.name };
  if (v.icon !== undefined) { if (!isValidIcon(v.icon)) return null; c.icon = v.icon; }
  if (v.color !== undefined) { if (!isPaletteId(v.color)) return null; c.color = v.color; }
  if (v.startTime !== undefined) { if (!isTime(v.startTime)) return null; c.startTime = v.startTime; }
  if (v.seconds !== undefined) { if (typeof v.seconds !== "number" || !Number.isFinite(v.seconds) || v.seconds <= 0) return null; c.seconds = v.seconds; }
  return c;
}

function validSchedule(v: unknown): Schedule | null {
  if (!isObj(v) || typeof v.id !== "string" || !v.id || typeof v.name !== "string" || v.name.length > 100) return null;
  if (v.mode !== "day" && v.mode !== "firstThen") return null;
  if (!Array.isArray(v.activities) || v.activities.length > MAX_CARDS) return null;
  const cards: Card[] = [];
  for (const raw of v.activities) { const c = validCard(raw); if (!c) return null; cards.push(c); }
  return { id: v.id, name: v.name, mode: v.mode, activities: cards };
}

export function validateStore(v: unknown): { ok: true; store: Store } | { ok: false; reason: string } {
  if (!isObj(v)) return { ok: false, reason: "The saved data is not an object." };
  if (v.schemaVersion !== 1) return { ok: false, reason: "Unknown data version." };
  if (!Array.isArray(v.schedules) || v.schedules.length > MAX_SCHEDULES) return { ok: false, reason: "The list of schedules is missing or too long." };
  const schedules: Schedule[] = [];
  for (const raw of v.schedules) {
    const s = validSchedule(raw);
    if (!s) return { ok: false, reason: "A saved schedule is malformed." };
    if (schedules.some((x) => x.id === s.id)) return { ok: false, reason: "Two saved schedules share an id." };
    schedules.push(s);
  }
  if (v.currentId !== null && typeof v.currentId !== "string") return { ok: false, reason: "The current schedule is malformed." };
  const progress: Record<string, Progress> = {};
  if (!isObj(v.progress)) return { ok: false, reason: "The saved progress is malformed." };
  for (const [k, p] of Object.entries(v.progress)) {
    if (!isObj(p) || !isDateStr(p.date) || typeof p.index !== "number" || !Number.isInteger(p.index) || p.index < 0 || p.index > MAX_CARDS) return { ok: false, reason: "The saved progress is malformed." };
    progress[k] = { date: p.date, index: p.index };
  }
  const st = v.settings;
  if (!isObj(st) || (st.mode !== "manual" && st.mode !== "clock") || typeof st.showTimes !== "boolean" || typeof st.showClock !== "boolean" || typeof st.highContrast !== "boolean" || typeof st.keepScreenAwake !== "boolean")
    return { ok: false, reason: "The saved settings are malformed." };
  const currentId = typeof v.currentId === "string" && schedules.some((s) => s.id === v.currentId) ? v.currentId : (schedules[0]?.id ?? null);
  return { ok: true, store: { schemaVersion: 1, schedules, currentId, progress, settings: { mode: st.mode, showTimes: st.showTimes, showClock: st.showClock, highContrast: st.highContrast, keepScreenAwake: st.keepScreenAwake } } };
}

export function migrate(data: { schemaVersion: number }): unknown { return data; }

// ---- timer plan file: export and import ---------------------------------------------------
/** The file the Classroom Pie Timer reads: `{ id, name, totalSeconds?, activities: [{ id, name, seconds, color, icon? }] }`
 *  with no wrapper. `startTime`, `mode` and `scheduleIcon` are extra fields that the timer ignores and this tool reads back. */
export type PlanFile = {
  id: string;
  name: string;
  mode?: Mode;
  totalSeconds?: number;
  activities: { id: string; name: string; seconds?: number; color: string; icon?: string; scheduleIcon?: string; startTime?: string }[];
};

export function exportPlan(s: Schedule): PlanFile {
  const allSeconds = s.activities.length > 0 && s.activities.every((c) => typeof c.seconds === "number");
  const plan: PlanFile = {
    id: s.id,
    name: s.name,
    mode: s.mode,
    activities: s.activities.map((c, i) => {
      const a: PlanFile["activities"][number] = { id: c.id, name: c.name, color: c.color ?? PALETTE[i % PALETTE.length]!.id };
      if (c.seconds !== undefined) a.seconds = c.seconds;
      if (c.icon !== undefined) { if (isKnownIcon(c.icon)) a.scheduleIcon = c.icon; else a.icon = c.icon; }
      if (c.startTime !== undefined) a.startTime = c.startTime;
      return a;
    }),
  };
  if (allSeconds) plan.totalSeconds = s.activities.reduce((n, c) => n + (c.seconds ?? 0), 0);
  return plan;
}

export const exportFileName = (s: Schedule): string => {
  const slug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "schedule";
  return `schedule-${slug}.json`;
};

export type ImportResult =
  | { ok: true; schedule: Schedule; notes: string[] }
  | { ok: false; reason: string };

/** Accepts a timer plan file (or one of our own exports). Drops unknown icons, ignores totalSeconds, rejects anything malformed. */
export function parseImport(text: string): ImportResult {
  if (text.length > 500_000) return { ok: false, reason: "That file is too large to be a schedule." };
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { ok: false, reason: "That file is not valid JSON." }; }
  if (!isObj(data)) return { ok: false, reason: "That file is not a plan file." };
  if (typeof data.name !== "string") return { ok: false, reason: "The plan has no name." };
  if (!Array.isArray(data.activities) || data.activities.length === 0) return { ok: false, reason: "The plan has no activities." };
  if (data.activities.length > MAX_CARDS) return { ok: false, reason: `The plan has ${data.activities.length} activities. A schedule holds at most ${MAX_CARDS}.` };
  const notes: string[] = [];
  let droppedIcons = 0, trimmed = 0;
  const cards: Card[] = [];
  for (const raw of data.activities) {
    if (!isObj(raw) || typeof raw.name !== "string") return { ok: false, reason: "An activity in the plan has no name." };
    const label = raw.name.trim();
    if (!label) return { ok: false, reason: "An activity in the plan has an empty name." };
    const name = clampLabel(label);
    if (name !== label) trimmed++;
    const card: Card = { id: typeof raw.id === "string" && raw.id ? raw.id.slice(0, 64) : newId("c"), name };
    const candidates = [raw.icon, raw.scheduleIcon].filter((v) => v !== undefined);
    if (candidates.length) { const ok = candidates.find(isValidIcon); if (ok) card.icon = ok; else droppedIcons++; }
    if (isPaletteId(raw.color)) card.color = raw.color;
    if (isTime(raw.startTime)) card.startTime = raw.startTime;
    if (typeof raw.seconds === "number" && Number.isFinite(raw.seconds) && raw.seconds > 0) card.seconds = raw.seconds;
    cards.push(card);
  }
  if (new Set(cards.map((c) => c.id)).size !== cards.length) cards.forEach((c) => { c.id = newId("c"); });
  let mode: Mode = "day";
  if (data.mode === "firstThen") {
    if (cards.length === 2) mode = "firstThen";
    else notes.push("The file asked for First and Then but does not have exactly 2 cards, so it was opened as a whole day.");
  }
  if (droppedIcons) notes.push(`${droppedIcons} picture${droppedIcons === 1 ? " was" : "s were"} not recognized and left blank.`);
  if (trimmed) notes.push(`${trimmed} label${trimmed === 1 ? " was" : "s were"} shortened to ${MAX_LABEL} characters.`);
  const id = typeof data.id === "string" && data.id ? data.id.slice(0, 64) : newId();
  return { ok: true, schedule: { id, name: [...(data.name.trim() || "Imported schedule")].slice(0, 60).join(""), mode, activities: cards }, notes };
}
