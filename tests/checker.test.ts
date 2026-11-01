import { describe, expect, it } from "vitest";
import { checkGoal } from "../src/iep/checker";
import { maybeContainsName } from "../src/iep/privacy";
import { goal } from "./helpers";

const baseline = { value: 40, unit: "percent", date: "2026-09-01" };
const ids = (g: ReturnType<typeof goal>) => checkGoal(g).map((f) => f.id);

describe("goal checker test corpus", () => {
  it("vague goal, no baseline", () => {
    expect(ids(goal("Student will improve reading."))).toEqual(["no_measure", "no_timeline", "no_baseline"]);
  });
  it("well written, baseline in the wording", () => {
    expect(ids(goal("By 06/05/2027, given grade 3 passages, Student will read 80 words correct per minute on 3 of 4 trials, up from 52."))).toEqual([]);
  });
  it("measure but no timeline", () => {
    expect(ids(goal("Student will use appropriate language 80% of the time.", { baseline }))).toEqual(["no_timeline"]);
  });
  it("well written, baseline field", () => {
    expect(ids(goal("Within 36 weeks, Student will produce /r/ in words with 90% accuracy across 3 sessions.", { baseline }))).toEqual([]);
  });
  it("timeline but no measure", () => {
    expect(ids(goal("By the annual review, Student will improve social skills with peers.", { baseline }))).toEqual(["no_measure"]);
  });
});

describe("generosity", () => {
  it("a target date counts as a timeline", () => {
    expect(ids(goal("Student will read 80 words per minute.", { baseline, target: { value: 80, unit: "wpm", date: "2027-06-05" } }))).toEqual([]);
  });
  it("number words count as a measure", () => {
    expect(ids(goal("By June 2027, Student will answer all questions, up from baseline.", {}))).toEqual([]);
  });
  it("'someone' is not the number word 'one'", () => {
    expect(ids(goal("Student will greet someone.", { baseline })).includes("no_measure")).toBe(true);
  });
  it("dismissed flags are hidden", () => {
    expect(ids(goal("Student will improve reading.", { dismissedFlags: ["no_measure", "no_timeline", "no_baseline"] }))).toEqual([]);
  });
});

describe("name warning", () => {
  it("flags two capitalized words in a row", () => {
    expect(maybeContainsName("Student will work with Maria Lopez.")).toBe(true);
  });
  it("does not flag ordinary goal wording", () => {
    expect(maybeContainsName("By the annual review, Student will read 80 words. Given grade 3 passages, IEP team agrees.")).toBe(false);
  });
});
