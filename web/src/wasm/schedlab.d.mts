// Hand-written types for the generated module schedlab.mjs (see scripts/build-wasm.ps1).
import type { Algorithm, ProcessInput, SimulationOutcome } from "../models/types";

export interface TextRunResult {
  exitCode: number;
  stdout: string;
}

export interface SchedLabModule {
  /** Structured call used by the UI. Never throws for invalid input. */
  simulate(processes: ProcessInput[], algorithm: Algorithm): SimulationOutcome;
  /** Same input and output as the schedlab-cli executable; used by the parity test. */
  runText(algorithm: "fcfs" | "sjf", input: string): TextRunResult;
}

declare const createSchedLabModule: () => Promise<SchedLabModule>;
export default createSchedLabModule;
