import { s } from "../shared/dom";
import { fromDayNumber, parseYmd, prettyDate, shortDate, toDayNumber, MONTHS } from "./dates";
import type { Goal } from "./model";
import { aimLine, compareSlopes, MIN_TREND_POINTS, trendForData, valueAt } from "./trend";

const INK = "#1b2430", MUTED = "#4a5565", GRID = "#d5dae0", ACCENT = "#0b6466", TREND = "#9a4b00";
const W = 600, H = 340, X0 = 62, X1 = 580, Y0 = 44, Y1 = 262;

export const fmtNum = (n: number) => String(Number(n.toFixed(1)));
export const goalUnit = (g: Goal) => g.target?.unit || g.baseline?.unit || "Value";
const isPercent = (g: Goal) => /%|percent/i.test(`${g.target?.unit ?? ""} ${g.baseline?.unit ?? ""}`);

export function sortedPoints(g: Goal) {
  return [...g.dataPoints].sort((a, b) => a.date.localeCompare(b.date));
}

/** Pick a "nice" step (1, 2, 5 x 10^k) for about `count` intervals. */
function niceStep(range: number, count: number): number {
  const raw = range / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const f = raw / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
}

export function yDomain(g: Goal, values: number[]): { min: number; max: number; step: number } {
  let lo = Math.min(...values), hi = Math.max(...values);
  if (lo === hi) { const p = Math.max(Math.abs(lo) * 0.1, 1); lo -= p; hi += p; }
  const pad = (hi - lo) * 0.1;
  lo -= pad; hi += pad;
  if (Math.min(...values) >= 0 && lo < 0) lo = 0;
  const step = niceStep(hi - lo, 5);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  if (isPercent(g)) { lo = Math.max(0, lo); hi = Math.min(100, hi); }
  return { min: lo, max: hi, step };
}

type Tick = { day: number; label: string; sub?: string };
function xTicks(d0: number, d1: number): Tick[] {
  const span = d1 - d0;
  const ticks: Tick[] = [];
  if (span <= 62) {
    const step = span > 35 ? 14 : 7;
    for (let d = d0; d <= d1; d += step) ticks.push({ day: d, label: shortDate(fromDayNumber(d)) });
    return ticks;
  }
  const a = parseYmd(fromDayNumber(d0))!, b = parseYmd(fromDayNumber(d1))!;
  const months: { day: number; m: number; y: number }[] = [];
  for (let y = a.y, m = a.m; y < b.y || (y === b.y && m <= b.m); m === 12 ? (y++, (m = 1)) : m++) {
    const day = toDayNumber(`${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`);
    if (day >= d0 && day <= d1) months.push({ day, m, y });
  }
  const every = Math.max(1, Math.ceil(months.length / 8));
  months.forEach((mo, i) => { if (i % every === 0) ticks.push({ day: mo.day, label: MONTHS[mo.m - 1]!, sub: i === 0 || mo.m === 1 ? String(mo.y) : undefined }); });
  return ticks;
}

export type GraphInfo = { svg: SVGElement | null; unit: string };

/** Hand-drawn SVG progress graph: data points, dashed aim line, solid thick trend line (4+ points). */
export function buildGraph(code: string, g: Goal): GraphInfo {
  const unit = goalUnit(g);
  const pts = sortedPoints(g);
  const days = [...pts.map((p) => p.date), g.baseline?.date, g.target?.date].filter((d): d is string => !!d).map(toDayNumber);
  const vals = [...pts.map((p) => p.value), g.baseline?.value, g.target?.value].filter((v): v is number => v !== undefined);
  if (!days.length || !vals.length) return { svg: null, unit };

  let d0 = Math.min(...days), d1 = Math.max(...days);
  if (d0 === d1) { d0 -= 7; d1 += 7; }
  const padX = Math.max(1, Math.round((d1 - d0) * 0.03));
  d0 -= padX; d1 += padX;
  const yd = yDomain(g, vals);
  const sx = (day: number) => X0 + ((day - d0) / (d1 - d0)) * (X1 - X0);
  const sy = (v: number) => Y1 - ((v - yd.min) / (yd.max - yd.min)) * (Y1 - Y0);
  const num = (n: number) => Math.round(n * 10) / 10;

  const title = `${code} · ${g.area || "Goal"}`;
  const aim = aimLine(g.baseline, g.target);
  const trend = trendForData(pts);
  const desc = `Line graph of ${unit}. ${pts.length} data point${pts.length === 1 ? "" : "s"}.` +
    (aim ? ` A dashed aim line runs from ${fmtNum(g.baseline!.value)} on ${prettyDate(g.baseline!.date)} to ${fmtNum(g.target!.value)} on ${prettyDate(g.target!.date)}.` : "") +
    (trend ? " A solid thick trend line runs through the data points." : "");

  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", role: "img", "aria-label": `${title}. ${desc}`, class: "graph", "font-family": "inherit" },
    s("title", {}, `${title} progress graph`), s("desc", {}, desc),
    s("rect", { x: 0, y: 0, width: W, height: H, fill: "#fff" }));

  svg.append(s("text", { x: X0, y: 22, "font-size": 18, "font-weight": 700, fill: INK }, title));

  // horizontal grid + y labels
  for (let v = Math.ceil(yd.min / yd.step) * yd.step; v <= yd.max + 1e-9; v += yd.step) {
    const y = num(sy(v));
    svg.append(s("line", { x1: X0, y1: y, x2: X1, y2: y, stroke: GRID, "stroke-width": 1 }));
    svg.append(s("text", { x: X0 - 8, y: y + 5, "font-size": 16, fill: MUTED, "text-anchor": "end" }, fmtNum(v)));
  }
  svg.append(s("line", { x1: X0, y1: Y1, x2: X1, y2: Y1, stroke: INK, "stroke-width": 1.5 }));
  svg.append(s("line", { x1: X0, y1: Y0, x2: X0, y2: Y1, stroke: INK, "stroke-width": 1.5 }));
  // x ticks
  for (const t of xTicks(d0, d1)) {
    const x = num(sx(t.day));
    svg.append(s("line", { x1: x, y1: Y1, x2: x, y2: Y1 + 5, stroke: INK, "stroke-width": 1.5 }));
    svg.append(s("text", { x, y: Y1 + 21, "font-size": 16, fill: MUTED, "text-anchor": "middle" }, t.label));
    if (t.sub) svg.append(s("text", { x, y: Y1 + 37, "font-size": 16, fill: MUTED, "text-anchor": "middle" }, t.sub));
  }
  svg.append(s("text", { x: (X0 + X1) / 2, y: H - 8, "font-size": 16, fill: INK, "text-anchor": "middle" }, "Date"));
  svg.append(s("text", { transform: `translate(16 ${(Y0 + Y1) / 2}) rotate(-90)`, "font-size": 16, fill: INK, "text-anchor": "middle" }, unit));

  // aim line (dashed) with target marker and text labels
  if (aim && g.baseline && g.target) {
    const b = g.baseline, t = g.target;
    svg.append(s("line", { x1: num(sx(toDayNumber(b.date))), y1: num(sy(b.value)), x2: num(sx(toDayNumber(t.date))), y2: num(sy(t.value)), stroke: ACCENT, "stroke-width": 2.5, "stroke-dasharray": "8 6" }));
    const tx = sx(toDayNumber(t.date)), ty = sy(t.value);
    svg.append(s("circle", { cx: num(tx), cy: num(ty), r: 6, fill: "#fff", stroke: ACCENT, "stroke-width": 3 }));
    svg.append(s("text", { x: num(Math.min(tx, X1) - 8), y: num(ty - 12), "font-size": 16, "font-weight": 700, fill: INK, "text-anchor": "end" }, `Target: ${fmtNum(t.value)} by ${shortDate(t.date)}`));
  }
  if (g.baseline) {
    const bx = sx(toDayNumber(g.baseline.date)), by = sy(g.baseline.value);
    svg.append(s("rect", { x: num(bx - 5), y: num(by - 5), width: 10, height: 10, fill: "#fff", stroke: INK, "stroke-width": 2 }));
    svg.append(s("text", { x: num(bx + 10), y: num(by + 22), "font-size": 16, "font-weight": 700, fill: INK }, `Baseline: ${fmtNum(g.baseline.value)}`));
  }

  // trend line (solid, thick) only with 4+ points
  if (trend && pts.length) {
    const a = toDayNumber(pts[0]!.date), z = toDayNumber(pts[pts.length - 1]!.date);
    const ya = trend.slope * a + trend.intercept, yz = trend.slope * z + trend.intercept;
    svg.append(s("line", { x1: num(sx(a)), y1: num(sy(ya)), x2: num(sx(z)), y2: num(sy(yz)), stroke: TREND, "stroke-width": 3.5, "stroke-linecap": "round" }));
    svg.append(s("text", { x: num(sx(z) + 8), y: num(sy(yz) + 5), "font-size": 16, "font-weight": 700, fill: TREND }, "Trend"));
  }

  // data: thin joining line and round markers
  if (pts.length > 1)
    svg.append(s("polyline", { points: pts.map((p) => `${num(sx(toDayNumber(p.date)))},${num(sy(p.value))}`).join(" "), fill: "none", stroke: INK, "stroke-width": 1.5 }));
  for (const p of pts) {
    svg.append(s("circle", { cx: num(sx(toDayNumber(p.date))), cy: num(sy(p.value)), r: 4.5, fill: INK }, s("title", {}, `${prettyDate(p.date)}: ${fmtNum(p.value)}${p.note ? ` (${p.note})` : ""}`)));
  }
  return { svg, unit };
}

/** The legend uses line styles as well as color. */
export function buildLegend(): SVGElement[] {
  const item = (inner: SVGElement[]) => s("svg", { width: 40, height: 16, viewBox: "0 0 40 16", "aria-hidden": "true" }, ...inner);
  return [
    item([s("line", { x1: 2, y1: 8, x2: 38, y2: 8, stroke: INK, "stroke-width": 1.5 }), s("circle", { cx: 20, cy: 8, r: 4.5, fill: INK })]),
    item([s("line", { x1: 2, y1: 8, x2: 38, y2: 8, stroke: ACCENT, "stroke-width": 2.5, "stroke-dasharray": "8 6" })]),
    item([s("line", { x1: 2, y1: 8, x2: 38, y2: 8, stroke: TREND, "stroke-width": 3.5, "stroke-linecap": "round" })]),
  ];
}

export const TREND_NEEDS_MORE = "Add 4 or more data points to see a trend.";
export const DISCLAIMER = "This is a visual aid. Decision rules for changing instruction are set by your team.";

/** Plain, cautious summary lines. Never says a student is or is not making adequate progress. */
export function summaryLines(g: Goal): string[] {
  const pts = sortedPoints(g);
  const out: string[] = [];
  const last = pts[pts.length - 1];
  const aim = aimLine(g.baseline, g.target);
  if (last) {
    out.push(`Latest value: ${fmtNum(last.value)} on ${shortDate(last.date)}.` + (aim ? ` The aim line for that date is ${fmtNum(valueAt(aim, last.date))}.` : ""));
  } else {
    out.push("No data points yet.");
  }
  const trend = trendForData(pts);
  if (trend && aim) {
    const verdict = compareSlopes(trend.slope, aim.slope);
    out.push(`The trend slope is ${verdict} the aim line slope: about ${fmtNum(trend.slope * 7)} per week against ${fmtNum(aim.slope * 7)} per week.`);
  } else if (trend) {
    out.push(`The trend is about ${fmtNum(trend.slope * 7)} per week.`);
  }
  if (pts.length < MIN_TREND_POINTS) out.push(TREND_NEEDS_MORE);
  if (last && !aim) out.push("Add a baseline and a target to see the aim line.");
  return out;
}
