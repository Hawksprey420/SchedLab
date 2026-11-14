import { expect, test } from "vitest";
import createSchedLabModule from "../src/wasm/schedlab.mjs";
import { loadWasmAdapter } from "../src/bridge/wasmAdapter";
import type { Algorithm, ProcessInput } from "../src/models/types";

const wasm = await createSchedLabModule();
const adapter = await loadWasmAdapter();
const profiles = ["SINGLE_CORE", "INTEL_6P_4E", "ARM_1_3_4"] as const;
const heuristics = ["FIRST_AVAILABLE", "FASTEST_AVAILABLE", "ENERGY_FIRST"] as const;
const algorithms: Algorithm[] = ["FCFS", "SJF_NON_PREEMPTIVE"];
const proc = (id = "A", arrival = 3, burst = 5): ProcessInput => ({ id, arrival, burst, priority: 0 });

test("the real adapter exposes simulateHybrid", () => {
  expect(adapter).toHaveProperty("simulateHybrid", expect.any(Function));
  expect(wasm).toHaveProperty("runHybridText", expect.any(Function));
});

test.each(profiles)("hand-computed flattened structured output for %s", (profile) => {
  // A arrives at 3: ceil(5/rate); energy=duration*cost. Stable IDs choose E0/Big0 first.
  const expected = profile === "SINGLE_CORE"
    ? [["CPU0", 1, 1, 5], ["CPU0", 1, 1, 5], ["CPU0", 1, 1, 5]] as const
    : profile === "INTEL_6P_4E"
      ? [["E0", 1, 1, 5], ["P0", 2, 3, 3], ["E0", 1, 1, 5]] as const
      : [["Big0", 2, 3, 3], ["Prime0", 3, 5, 2], ["LITTLE0", 1, 1, 5]] as const;
  for (const algorithm of algorithms) for (const [i, heuristic] of heuristics.entries()) {
    const result = adapter.simulateHybrid([proc()], algorithm, profile, heuristic);
    expect(result.ok).toBe(true);
    if (!result.ok) continue;
    const s = result.schedule;
    const [id, rate, cost, duration] = expected[i]!;
    expect(s).toMatchObject({ mode: "SIMULATED", profile, algorithm, heuristic, totalWork: 5,
      energyIndex: duration * cost, makespan: 3 + duration, averageWaiting: 0,
      averageTurnaround: duration });
    expect(s.segments.filter((x) => !x.idle)).toEqual([
      { coreId: id, processId: "A", idle: false, begin: 3, end: 3 + duration },
    ]);
    expect(s.lanes.find((lane) => lane.coreId === id)).toEqual({ coreId: id, rate,
      energyPerTick: cost, busyTicks: duration, utilisation: duration / (3 + duration) });
  }
});

test("all single-core fields exactly match the existing call, including idles and averages", () => {
  for (let seed = 0; seed < 12; seed++) {
    const input = Array.from({ length: seed * 8 + 1 }, (_, i) =>
      proc(`P${i}`, (i * 7 + seed) % 43 + 3, (i * 13 + seed) % 17 + 1));
    for (const algorithm of algorithms) for (const heuristic of heuristics) {
      const baseline = adapter.simulate(input, algorithm);
      const hybrid = adapter.simulateHybrid(input, algorithm, "SINGLE_CORE", heuristic);
      expect(baseline.ok && hybrid.ok).toBe(true);
      if (!baseline.ok || !hybrid.ok) continue;
      const { mode: _mode, profile: _profile, algorithm: _algorithm, heuristic: _heuristic,
        lanes: _lanes, totalWork: _work, energyIndex: _energy, ...schedule } = hybrid.schedule;
      expect(schedule).toEqual(baseline.schedule);
    }
  }
});

type Settings = [unknown, unknown, unknown];
const invalidSettings = [undefined, null, 42, false, 1n, Symbol("setting"), [], {}, "x", "X".repeat(3_000_000)];
for (const [index, field] of ["algorithm", "profile", "heuristic"].entries()) {
  test.each(invalidSettings)(`rejects malformed ${field} %# before conversion`, (value) => {
    const settings: Settings = ["FCFS", "INTEL_6P_4E", "FIRST_AVAILABLE"];
    settings[index] = value;
    const call = wasm.simulateHybrid as (...args: unknown[]) => unknown;
    expect(call([proc()], ...settings)).toMatchObject({ ok: false, errors: [
      { processIndex: null, field, message: expect.any(String) },
    ] });
  });
}

test.each([
  { input: [], field: "processes" },
  { input: null, field: "processes" },
  { input: [null], field: "id" },
  { input: [proc("IDLE")], field: "id" },
  { input: [proc("")], field: "id" },
  { input: [proc("x".repeat(1025))], field: "id" },
  { input: [proc(), proc()], field: "id" },
  { input: Array.from({ length: 101 }, (_, i) => proc(`P${i}`)), field: "processes" },
  { input: [proc("A", -1)], field: "arrival" },
  { input: [proc("A", 0, 0)], field: "burst" },
  { input: [proc("A", 0, -1)], field: "burst" },
  { input: [proc("A", 0, 1.5)], field: "burst" },
  { input: [proc("A", NaN)], field: "arrival" },
  { input: [proc("A", Infinity)], field: "arrival" },
  { input: [proc("A", 0, 2 ** 53)], field: "burst" },
  { input: [{ ...proc(), priority: 2 ** 31 }], field: "priority" },
  { input: [{ ...proc(), burst: "5" }], field: "burst" },
  { input: [{ ...proc(), arrival: undefined }], field: "arrival" },
])("reuses process validation %#", ({ input, field }) => {
  const call = wasm.simulateHybrid as (...args: unknown[]) => unknown;
  expect(call(input, "FCFS", "ARM_1_3_4", "FASTEST_AVAILABLE")).toMatchObject({
    ok: false, errors: expect.arrayContaining([{ processIndex: field === "processes" ? null : expect.any(Number), field, message: expect.any(String) }]),
  });
});

test("rejects unsafe returned makespan, total work, and energy independently", () => {
  const tooLong = adapter.simulateHybrid([proc("A", Number.MAX_SAFE_INTEGER, 1)],
    "FCFS", "INTEL_6P_4E", "FIRST_AVAILABLE");
  const work = adapter.simulateHybrid([proc("A", 0, Number.MAX_SAFE_INTEGER), proc("B", 0, 1)],
    "FCFS", "INTEL_6P_4E", "FIRST_AVAILABLE");
  // ceil(MAX_SAFE/2)*3 exceeds MAX_SAFE although every input and completion is safe.
  const energy = adapter.simulateHybrid([proc("A", 0, Number.MAX_SAFE_INTEGER)],
    "FCFS", "INTEL_6P_4E", "FASTEST_AVAILABLE");
  for (const outcome of [tooLong, work, energy]) expect(outcome).toMatchObject({ ok: false,
    errors: [{ processIndex: null, field: "processes", message: expect.any(String) }] });
});

test("module stays usable after rejected requests", () => {
  expect(adapter.simulateHybrid([proc()], "FCFS", "SINGLE_CORE", "FIRST_AVAILABLE").ok).toBe(true);
});
