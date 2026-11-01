import { isValidYmd } from "./dates";

export type Store = {
  schemaVersion: 1;
  students: Student[];
  calendar: NonInstructionalRange[]; // school breaks, used by date math
};

export type Student = {
  id: string; // random uuid
  code: string; // initials or a code like "S-01". There is NO name field.
  dates: KeyDates;
  goals: Goal[];
};

export type KeyDates = {
  lastIepMeeting?: string; // YYYY-MM-DD
  lastEvaluation?: string;
  referralDate?: string;
  consentToAssessDate?: string;
};

export type Goal = {
  id: string;
  area: string; // free text, e.g. "Articulation", "Reading fluency"
  text: string; // the goal wording the teacher wrote
  baseline?: { value: number; unit: string; date: string };
  target?: { value: number; unit: string; date: string };
  dataPoints: { date: string; value: number; note?: string }[];
  dismissedFlags: string[]; // checker flag ids the user marked "this is fine"
};

export type NonInstructionalRange = { start: string; end: string; label: string };

export const CURRENT_SCHEMA_VERSION = 1;
export const STORAGE_KEY = "iepkit.v1";
export const KEY_PREFIX = "iepkit.";

export const KEY_DATE_FIELDS: { key: keyof KeyDates; label: string }[] = [
  { key: "lastIepMeeting", label: "Last IEP meeting" },
  { key: "lastEvaluation", label: "Last evaluation" },
  { key: "referralDate", label: "Referral date" },
  { key: "consentToAssessDate", label: "Consent to assess date" },
];

export function emptyStore(): Store {
  return { schemaVersion: 1, students: [], calendar: [] };
}

export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Fallback for non-secure contexts; still a v4-shaped random id.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function newGoal(area = ""): Goal {
  return { id: newId(), area, text: "", dataPoints: [], dismissedFlags: [] };
}

export function newStudent(code: string): Student {
  return { id: newId(), code, dates: {}, goals: [] };
}

/** Bring an older saved store up to the current version. Only version 1 exists today,
 *  so this returns its input unchanged. Future versions add steps here, oldest first. */
export function migrate<T extends { schemaVersion: number }>(raw: T): T {
  return raw;
}

// ---- validation -------------------------------------------------------------

export type Validation = { ok: true; store: Store } | { ok: false; reason: string };

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const isStr = (x: unknown): x is string => typeof x === "string";

function measure(x: unknown, where: string): string | null {
  if (!isObj(x)) return `${where} is not an object`;
  if (!isNum(x.value)) return `${where}.value is not a number`;
  if (!isStr(x.unit)) return `${where}.unit is not text`;
  if (!isValidYmd(x.date)) return `${where}.date is not a real date`;
  return null;
}

export function validateStore(raw: unknown): Validation {
  const bad = (reason: string): Validation => ({ ok: false, reason });
  if (!isObj(raw)) return bad("The data is not an object.");
  if (!isNum(raw.schemaVersion)) return bad("schemaVersion is missing.");
  if (raw.schemaVersion > CURRENT_SCHEMA_VERSION) return bad("newer");
  if (raw.schemaVersion !== 1) return bad(`Unknown schemaVersion ${raw.schemaVersion}.`);
  if (!Array.isArray(raw.students)) return bad("students is not a list.");
  if (!Array.isArray(raw.calendar)) return bad("calendar is not a list.");

  for (const [i, r] of raw.calendar.entries()) {
    if (!isObj(r) || !isValidYmd(r.start) || !isValidYmd(r.end) || !isStr(r.label)) return bad(`calendar[${i}] is malformed.`);
    if (r.start > r.end) return bad(`calendar[${i}] ends before it starts.`);
  }
  for (const [i, s] of raw.students.entries()) {
    const w = `students[${i}]`;
    if (!isObj(s)) return bad(`${w} is not an object.`);
    if (!isStr(s.id) || !s.id) return bad(`${w}.id is missing.`);
    if (!isStr(s.code)) return bad(`${w}.code is not text.`);
    if (!isObj(s.dates)) return bad(`${w}.dates is not an object.`);
    for (const f of KEY_DATE_FIELDS) {
      const v = s.dates[f.key];
      if (v !== undefined && !isValidYmd(v)) return bad(`${w}.dates.${f.key} is not a real date.`);
    }
    if (!Array.isArray(s.goals)) return bad(`${w}.goals is not a list.`);
    for (const [j, g] of s.goals.entries()) {
      const gw = `${w}.goals[${j}]`;
      if (!isObj(g)) return bad(`${gw} is not an object.`);
      if (!isStr(g.id) || !g.id) return bad(`${gw}.id is missing.`);
      if (!isStr(g.area) || !isStr(g.text)) return bad(`${gw} area or text is not text.`);
      if (g.baseline !== undefined) { const e = measure(g.baseline, `${gw}.baseline`); if (e) return bad(e); }
      if (g.target !== undefined) { const e = measure(g.target, `${gw}.target`); if (e) return bad(e); }
      if (!Array.isArray(g.dataPoints)) return bad(`${gw}.dataPoints is not a list.`);
      for (const [k, p] of g.dataPoints.entries()) {
        if (!isObj(p) || !isValidYmd(p.date) || !isNum(p.value) || (p.note !== undefined && !isStr(p.note)))
          return bad(`${gw}.dataPoints[${k}] is malformed.`);
      }
      if (!Array.isArray(g.dismissedFlags) || !g.dismissedFlags.every(isStr)) return bad(`${gw}.dismissedFlags is malformed.`);
    }
  }
  return { ok: true, store: raw as unknown as Store };
}
