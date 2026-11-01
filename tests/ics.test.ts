import { describe, expect, it } from "vitest";
import { buildIcs, fold, icsEscape } from "../src/iep/ics";
import { computeDeadlines } from "../src/iep/deadlines";

const list = computeDeadlines([{ id: "abc", code: "S-01", goals: [], dates: { lastIepMeeting: "2026-03-12" } }], [], "2026-10-31");
const now = new Date(Date.UTC(2026, 9, 31, 12, 0, 0));

describe("ics", () => {
  const ics = buildIcs(list, { reminder: false, now });
  it("uses CRLF line endings throughout", () => {
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });
  it("writes all-day events with the next day as end, a UID and a DTSTAMP", () => {
    expect(ics).toContain("DTSTART;VALUE=DATE:20270312\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20270313\r\n");
    expect(ics).toContain("UID:abc-annual_review-2027-03-12@freeschooltools.com\r\n");
    expect(ics).toContain("DTSTAMP:20261031T120000Z\r\n");
    expect(ics).toContain("SUMMARY:S-01 annual review due\r\n");
  });
  it("only adds a reminder when asked", () => {
    expect(ics).not.toContain("VALARM");
    expect(buildIcs(list, { reminder: true, now })).toContain("TRIGGER:-P14D");
  });
  it("escapes commas, semicolons, backslashes and newlines", () => {
    expect(icsEscape("a,b;c\\d\ne")).toBe("a\\,b\;c\\\\d\\ne");
  });
  it("folds long lines", () => {
    const f = fold("X:" + "a".repeat(200));
    expect(f.split("\r\n").every((l) => l.length <= 75)).toBe(true);
    expect(f.replace(/\r\n /g, "")).toBe("X:" + "a".repeat(200));
  });
});
