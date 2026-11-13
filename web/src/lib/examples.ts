// The example workloads offered by the select. The JSON files follow plan.md section 4.6 and
// live in the repository-level examples/ directory; only their processes are loaded, the
// algorithm radio stays the user's own choice.
import allAtZero from "../../../examples/all-at-zero.json";
import cpuIdle from "../../../examples/cpu-idle.json";
import staggered from "../../../examples/staggered-arrivals.json";
import type { ProcessInput } from "../models/types";

export interface ExampleWorkload {
  id: string;
  label: string;
  processes: ProcessInput[];
}

export const EXAMPLES: readonly ExampleWorkload[] = [
  { id: "all-at-zero", label: "T1: all arrive at tick 0", processes: allAtZero.processes },
  { id: "staggered-arrivals", label: "T2: staggered arrivals", processes: staggered.processes },
  { id: "cpu-idle", label: "CPU idle: a gap between two jobs", processes: cpuIdle.processes },
];

/** The workload the page opens with, so the screen is never blank. */
export const DEFAULT_EXAMPLE: ExampleWorkload = EXAMPLES[0] ?? { id: "empty", label: "Empty", processes: [] };
