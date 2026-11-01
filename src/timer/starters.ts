import { copyPlan, type Plan } from "./model";

type Row = [string, number, string];
const mk = (id: string, name: string, minutes: number, rows: Row[]): Plan => ({
  id, name, totalSeconds: minutes * 60,
  activities: rows.map(([n, m, color], i) => ({ id: `${id}-${i}`, name: n, seconds: m * 60, color })),
});

/** Examples a teacher can edit freely. Only activity names and times. */
export const STARTER_PLANS: readonly Plan[] = [
  mk("starter-reading", "Reading block", 45, [["Warm up", 5, "coral"], ["Mini lesson", 10, "sun"], ["Independent reading", 20, "mint"], ["Share", 10, "sky"]]),
  mk("starter-math", "Math workshop", 60, [["Number talk", 10, "orange"], ["Mini lesson", 15, "lime"], ["Practice stations", 25, "blue"], ["Wrap up", 10, "pink"]]),
  mk("starter-morning", "Morning routine", 20, [["Unpack", 5, "sky"], ["Morning work", 10, "sun"], ["Calendar", 5, "violet"]]),
  mk("starter-packup", "Pack up", 10, [["Clean desks", 3, "mint"], ["Pack bags", 4, "orange"], ["Circle up", 3, "pink"]]),
];

export const startFromStarter = (id: string): Plan | null => {
  const p = STARTER_PLANS.find((s) => s.id === id);
  return p ? copyPlan(p) : null;
};

export const EMOJI = ["📖", "✏️", "📏", "🎨", "🏃", "💬", "🔢", "🔬", "🎵", "🍎", "🧩", "🤝", "👂", "🧹", "🎒", "⭐", "💡", "🌍", "🖥️", "📝", "🧘", "🎭", "⚽", "🏫"] as const;
