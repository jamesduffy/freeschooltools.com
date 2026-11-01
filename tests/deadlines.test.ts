import { describe, expect, it } from "vitest";
import { addDays, addYears, countWeekdays, todayYmd, weekday } from "../src/iep/dates";
import { computeDeadline, computeDeadlines, explain, statusFor } from "../src/iep/deadlines";
import { RULES } from "../src/iep/rules";

const rule = (id: string) => RULES.find((r) => r.id === id)!;
const winter = { start: "2026-12-21", end: "2027-01-01", label: "winter break" };
const shortBreak = { start: "2026-11-23", end: "2026-11-27", label: "fall break" };

describe("date helpers", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
  it("knows weekdays", () => {
    expect(weekday("2026-12-21")).toBe(1); // Monday
    expect(countWeekdays("2026-12-21", "2027-01-01")).toBe(10);
    expect(countWeekdays("2026-11-23", "2026-11-27")).toBe(5);
  });
  it("todayYmd uses the local calendar date", () => {
    expect(todayYmd(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
  it("addYears clamps Feb 29", () => {
    expect(addYears("2028-02-29", 1)).toEqual({ date: "2029-02-28", clamped: true });
    expect(addYears("2028-02-29", 4)).toEqual({ date: "2032-02-29", clamped: false });
  });
});

describe("deadline math", () => {
  it("referral + 15 days, no breaks", () => {
    expect(computeDeadline(rule("assessment_plan"), "2026-09-08", []).date).toBe("2026-09-23");
  });
  it("consent + 60 days, no breaks", () => {
    expect(computeDeadline(rule("initial_iep"), "2026-11-02", []).date).toBe("2027-01-01");
  });
  it("skips a long winter break", () => {
    const r = computeDeadline(rule("initial_iep"), "2026-11-02", [winter]);
    expect(r.date).toBe("2027-01-13");
    expect(r.skipped).toEqual([winter]);
    expect(explain(rule("initial_iep"), "2026-11-02", r)).toBe(
      "60 days after 2026-11-02, not counting 2026-12-21 to 2027-01-01 (winter break), is 2027-01-13.");
  });
  it("a break of exactly 5 weekdays still counts", () => {
    const r = computeDeadline(rule("initial_iep"), "2026-11-02", [shortBreak]);
    expect(r.date).toBe("2027-01-01");
    expect(r.skipped).toEqual([]);
  });
  it("does not skip breaks for year rules", () => {
    expect(computeDeadline(rule("annual_review"), "2026-03-12", [winter]).date).toBe("2027-03-12");
  });
  it("annual and triennial", () => {
    expect(computeDeadline(rule("annual_review"), "2026-03-12", []).date).toBe("2027-03-12");
    expect(computeDeadline(rule("triennial"), "2024-05-20", []).date).toBe("2027-05-20");
  });
  it("Feb 29 start gives Feb 28 with a visible note", () => {
    const r = computeDeadline(rule("annual_review"), "2028-02-29", []);
    expect(r.date).toBe("2029-02-28");
    expect(r.notes.join(" ")).toMatch(/last day of that month/);
  });
  it("adds a note, but does not move the date, when it lands on a weekend", () => {
    const r = computeDeadline(rule("annual_review"), "2026-03-14", []); // 2027-03-14 is a Sunday
    expect(r.date).toBe("2027-03-14");
    expect(r.notes.join(" ")).toMatch(/Sunday/);
  });
});

describe("deadline list", () => {
  it("sorts by date, skips unset start dates, and labels status", () => {
    const students = [
      { id: "a", code: "S-01", goals: [], dates: { lastIepMeeting: "2026-03-12" } },
      { id: "b", code: "S-02", goals: [], dates: { lastEvaluation: "2023-10-20", lastIepMeeting: "2025-11-14" } },
    ];
    const list = computeDeadlines(students, [], "2026-10-31");
    expect(list.map((d) => `${d.code} ${d.rule.id} ${d.due}`)).toEqual([
      "S-02 triennial 2026-10-20", "S-02 annual_review 2026-11-14", "S-01 annual_review 2027-03-12"]);
    expect(list.map((d) => d.status)).toEqual(["Overdue", "Due within 30 days", "Upcoming"]);
    expect(list[0]!.daysRemaining).toBe(-11);
  });
  it("status boundaries", () => {
    expect(statusFor(-1)).toBe("Overdue");
    expect(statusFor(0)).toBe("Due within 30 days");
    expect(statusFor(30)).toBe("Due within 30 days");
    expect(statusFor(31)).toBe("Upcoming");
  });
  it("every rule starts unverified", () => {
    expect(RULES.every((r) => r.verified === false)).toBe(true);
  });
});
