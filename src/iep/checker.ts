import type { Goal } from "./model";

/** Goal wording checker. Pure, no DOM. Only three flags, all high confidence.
 *  Be generous: if a pattern is arguable, do not fire the flag. */

export type FlagId = "no_measure" | "no_timeline" | "no_baseline";
export type Flag = { id: FlagId; title: string; message: string; why: string; example: string };

const NUMBER_WORDS = "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|half|all";
const NW = `(?:${NUMBER_WORDS})`;
const MONTH = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const UNIT = "(?:days?|weeks?|months?|sessions?|school days?|school weeks?|instructional weeks?|trials?|terms?|quarters?|semesters?|years?|school years?)";

const MEASURE = new RegExp(`\\d|%|\\bout of\\b|\\b${NW}\\b`, "i");

const TIMELINE: RegExp[] = [
  /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/, // 06/05/2027
  /\b\d{4}-\d{2}-\d{2}\b/, // 2027-06-05
  new RegExp(`\\b${MONTH}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?\\b`, "i"), // June 5
  new RegExp(`\\b${MONTH}\\.?,?\\s+(?:19|20)\\d{2}\\b`, "i"), // June 2027
  /\bby\s+(?:19|20)\d{2}\b/i, // by 2027
  new RegExp(`\\bwithin\\s+(?:the\\s+next\\s+|the\\s+)?(?:\\d+|a|an|${NW})\\s+${UNIT}\\b`, "i"),
  new RegExp(`\\bwithin\\s+(?:the\\s+)?(?:next\\s+)?(?:iep|school year|year|annual review)\\b`, "i"),
  new RegExp(`\\b(?:in|over|during)\\s+(?:the\\s+next\\s+)?(?:\\d+|a|an|${NW})\\s+${UNIT}\\b`, "i"),
  /\bby\s+the\s+end\s+of\b/i,
  /\bby\s+(?:the\s+)?(?:next\s+|upcoming\s+)?(?:annual|triennial)\b/i,
  /\bby\s+the\s+(?:next\s+)?(?:iep|annual review)\b/i,
];

const BASELINE_IN_TEXT: RegExp[] = [
  /\bfrom\s+(?:about\s+|approximately\s+|a\s+baseline\s+of\s+)?[\w.%$/-]+(?:\s+[\w%.]+){0,3}?\s+to\s+\S/i, // from X to Y
  /\bup\s+from\b/i,
  /\bbaseline\s+of\b/i,
  /\bbaseline\b/i, // arguable, so be generous
];

const FLAG_TEXT: Record<FlagId, Omit<Flag, "id">> = {
  no_measure: {
    title: "No measurable amount found",
    message: "No measurable amount found. Add how much or how often, such as a percent, a count, or a rate.",
    why: "Without an amount, the team has nothing to graph and nothing to agree on at the meeting.",
    example: "Student will read 80 words correct per minute on 3 of 4 trials.",
  },
  no_timeline: {
    title: "No timeline found",
    message: "No timeline found. Say when the goal should be met.",
    why: "A date or time frame tells the team when to check whether the goal was met.",
    example: "By 06/05/2027, Student will read 80 words correct per minute on grade 3 passages.",
  },
  no_baseline: {
    title: "No starting point found",
    message: "No starting point found. Enter a baseline so progress can be measured.",
    why: "Progress is measured as change from where the student started.",
    example: "Student will read 80 words correct per minute, up from 52 on grade 3 passages.",
  },
};

export function hasMeasure(text: string): boolean { return MEASURE.test(text); }
export function hasTimeline(goal: Pick<Goal, "text" | "target">): boolean {
  return !!goal.target?.date || TIMELINE.some((re) => re.test(goal.text));
}
export function hasBaseline(goal: Pick<Goal, "text" | "baseline">): boolean {
  return (!!goal.baseline && Number.isFinite(goal.baseline.value)) || BASELINE_IN_TEXT.some((re) => re.test(goal.text));
}

/** Every flag that applies, ignoring "this is fine" dismissals. */
export function allFlags(goal: Goal): Flag[] {
  const out: FlagId[] = [];
  if (!hasMeasure(goal.text)) out.push("no_measure");
  if (!hasTimeline(goal)) out.push("no_timeline");
  if (!hasBaseline(goal)) out.push("no_baseline");
  return out.map((id) => ({ id, ...FLAG_TEXT[id] }));
}

/** Flags to show: those that apply and have not been dismissed. */
export function checkGoal(goal: Goal): Flag[] {
  return allFlags(goal).filter((f) => !goal.dismissedFlags.includes(f.id));
}
