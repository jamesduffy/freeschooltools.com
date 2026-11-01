import { describe, expect, it } from "vitest";
import { angleAt, computeArcs, labelPlan, polar, sectorPath } from "../src/timer/geometry";

describe("arc angles", () => {
  it("are proportional to seconds and start at 12 o'clock", () => {
    const a = computeArcs([300, 600, 1200]);
    expect(a[0]!.start).toBe(0);
    expect(a[0]!.end).toBeCloseTo((300 / 2100) * 360);
    expect(a[2]!.end).toBeCloseTo(360);
    for (let i = 1; i < a.length; i++) expect(a[i]!.start).toBeCloseTo(a[i - 1]!.end);
  });
  it("a single slice is the whole circle", () => {
    expect(computeArcs([600])).toEqual([{ start: 0, end: 360 }]);
  });
  it("gives tiny slices a visible minimum width and still totals 360", () => {
    const a = computeArcs([10, 3600, 3600, 10]);
    expect(a[0]!.end - a[0]!.start).toBeGreaterThanOrEqual(3);
    expect(a[3]!.end - a[3]!.start).toBeGreaterThanOrEqual(3);
    expect(a[3]!.end).toBeCloseTo(360);
    expect(computeArcs([])).toEqual([]);
  });
  it("polar angles run clockwise from the top", () => {
    expect(polar(0, 100)).toEqual({ x: 300, y: 200 });
    const r = polar(90, 100);
    expect(r.x).toBeCloseTo(400); expect(r.y).toBeCloseTo(300);
  });
  it("marker angle follows the drawn slices", () => {
    const sl = [{ seconds: 300 }, { seconds: 600 }];
    const arcs = computeArcs(sl.map((s) => s.seconds));
    expect(angleAt(arcs, sl, 0)).toBe(0);
    expect(angleAt(arcs, sl, 150)).toBeCloseTo(arcs[0]!.end / 2);
    expect(angleAt(arcs, sl, 300)).toBeCloseTo(arcs[1]!.start);
    expect(angleAt(arcs, sl, 900)).toBeCloseTo(360);
  });
  it("draws a sector path, and nothing for an empty one", () => {
    expect(sectorPath(0, 90)).toMatch(/^M.*A280 280 0 0 1.*A190 190 0 0 0.*Z$/);
    expect(sectorPath(0, 200)).toContain("0 1 1");
    expect(sectorPath(10, 10)).toBe("");
    expect(sectorPath(0, 360)).not.toBe("");
  });
  it("labels only fit in wide slices", () => {
    expect(labelPlan(160, "Independent reading", false)).toBe("full");
    expect(labelPlan(12, "Independent reading", true)).toBe("icon");
    expect(labelPlan(12, "Independent reading", false)).toBe("none");
    expect(labelPlan(3, "Share", true)).toBe("none");
  });
});
