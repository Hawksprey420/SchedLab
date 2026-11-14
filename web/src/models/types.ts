// Types shared by the UI, the adapter and the WebAssembly module. They mirror the
// C++ core's data (see docs/web-contract.md); the UI never computes a schedule itself.

export type Algorithm = "FCFS" | "SJF_NON_PREEMPTIVE";
export type Profile = "SINGLE_CORE" | "INTEL_6P_4E" | "ARM_1_3_4";
export type Placement = "FIRST_AVAILABLE" | "FASTEST_AVAILABLE" | "ENERGY_FIRST";

export interface ProcessInput {
  id: string;
  arrival: number;
  burst: number;
  priority: number;
}

export interface Segment {
  coreId: string;
  processId: string;
  idle: boolean;
  begin: number;
  end: number;
}

export interface ProcessResult extends ProcessInput {
  start: number;
  completion: number;
  waiting: number;
  turnaround: number;
  response: number;
}

export interface Schedule {
  segments: Segment[];
  /** In input order. */
  results: ProcessResult[];
  averageWaiting: number;
  averageTurnaround: number;
  makespan: number;
}

export interface ValidationError {
  /** Index into the input list; null when the error concerns the whole input. */
  processIndex: number | null;
  field: "id" | "arrival" | "burst" | "priority" | "processes" | "algorithm" | "profile" | "heuristic";
  message: string;
}

export type SimulationOutcome =
  | { ok: true; schedule: Schedule }
  | { ok: false; errors: ValidationError[] };

export interface Lane {
  coreId: string;
  rate: number;
  energyPerTick: number;
  busyTicks: number;
  utilisation: number;
}

export interface HybridSchedule extends Schedule {
  mode: "SIMULATED";
  profile: Profile;
  algorithm: Algorithm;
  heuristic: Placement;
  lanes: Lane[];
  totalWork: number;
  energyIndex: number;
}

export type HybridSimulationOutcome =
  | { ok: true; schedule: HybridSchedule }
  | { ok: false; errors: ValidationError[] };
