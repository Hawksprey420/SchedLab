import { expect, test } from "vitest";
import { isHybridSchedule } from "../src/lib/hybridView";
import type { Schedule } from "../src/models/types";

const baseline: Schedule = { segments: [], results: [], averageWaiting: 0, averageTurnaround: 0, makespan: 1 };
test("the graded schedule stays on its original rendering path", () => expect(isHybridSchedule(baseline)).toBe(false));
test("a simulated hybrid schedule uses lane rendering", () => expect(isHybridSchedule({ ...baseline, mode: "SIMULATED" } as Schedule)).toBe(true));
test("a measured label never selects simulation rendering", () => expect(isHybridSchedule({ ...baseline, mode: "NATIVE_MEASURED" } as Schedule)).toBe(false));
