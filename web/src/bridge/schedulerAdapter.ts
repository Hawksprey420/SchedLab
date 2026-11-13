import type { Algorithm, ProcessInput, SimulationOutcome } from "../models/types";

/** The only way the UI reaches the scheduler; implementations must not throw for bad input. */
export interface SchedulerAdapter {
  simulate(processes: ProcessInput[], algorithm: Algorithm): SimulationOutcome;
}
