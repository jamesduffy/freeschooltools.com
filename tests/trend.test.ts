import { describe, expect, it } from "vitest";
import { aimLine, compareSlopes, computeTrend, trendForData, valueAt } from "../src/iep/trend";

describe("trend", () => {
  it("matches a hand calculation", () => {
    // x: 0,1,2,3  y: 2,3,5,4  -> mean 1.5, 3.5; Sxy 4, Sxx 5 -> slope 0.8, intercept 2.3
    const t = computeTrend([{ x: 0, y: 2 }, { x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 4 }])!;
    expect(t.slope).toBeCloseTo(0.8, 10);
    expect(t.intercept).toBeCloseTo(2.3, 10);
  });
  it("needs 4 dated points", () => {
    const pts = [{ date: "2026-01-01", value: 1 }, { date: "2026-01-02", value: 2 }, { date: "2026-01-03", value: 3 }];
    expect(trendForData(pts)).toBeNull();
    expect(trendForData([...pts, { date: "2026-01-04", value: 4 }])!.slope).toBeCloseTo(1, 10);
  });
  it("aim line interpolates", () => {
    const a = aimLine({ value: 50, date: "2026-01-01" }, { value: 80, date: "2026-01-31" })!;
    expect(valueAt(a, "2026-01-16")).toBeCloseTo(65, 10);
    expect(aimLine({ value: 1, date: "2026-01-01" }, undefined)).toBeNull();
  });
  it("compares slopes", () => {
    expect(compareSlopes(2, 1)).toBe("above");
    expect(compareSlopes(0.5, 1)).toBe("below");
    expect(compareSlopes(1.05, 1)).toBe("near");
  });
});
