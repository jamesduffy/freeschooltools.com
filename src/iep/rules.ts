import type { KeyDates } from "./model";

/** Deadline rules are DATA, so a special education expert can review and correct them
 *  without reading any code. Change a number or a citation here and every screen follows.
 *
 *  These four are starting points written from memory of California Education Code and
 *  federal regulations. Every one is UNVERIFIED until a special education professional
 *  signs off. Set `verified: true` only after that review. */
export type Rule = {
  id: string;
  name: string; // shown on the Deadlines screen
  eventLabel: string; // used in calendar event titles, after the student code
  startsFrom: keyof KeyDates; // which key date the count starts from
  startLabel: string; // plain words for that key date, used in the math line
  length: number;
  unit: "days" | "years";
  skipLongBreaks: boolean; // days inside a long school break (more than 5 weekdays) do not count
  citation: string;
  verified: boolean;
};

/** A break counts as "long" only if it contains MORE than this many weekdays. */
export const LONG_BREAK_WEEKDAYS = 5;

export const RULES: Rule[] = [
  { id: "assessment_plan", name: "Assessment plan due", eventLabel: "assessment plan due",
    startsFrom: "referralDate", startLabel: "the referral date", length: 15, unit: "days",
    skipLongBreaks: true, citation: "Ed Code 56043(a)", verified: false },
  { id: "initial_iep", name: "Initial IEP meeting due", eventLabel: "initial IEP meeting due",
    startsFrom: "consentToAssessDate", startLabel: "the consent to assess date", length: 60, unit: "days",
    skipLongBreaks: true, citation: "Ed Code 56043(f)", verified: false },
  { id: "annual_review", name: "Annual review due", eventLabel: "annual review due",
    startsFrom: "lastIepMeeting", startLabel: "the last IEP meeting", length: 1, unit: "years",
    skipLongBreaks: false, citation: "Ed Code 56343(d)", verified: false },
  { id: "triennial", name: "Triennial evaluation due", eventLabel: "triennial evaluation due",
    startsFrom: "lastEvaluation", startLabel: "the last evaluation", length: 3, unit: "years",
    skipLongBreaks: false, citation: "Ed Code 56381(a)(2), 34 CFR 300.303", verified: false },
];
