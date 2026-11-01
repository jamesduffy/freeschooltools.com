import { ENGINE, SPECIES, milestone } from "./config";

/** Pure growth engine. No DOM, no timers: tests feed it made up inputs. */
export type EngineState = {
  /** Banked calm time in seconds. */
  bank: number;
  /** Seconds the room has been continuously calm (not saved). */
  calmFor: number;
  /** Seconds the room has been continuously noisy (not saved). */
  noisyFor: number;
  /** Number of species that have arrived. Never goes down except on New tank. */
  arrived: number;
};

export type EngineSettings = {
  /** Session length multiplier: 0.5, 1 or 2. */
  multiplier: number;
  /** When false, noise never pauses or drains anything. */
  loudPausesGrowth: boolean;
};

export const newEngineState = (bank = 0, arrived = 0): EngineState => ({ bank, calmFor: 0, noisyFor: 0, arrived });

/** Milestone of the last species that arrived: the bank never drops below it. */
export function floorFor(arrived: number, multiplier: number): number {
  return arrived > 0 ? milestone(arrived - 1, multiplier) : 0;
}

export function step(state: EngineState, dtSeconds: number, isNoisy: boolean, settings: EngineSettings): EngineState {
  const dt = Math.max(0, dtSeconds);
  let { bank, calmFor, noisyFor } = state;
  const noisy = isNoisy && settings.loudPausesGrowth;

  if (noisy) {
    const before = noisyFor;
    noisyFor += dt; calmFor = 0;
    // Only the part of this step beyond the 5 second mark drains.
    const draining = Math.max(0, noisyFor - Math.max(before, ENGINE.drainAfterSeconds));
    bank -= draining * ENGINE.drainRate;
  } else {
    const before = calmFor;
    calmFor += dt; noisyFor = 0;
    bank += Math.max(0, calmFor - Math.max(before, ENGINE.calmDelaySeconds));
  }

  bank = Math.max(bank, floorFor(state.arrived, settings.multiplier), 0);

  let arrived = state.arrived;
  while (arrived < SPECIES.length && bank >= milestone(arrived, settings.multiplier)) arrived++;
  return { bank, calmFor, noisyFor, arrived };
}

/** 0..1 progress from the last milestone toward the next. 1 once every species has arrived. */
export function growthProgress(state: EngineState, multiplier: number): number {
  if (state.arrived >= SPECIES.length) return 1;
  const lo = state.arrived > 0 ? milestone(state.arrived - 1, multiplier) : 0;
  const hi = milestone(state.arrived, multiplier);
  return Math.min(1, Math.max(0, (state.bank - lo) / (hi - lo)));
}

/** Each fish scales from 60 percent to 100 percent of full size. */
export function growthScale(progress: number): number {
  return ENGINE.minScale + (1 - ENGINE.minScale) * Math.min(1, Math.max(0, progress));
}
