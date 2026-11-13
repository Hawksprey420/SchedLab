// The adapter against the real WebAssembly module: plan.md T1 and T2, result shape, and
// every rejection the binding is responsible for.
import { beforeAll, describe, expect, test } from "vitest";
import type { SchedulerAdapter } from "../src/bridge/schedulerAdapter";
import { loadWasmAdapter } from "../src/bridge/wasmAdapter";
import type {
  Algorithm,
  ProcessInput,
  ProcessResult,
  Schedule,
  Segment,
  SimulationOutcome,
} from "../src/models/types";

let adapter: SchedulerAdapter;
beforeAll(async () => {
  adapter = await loadWasmAdapter();
});

const proc = (id: string, arrival: number, burst: number, priority = 1): ProcessInput => ({
  id,
  arrival,
  burst,
  priority,
});

const run = (id: string, begin: number, end: number): Segment => ({
  coreId: "CPU0",
  processId: id,
  idle: false,
  begin,
  end,
});

function expectSchedule(outcome: SimulationOutcome): Schedule {
  if (!outcome.ok) throw new Error(`expected success, got ${JSON.stringify(outcome.errors)}`);
  return outcome.schedule;
}

// [id, arrival, burst, start, completion, waiting, turnaround, response]
type ResultRow = [string, number, number, number, number, number, number, number];

function toResult([id, arrival, burst, start, completion, waiting, turnaround, response]: ResultRow): ProcessResult {
  return { id, arrival, burst, priority: 1, start, completion, waiting, turnaround, response };
}

interface Expected {
  segments: Segment[];
  results: ResultRow[];
  averageWaiting: number;
  averageTurnaround: number;
  makespan: number;
}

function expectScheduleEquals(schedule: Schedule, expected: Expected) {
  expect(schedule.segments).toEqual(expected.segments);
  expect(schedule.results).toEqual(expected.results.map(toResult));
  expect(schedule.averageWaiting).toBeCloseTo(expected.averageWaiting, 9);
  expect(schedule.averageTurnaround).toBeCloseTo(expected.averageTurnaround, 9);
  expect(schedule.makespan).toBe(expected.makespan);
}

describe("T1: everyone arrives at 0", () => {
  const input = [proc("P1", 0, 8), proc("P2", 0, 4), proc("P3", 0, 2)];

  test("FCFS", () => {
    expectScheduleEquals(expectSchedule(adapter.simulate(input, "FCFS")), {
      segments: [run("P1", 0, 8), run("P2", 8, 12), run("P3", 12, 14)],
      results: [
        ["P1", 0, 8, 0, 8, 0, 8, 0],
        ["P2", 0, 4, 8, 12, 8, 12, 8],
        ["P3", 0, 2, 12, 14, 12, 14, 12],
      ],
      averageWaiting: 20 / 3,
      averageTurnaround: 34 / 3,
      makespan: 14,
    });
  });

  test("SJF keeps results in input order, not execution order", () => {
    expectScheduleEquals(expectSchedule(adapter.simulate(input, "SJF_NON_PREEMPTIVE")), {
      segments: [run("P3", 0, 2), run("P2", 2, 6), run("P1", 6, 14)],
      results: [
        ["P1", 0, 8, 6, 14, 6, 14, 6],
        ["P2", 0, 4, 2, 6, 2, 6, 2],
        ["P3", 0, 2, 0, 2, 0, 2, 0],
      ],
      averageWaiting: 8 / 3,
      averageTurnaround: 22 / 3,
      makespan: 14,
    });
  });
});

describe("T2: staggered arrivals, SJF does not preempt", () => {
  const input = [proc("P1", 0, 8), proc("P2", 1, 4), proc("P3", 2, 2)];

  test("FCFS", () => {
    expectScheduleEquals(expectSchedule(adapter.simulate(input, "FCFS")), {
      segments: [run("P1", 0, 8), run("P2", 8, 12), run("P3", 12, 14)],
      results: [
        ["P1", 0, 8, 0, 8, 0, 8, 0],
        ["P2", 1, 4, 8, 12, 7, 11, 7],
        ["P3", 2, 2, 12, 14, 10, 12, 10],
      ],
      averageWaiting: 17 / 3,
      averageTurnaround: 31 / 3,
      makespan: 14,
    });
  });

  test("SJF", () => {
    expectScheduleEquals(expectSchedule(adapter.simulate(input, "SJF_NON_PREEMPTIVE")), {
      segments: [run("P1", 0, 8), run("P3", 8, 10), run("P2", 10, 14)],
      results: [
        ["P1", 0, 8, 0, 8, 0, 8, 0],
        ["P2", 1, 4, 10, 14, 9, 13, 9],
        ["P3", 2, 2, 8, 10, 6, 8, 6],
      ],
      averageWaiting: 5,
      averageTurnaround: 29 / 3,
      makespan: 14,
    });
  });
});

test("idle time before the first arrival is an explicit idle segment", () => {
  const schedule = expectSchedule(adapter.simulate([proc("A", 3, 2)], "FCFS"));
  expect(schedule.segments).toEqual([
    { coreId: "CPU0", processId: "", idle: true, begin: 0, end: 3 },
    run("A", 3, 5),
  ]);
  expect(schedule.makespan).toBe(5);
});

test("a process named like an idle segment's label is not idle", () => {
  const schedule = expectSchedule(adapter.simulate([proc("Idle1", 0, 1)], "FCFS"));
  expect(schedule.segments[0]?.idle).toBe(false);
});

// Deliberately malformed values, which the type system would otherwise forbid.
const untyped = (value: unknown) => value as ProcessInput[];
const valid = proc("P1", 0, 5);

function rejection(processes: ProcessInput[], algorithm: Algorithm = "FCFS") {
  const outcome = adapter.simulate(processes, algorithm);
  if (outcome.ok) throw new Error("expected the input to be rejected");
  return outcome.errors.map(({ processIndex, field }) => ({ processIndex, field }));
}

describe("rejections", () => {
  test("empty list", () => {
    expect(rejection([])).toEqual([{ processIndex: null, field: "processes" }]);
  });

  test("101 processes", () => {
    const many = Array.from({ length: 101 }, (_, i) => proc(`P${i}`, 0, 1));
    expect(rejection(many)).toEqual([{ processIndex: null, field: "processes" }]);
  });

  test("100 processes are accepted", () => {
    const many = Array.from({ length: 100 }, (_, i) => proc(`P${i}`, 0, 1));
    expect(expectSchedule(adapter.simulate(many, "SJF_NON_PREEMPTIVE")).makespan).toBe(100);
  });

  test("duplicate id is reported on the later process", () => {
    expect(rejection([valid, proc("P1", 1, 1)])).toEqual([{ processIndex: 1, field: "id" }]);
  });

  test.each(["IDLE", "idle"])("reserved id %s", (id) => {
    expect(rejection([proc(id, 0, 1)])).toEqual([{ processIndex: 0, field: "id" }]);
  });

  test.each(["", "   "])("blank id %j", (id) => {
    expect(rejection([proc(id, 0, 1)])).toEqual([{ processIndex: 0, field: "id" }]);
  });

  test("negative arrival", () => {
    expect(rejection([proc("P1", -1, 1)])).toEqual([{ processIndex: 0, field: "arrival" }]);
  });

  test("zero burst", () => {
    expect(rejection([proc("P1", 0, 0)])).toEqual([{ processIndex: 0, field: "burst" }]);
  });

  test("fractional burst", () => {
    expect(rejection([proc("P1", 0, 1.5)])).toEqual([{ processIndex: 0, field: "burst" }]);
  });

  test("NaN burst", () => {
    expect(rejection([proc("P1", 0, Number.NaN)])).toEqual([{ processIndex: 0, field: "burst" }]);
  });

  test.each([Infinity, -Infinity])("%s arrival", (arrival) => {
    expect(rejection([proc("P1", arrival, 1)])).toEqual([{ processIndex: 0, field: "arrival" }]);
  });

  test.each([2 ** 53, 1e300])("burst %s above 2^53 - 1", (burst) => {
    expect(rejection([proc("P1", 0, burst)])).toEqual([{ processIndex: 0, field: "burst" }]);
  });

  test("priority outside the 32-bit range", () => {
    expect(rejection([proc("P1", 0, 1, 2 ** 31)])).toEqual([{ processIndex: 0, field: "priority" }]);
  });

  test("missing property", () => {
    const { burst: _omitted, ...withoutBurst } = valid;
    expect(rejection(untyped([withoutBurst]))).toEqual([{ processIndex: 0, field: "burst" }]);
  });

  test("string where a number is expected", () => {
    expect(rejection(untyped([{ ...valid, burst: "5" }]))).toEqual([
      { processIndex: 0, field: "burst" },
    ]);
  });

  test("non-string id", () => {
    expect(rejection(untyped([{ ...valid, id: 7 }]))).toEqual([{ processIndex: 0, field: "id" }]);
  });

  test("a null entry is reported on that index", () => {
    expect(rejection(untyped([valid, null]))).toEqual([{ processIndex: 1, field: "id" }]);
  });

  test("processes that is not an array", () => {
    expect(rejection(untyped({ length: 1 }))).toEqual([{ processIndex: null, field: "processes" }]);
  });

  test("every bad field is reported, on the right process", () => {
    expect(rejection([valid, proc("P2", 0.5, 1.5)])).toEqual([
      { processIndex: 1, field: "arrival" },
      { processIndex: 1, field: "burst" },
    ]);
  });

  test("unknown algorithm name", () => {
    expect(rejection([valid], "RR" as Algorithm)).toEqual([
      { processIndex: null, field: "algorithm" },
    ]);
  });

  test("a schedule too long to represent exactly", () => {
    expect(rejection([proc("P1", Number.MAX_SAFE_INTEGER, 1)])).toEqual([
      { processIndex: null, field: "processes" },
    ]);
  });

  test("every rejection carries a message", () => {
    const outcome = adapter.simulate([], "FCFS");
    expect(!outcome.ok && outcome.errors[0]?.message.length).toBeGreaterThan(0);
  });
});

test("loadWasmAdapter loads the module once", async () => {
  expect(await loadWasmAdapter()).toBe(await loadWasmAdapter());
});

test("large integer average is exact even when its sum exceeds safe integers", () => {
  const schedule = expectSchedule(adapter.simulate([
    proc("A", 0, 9007199254740989), proc("B", 0, 1), proc("C", 0, 1),
  ], "FCFS"));
  expect(schedule.averageTurnaround).toBe(9007199254740990);
});

test.each([null, undefined, 42, false, 1n, [], {}])("rejects non-string algorithm %#", (algorithm) => {
  const outcome = adapter.simulate([valid], algorithm as Algorithm);
  expect(outcome).toMatchObject({ ok: false, errors: [
    { processIndex: null, field: "algorithm" },
  ] });
});

test("rejects a huge ID before WASM allocation and remains usable", () => {
  expect(rejection([proc("x".repeat(3_000_000), 0, 1)])).toEqual([
    { processIndex: 0, field: "id" },
  ]);
  expect(expectSchedule(adapter.simulate([valid], "FCFS")).makespan).toBe(5);
});

test("ID length boundary uses UTF-16 code units", () => {
  expect(expectSchedule(adapter.simulate([proc("😀".repeat(512), 0, 1)], "FCFS")).results[0]?.id)
    .toBe("😀".repeat(512));
  expect(rejection([proc("x".repeat(1025), 0, 1)])).toEqual([
    { processIndex: 0, field: "id" },
  ]);
});
