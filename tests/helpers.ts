import type { Goal } from "../src/iep/model";
export const goal = (text: string, extra: Partial<Goal> = {}): Goal => ({ id: "g", area: "x", text, dataPoints: [], dismissedFlags: [], ...extra });
export const fakeKV = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};
