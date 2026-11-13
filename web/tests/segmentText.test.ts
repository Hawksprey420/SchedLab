import { describe, expect, test } from "vitest";
import { describeSegment, segmentListText, segmentName } from "../src/lib/segmentText";
import type { Segment } from "../src/models/types";

const run: Segment = { coreId: "CPU0", processId: "P2", idle: false, begin: 8, end: 12 };
const idle: Segment = { coreId: "CPU0", processId: "IDLE", idle: true, begin: 1, end: 4 };

describe("segment wording", () => {
  test("names a process by its PID and idle time as idle", () => {
    expect(segmentName(run)).toBe("P2");
    expect(segmentName(idle)).toBe("idle");
  });

  test("describes begin, end and duration for a bar", () => {
    expect(describeSegment(run)).toBe("P2: begin 8, end 12, duration 4 ticks");
    expect(describeSegment(idle)).toBe("Idle: begin 1, end 4, duration 3 ticks");
  });

  test("uses the singular for one tick", () => {
    expect(describeSegment({ ...run, begin: 3, end: 4 })).toBe("P2: begin 3, end 4, duration 1 tick");
  });

  test("groups large numbers", () => {
    expect(describeSegment({ ...run, begin: 0, end: 100_000_000 })).toContain("end 100,000,000, duration 100,000,000 ticks");
  });

  test("lists a segment as 'begin to end: name'", () => {
    expect(segmentListText({ ...run, begin: 0, end: 8, processId: "P1" })).toBe("0 to 8: P1");
    expect(segmentListText(idle)).toBe("1 to 4: idle");
  });
});
