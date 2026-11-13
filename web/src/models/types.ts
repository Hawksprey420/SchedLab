// Types shared by the UI, the adapter and the WebAssembly module. They mirror the
// C++ core's data (see docs/web-contract.md); the UI never computes a schedule itself.

export type Algorithm = "FCFS" | "SJF_NON_PREEMPTIVE";

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
  field: "id" | "arrival" | "burst" | "priority" | "processes" | "algorithm";
  message: string;
}

export type SimulationOutcome =
  | { ok: true; schedule: Schedule }
  | { ok: false; errors: ValidationError[] };
