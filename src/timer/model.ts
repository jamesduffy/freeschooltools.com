import { isPaletteId, PALETTE } from "../shared/palette";

export type Activity = {
  id: string;
  name: string;
  seconds: number;
  color: string; // palette id
  icon?: string; // one emoji
};

export type Plan = {
  id: string;
  name: string;
  totalSeconds: number;
  activities: Activity[];
};

export type Settings = {
  chime: "off" | "soft" | "bell";
  volume: number;
  warnOneMinute: boolean;
  showNumbers: boolean;
  marker: "rocket" | "snail" | "balloon" | "sun";
  keepScreenAwake: boolean;
};

export const LIMITS = { minSlice: 10, minTotal: 10, maxTotal: 6 * 3600, maxActivities: 12, maxName: 30, defaultSlice: 300 } as const;
export const MARKERS = ["rocket", "snail", "balloon", "sun"] as const;
export const CHIMES = ["off", "soft", "bell"] as const;
export const DEFAULT_SETTINGS: Settings = { chime: "off", volume: 0.4, warnOneMinute: true, showNumbers: true, marker: "rocket", keepScreenAwake: true };

export const CHIMES_LABEL: Record<Settings["chime"], string> = { off: "Off", soft: "Soft chime", bell: "Bell" };

export const FREE_ID = "free";
export const FREE_COLOR = "free";

/** What the ring and the run clock actually walk through: the activities plus a Free time slice for any leftover. */
export type Slice = { id: string; name: string; seconds: number; color: string; icon?: string; free: boolean };

export type Result = { ok: true; plan: Plan } | { ok: false; message: string };

export const MESSAGES = {
  minSlice: `A slice must be at least ${LIMITS.minSlice} seconds.`,
  maxTotal: "A plan can be up to 6 hours long.",
  minTotal: `The total must be at least ${LIMITS.minTotal} seconds.`,
  maxActivities: `A plan can have up to ${LIMITS.maxActivities} activities.`,
  maxName: `Names can be up to ${LIMITS.maxName} characters.`,
  shrinkTooMany: `There is not enough total time to give every activity at least ${LIMITS.minSlice} seconds.`,
} as const;

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function sumSeconds(acts: readonly { seconds: number }[]): number {
  return acts.reduce((n, a) => n + a.seconds, 0);
}
export const leftover = (p: Plan): number => Math.max(0, p.totalSeconds - sumSeconds(p.activities));
export const overBy = (p: Plan): number => Math.max(0, sumSeconds(p.activities) - p.totalSeconds);

export function slicesOf(p: Plan): Slice[] {
  const out: Slice[] = p.activities.map((a) => ({ id: a.id, name: a.name, seconds: a.seconds, color: a.color, ...(a.icon ? { icon: a.icon } : {}), free: false }));
  const left = leftover(p);
  if (left > 0) out.push({ id: FREE_ID, name: "Free time", seconds: left, color: FREE_COLOR, free: true });
  return out;
}

export const slicesTotal = (slices: readonly Slice[]): number => sumSeconds(slices);

// ---- where are we in the plan -------------------------------------------------------
export type Location = { index: number; into: number; left: number; done: boolean };

/** Elapsed 299 with slices 300/600/1200 is slice 0, 300 is slice 1, and 2100 is the end. */
export function locate(slices: readonly { seconds: number }[], elapsed: number): Location {
  const e = Math.max(0, elapsed);
  let start = 0;
  for (let i = 0; i < slices.length; i++) {
    const len = slices[i]!.seconds;
    if (e < start + len) return { index: i, into: e - start, left: start + len - e, done: false };
    start += len;
  }
  const last = slices.length - 1;
  return { index: last, into: last >= 0 ? slices[last]!.seconds : 0, left: 0, done: true };
}

/** Start time (seconds) of the slice after `index`. For the last slice this is the end of the plan. */
export function nextStart(slices: readonly { seconds: number }[], index: number): number {
  return sumSeconds(slices.slice(0, index + 1));
}

// ---- formatting ----------------------------------------------------------------------
export function formatClock(sec: number): string {
  const t = Math.max(0, Math.round(sec));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Spoken or written length such as "20 minutes" or "1 minute 30 seconds". */
export function spokenLength(sec: number): string {
  const t = Math.max(0, Math.round(sec));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const part = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const parts: string[] = [];
  if (h) parts.push(part(h, "hour"));
  if (m) parts.push(part(m, "minute"));
  if (s || parts.length === 0) parts.push(part(s, "second"));
  return parts.join(" ");
}

// ---- limits --------------------------------------------------------------------------
export function clampSlice(sec: number): { value: number; message?: string } {
  const v = Math.round(Number.isFinite(sec) ? sec : LIMITS.defaultSlice);
  if (v < LIMITS.minSlice) return { value: LIMITS.minSlice, message: MESSAGES.minSlice };
  if (v > LIMITS.maxTotal) return { value: LIMITS.maxTotal, message: MESSAGES.maxTotal };
  return { value: v };
}
export function clampTotal(sec: number): { value: number; message?: string } {
  const v = Math.round(Number.isFinite(sec) ? sec : LIMITS.minTotal);
  if (v < LIMITS.minTotal) return { value: LIMITS.minTotal, message: MESSAGES.minTotal };
  if (v > LIMITS.maxTotal) return { value: LIMITS.maxTotal, message: MESSAGES.maxTotal };
  return { value: v };
}

// ---- editing (pure; every function returns a new plan) ---------------------------------
export function nextColor(acts: readonly Activity[]): string {
  const used = new Set(acts.map((a) => a.color));
  return (PALETTE.find((p) => !used.has(p.id)) ?? PALETTE[acts.length % PALETTE.length]!).id;
}

export function addActivity(p: Plan): Result {
  if (p.activities.length >= LIMITS.maxActivities) return { ok: false, message: MESSAGES.maxActivities };
  const a: Activity = { id: uid(), name: "New activity", seconds: LIMITS.defaultSlice, color: nextColor(p.activities) };
  return { ok: true, plan: { ...p, activities: [...p.activities, a] } };
}

export function moveActivity(p: Plan, id: string, dir: -1 | 1): Plan {
  const i = p.activities.findIndex((a) => a.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= p.activities.length) return p;
  const acts = p.activities.slice();
  [acts[i], acts[j]] = [acts[j]!, acts[i]!];
  return { ...p, activities: acts };
}

export const removeActivity = (p: Plan, id: string): Plan => ({ ...p, activities: p.activities.filter((a) => a.id !== id) });

/** Turn the leftover Free time into a real, editable activity at the end. */
export function materializeFree(p: Plan): Result {
  const left = leftover(p);
  if (left <= 0) return { ok: true, plan: p };
  if (p.activities.length >= LIMITS.maxActivities) return { ok: false, message: MESSAGES.maxActivities };
  return { ok: true, plan: { ...p, activities: [...p.activities, { id: uid(), name: "Free time", seconds: left, color: "slate" }] } };
}

export function raiseTotal(p: Plan): Result {
  const sum = sumSeconds(p.activities);
  if (sum > LIMITS.maxTotal) return { ok: false, message: MESSAGES.maxTotal };
  return { ok: true, plan: { ...p, totalSeconds: Math.max(LIMITS.minTotal, sum) } };
}

/** Give every slice at least the minimum and make the sum exact, taking from the last slice first. */
function fixSum(secs: number[], total: number): number[] {
  const out = secs.map((s) => Math.max(LIMITS.minSlice, s));
  let diff = total - sumSeconds(out.map((seconds) => ({ seconds })));
  if (diff >= 0) {
    if (out.length) out[out.length - 1]! += diff;
    return out;
  }
  for (let i = out.length - 1; i >= 0 && diff < 0; i--) {
    const take = Math.min(-diff, out[i]! - LIMITS.minSlice);
    out[i]! -= take;
    diff += take;
  }
  return out;
}

/** Scale every slice by the same ratio, round to whole seconds, and put any rounding remainder in the last slice. */
export function shrinkToFit(p: Plan): Result {
  const n = p.activities.length;
  const sum = sumSeconds(p.activities);
  if (n === 0 || sum <= p.totalSeconds) return { ok: true, plan: p };
  if (p.totalSeconds < n * LIMITS.minSlice) return { ok: false, message: MESSAGES.shrinkTooMany };
  const ratio = p.totalSeconds / sum;
  const secs = fixSum(p.activities.map((a) => Math.round(a.seconds * ratio)), p.totalSeconds);
  return { ok: true, plan: { ...p, activities: p.activities.map((a, i) => ({ ...a, seconds: secs[i]! })) } };
}

/** Divide the total equally; the remainder goes to the last activity. */
export function splitEvenly(p: Plan): Result {
  const n = p.activities.length;
  if (n === 0) return { ok: true, plan: p };
  const each = Math.floor(p.totalSeconds / n);
  if (each < LIMITS.minSlice) return { ok: false, message: MESSAGES.shrinkTooMany };
  const rest = p.totalSeconds - each * n;
  return { ok: true, plan: { ...p, activities: p.activities.map((a, i) => ({ ...a, seconds: each + (i === n - 1 ? rest : 0) })) } };
}

/** Add or take a minute in the slice that is running, changing the plan total by the same amount.
 *  Elapsed time does not change, so the clock does not jump. Refuses to go under 10 seconds or to the end of the slice. */
export function adjustCurrent(p: Plan, elapsed: number, delta: number): Result {
  const slices = slicesOf(p);
  const loc = locate(slices, elapsed);
  if (loc.done || loc.index < 0) return { ok: false, message: "The plan has finished." };
  const slice = slices[loc.index]!;
  const newLen = slice.seconds + delta;
  const newTotal = p.totalSeconds + delta;
  if (newTotal > LIMITS.maxTotal) return { ok: false, message: MESSAGES.maxTotal };
  if (newLen < LIMITS.minSlice) return { ok: false, message: MESSAGES.minSlice };
  if (newLen <= loc.into) return { ok: false, message: "There is not enough time left in this activity to take a minute off." };
  if (slice.free) return { ok: true, plan: { ...p, totalSeconds: newTotal } };
  return { ok: true, plan: { ...p, totalSeconds: newTotal, activities: p.activities.map((a) => (a.id === slice.id ? { ...a, seconds: newLen } : a)) } };
}

export function newPlan(name = "New plan", totalSeconds = 30 * 60): Plan {
  return { id: uid(), name, totalSeconds, activities: [] };
}

export function copyPlan(p: Plan): Plan {
  return { id: uid(), name: p.name, totalSeconds: p.totalSeconds, activities: p.activities.map((a) => ({ ...a, id: uid() })) };
}

// ---- validation (used for saved data and imported files) -----------------------------------
export function isOneEmoji(v: unknown): v is string {
  if (typeof v !== "string" || v.length === 0 || v.length > 16) return false;
  if (!/\p{Extended_Pictographic}/u.test(v)) return false;
  try {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return [...seg.segment(v)].length === 1;
  } catch {
    return [...v].length <= 4;
  }
}

export type ParsedPlan =
  | { ok: true; plan: Plan; needsLength: string[]; totalMissing: boolean }
  | { ok: false; reason: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Check one plan. With `lenient` (import), activities with no `seconds` get the default length and are listed in
 *  `needsLength`, and a missing `totalSeconds` is flagged so the caller can use the sum. Unknown fields are ignored,
 *  and an invalid `color` or `icon` is dropped. */
export function parsePlan(data: unknown, lenient: boolean): ParsedPlan {
  if (!isObj(data)) return { ok: false, reason: "This is not a plan." };
  const acts = data.activities;
  if (!Array.isArray(acts)) return { ok: false, reason: "The plan has no list of activities." };
  if (acts.length === 0) return { ok: false, reason: "The plan has no activities." };
  if (acts.length > LIMITS.maxActivities) return { ok: false, reason: MESSAGES.maxActivities };
  const needsLength: string[] = [];
  const activities: Activity[] = [];
  for (let i = 0; i < acts.length; i++) {
    const a = acts[i];
    if (!isObj(a)) return { ok: false, reason: `Activity ${i + 1} is not valid.` };
    if (typeof a.name !== "string") return { ok: false, reason: `Activity ${i + 1} has no name.` };
    const keep = !lenient && typeof a.id === "string" && a.id !== "" && a.id.length <= 64 && !activities.some((x) => x.id === a.id);
    const id = keep ? (a.id as string) : uid();
    let seconds: number = LIMITS.defaultSlice;
    if (a.seconds === undefined || a.seconds === null) {
      if (!lenient) return { ok: false, reason: `Activity ${i + 1} has no length.` };
      needsLength.push(id);
    } else {
      if (typeof a.seconds !== "number" || !Number.isFinite(a.seconds)) return { ok: false, reason: `Activity ${i + 1} has an invalid length.` };
      seconds = Math.round(a.seconds);
      if (seconds < LIMITS.minSlice) return { ok: false, reason: `Activity ${i + 1}: ${MESSAGES.minSlice}` };
      if (seconds > LIMITS.maxTotal) return { ok: false, reason: `Activity ${i + 1}: ${MESSAGES.maxTotal}` };
    }
    const name = a.name.trim().slice(0, LIMITS.maxName) || "Activity";
    activities.push({ id, name, seconds, color: isPaletteId(a.color) ? a.color : PALETTE[i % PALETTE.length]!.id, ...(isOneEmoji(a.icon) ? { icon: a.icon } : {}) });
  }
  let totalMissing = false;
  let total = sumSeconds(activities);
  if (data.totalSeconds === undefined || data.totalSeconds === null) {
    if (!lenient) return { ok: false, reason: "The plan has no total time." };
    totalMissing = true;
  } else {
    if (typeof data.totalSeconds !== "number" || !Number.isFinite(data.totalSeconds)) return { ok: false, reason: "The total time is invalid." };
    total = Math.round(data.totalSeconds);
    if (total < LIMITS.minTotal) return { ok: false, reason: MESSAGES.minTotal };
    if (total > LIMITS.maxTotal) return { ok: false, reason: MESSAGES.maxTotal };
  }
  const name = (typeof data.name === "string" ? data.name.trim().slice(0, LIMITS.maxName) : "") || "Imported plan";
  const id = !lenient && typeof data.id === "string" && data.id ? data.id.slice(0, 64) : uid();
  return { ok: true, plan: { id, name, totalSeconds: total, activities }, needsLength, totalMissing };
}

/** After the teacher chose lengths for activities that had none, finish an imported plan. */
export function finishImport(parsed: Extract<ParsedPlan, { ok: true }>, lengths: Record<string, number>): ParsedPlan {
  const activities = parsed.plan.activities.map((a) => (lengths[a.id] !== undefined ? { ...a, seconds: clampSlice(lengths[a.id]!).value } : a));
  const sum = sumSeconds(activities);
  let total = parsed.plan.totalSeconds;
  if (parsed.totalMissing) {
    if (sum > LIMITS.maxTotal) return { ok: false, reason: MESSAGES.maxTotal };
    total = Math.max(LIMITS.minTotal, sum);
  }
  return { ok: true, plan: { ...parsed.plan, activities, totalSeconds: total }, needsLength: [], totalMissing: false };
}
