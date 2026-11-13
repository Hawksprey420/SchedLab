import type { Algorithm, Schedule } from "../models/types";
import type { SimulationRecord } from "./useSimulation";

/** What the figure and results sections show. Derived from the record and the workload version. */
export type ResultView =
  | { kind: "none" }
  | { kind: "stale" }
  | { kind: "rejected" }
  | { kind: "schedule"; schedule: Schedule; algorithm: Algorithm };

/**
 * A record is shown only while it matches the current workload version, so editing any field
 * replaces the figure and numbers with a message instead of leaving stale values on screen.
 */
export function deriveResultView(record: SimulationRecord | null, version: number): ResultView {
  if (record === null) return { kind: "none" };
  if (record.version !== version) return { kind: "stale" };
  if (!record.outcome.ok) return { kind: "rejected" };
  return { kind: "schedule", schedule: record.outcome.schedule, algorithm: record.algorithm };
}
