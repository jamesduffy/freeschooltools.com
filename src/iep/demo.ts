import { newId, type Goal, type Store, type Student } from "./model";

/** Made-up numbers only. Three fake students, one goal each, plus sample school breaks. */
function goal(g: Omit<Goal, "id" | "dismissedFlags">): Goal {
  return { id: newId(), dismissedFlags: [], ...g };
}
const pts = (rows: [string, number, string?][]) => rows.map(([date, value, note]) => (note ? { date, value, note } : { date, value }));

export function demoStore(): Store {
  const s1: Student = {
    id: newId(), code: "S-01",
    dates: { lastIepMeeting: "2026-03-12", lastEvaluation: "2024-05-20" },
    goals: [goal({
      area: "Reading fluency", text: "Student will improve oral reading fluency on grade 3 passages.",
      baseline: { value: 52, unit: "words correct per minute", date: "2026-09-15" },
      target: { value: 80, unit: "words correct per minute", date: "2027-06-05" },
      dataPoints: pts([["2026-09-15", 52, "Baseline probe"], ["2026-09-29", 54], ["2026-10-06", 53, "Short day"], ["2026-10-13", 57], ["2026-10-20", 56], ["2026-10-27", 60]]),
    })],
  };
  const s2: Student = {
    id: newId(), code: "S-02",
    dates: { lastIepMeeting: "2025-11-14", lastEvaluation: "2023-10-20", consentToAssessDate: "2026-11-02" },
    goals: [goal({
      area: "Articulation", text: "Within 36 weeks, Student will produce /r/ in words with 90% accuracy across 3 sessions.",
      baseline: { value: 40, unit: "percent correct", date: "2026-09-10" },
      target: { value: 90, unit: "percent correct", date: "2027-05-28" },
      dataPoints: pts([["2026-09-10", 40, "Baseline"], ["2026-09-17", 45], ["2026-09-24", 42], ["2026-10-01", 50], ["2026-10-08", 55], ["2026-10-15", 52], ["2026-10-22", 60], ["2026-10-29", 63]]),
    })],
  };
  const s3: Student = {
    id: newId(), code: "S-03",
    dates: { lastIepMeeting: "2026-02-02", lastEvaluation: "2023-11-09", referralDate: "2026-10-20" },
    goals: [goal({
      area: "On task behavior", text: "By the annual review, Student will stay on task during independent work in 80% of observed intervals, up from 45%.",
      baseline: { value: 45, unit: "percent of intervals", date: "2026-10-05" },
      target: { value: 80, unit: "percent of intervals", date: "2027-02-02" },
      dataPoints: pts([["2026-10-05", 45, "Baseline"], ["2026-10-19", 50], ["2026-10-29", 48]]),
    })],
  };
  return {
    schemaVersion: 1,
    students: [s1, s2, s3],
    calendar: [
      { start: "2026-11-23", end: "2026-11-27", label: "Fall break" },
      { start: "2026-12-21", end: "2027-01-01", label: "Winter break" },
      { start: "2027-03-29", end: "2027-04-09", label: "Spring break" },
    ],
  };
}
