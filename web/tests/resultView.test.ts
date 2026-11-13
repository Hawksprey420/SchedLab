import { describe, expect, test } from "vitest";
import type { Schedule } from "../src/models/types";
import { deriveResultView } from "../src/state/resultView";
import type { SimulationRecord } from "../src/state/useSimulation";

const schedule: Schedule = { segments: [], results: [], averageWaiting: 0, averageTurnaround: 0, makespan: 0 };
const ok: SimulationRecord = { version: 3, algorithm: "FCFS", outcome: { ok: true, schedule } };
const rejected: SimulationRecord = {
  version: 3,
  algorithm: "FCFS",
  outcome: { ok: false, errors: [{ processIndex: null, field: "processes", message: "x" }] },
};

describe("deriveResultView", () => {
  test("shows no result before the first run", () => {
    expect(deriveResultView(null, 0)).toEqual({ kind: "none" });
  });

  test("shows the schedule while the workload is unchanged", () => {
    expect(deriveResultView(ok, 3)).toEqual({ kind: "schedule", schedule, algorithm: "FCFS" });
  });

  test("replaces the schedule with a stale message as soon as the workload version moves", () => {
    expect(deriveResultView(ok, 4)).toEqual({ kind: "stale" });
  });

  test("shows a core rejection only for the workload it was computed from", () => {
    expect(deriveResultView(rejected, 3)).toEqual({ kind: "rejected" });
    expect(deriveResultView(rejected, 5)).toEqual({ kind: "stale" });
  });
});
