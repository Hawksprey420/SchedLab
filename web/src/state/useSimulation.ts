import { useCallback, useState } from "react";
import type { Algorithm, ProcessInput, SimulationOutcome, Profile, Placement } from "../models/types";
import type { EngineState } from "./useEngine";

export interface SimulationRecord {
  /** The workload version this was computed from; a result is shown only while it matches. */
  version: number;
  algorithm: Algorithm;
  outcome: SimulationOutcome;
}

/** The last result of the scheduler. It never computes anything itself. */
export function useSimulation(engine: EngineState) {
  const [record, setRecord] = useState<SimulationRecord | null>(null);

  const run = useCallback(
    (processes: ProcessInput[], algorithm: Algorithm, version: number, profile: Profile = "SINGLE_CORE", heuristic: Placement = "FIRST_AVAILABLE"): SimulationRecord | null => {
      if (engine.status !== "ready") return null;
      let outcome: SimulationOutcome;
      try {
        outcome = profile === "SINGLE_CORE"
          ? engine.adapter.simulate(processes, algorithm)
          : engine.adapter.simulateHybrid(processes, algorithm, profile, heuristic);
      } catch (error) {
        // The adapter promises not to throw for bad input; anything that does escape is a
        // fault in the engine, which the user can only be told about.
        const detail = error instanceof Error ? error.message : String(error);
        outcome = {
          ok: false,
          errors: [{ processIndex: null, field: "processes", message: `The scheduling engine stopped unexpectedly (${detail}). Reload the page.` }],
        };
      }
      const next = { version, algorithm, outcome };
      setRecord(next);
      return next;
    },
    [engine],
  );

  const clear = useCallback(() => setRecord(null), []);

  return { record, run, clear };
}
