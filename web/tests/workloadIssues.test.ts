// Turning editor rows into core input, and core errors back into per-field messages.
import { describe, expect, test } from "vitest";
import { mapCoreErrors } from "../src/lib/mapErrors";
import { parseWorkload } from "../src/lib/parseWorkload";
import type { ValidationError } from "../src/models/types";
import type { ProcessRow } from "../src/models/workload";

const row = (key: number, id: string, arrival: string, burst: string, priority = "1"): ProcessRow => ({
  key,
  id,
  arrival,
  burst,
  priority,
});

describe("parseWorkload", () => {
  test("builds ProcessInput values in row order", () => {
    const outcome = parseWorkload([row(7, "P1", "0", "8", "2"), row(9, " P2 ", "1", "4", "-1")]);
    expect(outcome).toEqual({
      ok: true,
      processes: [
        { id: "P1", arrival: 0, burst: 8, priority: 2 },
        { id: " P2 ", arrival: 1, burst: 4, priority: -1 },
      ],
    });
  });

  test("passes the id through untouched: ID rules belong to the core", () => {
    const outcome = parseWorkload([row(1, "", "0", "1"), row(2, "IDLE", "0", "1"), row(3, "IDLE", "0", "1")]);
    expect(outcome.ok).toBe(true);
  });

  test("reports every bad field with the row key and field, not just the first", () => {
    const outcome = parseWorkload([row(4, "P1", "-1", "8"), row(5, "P2", "0", ""), row(6, "P3", "0", "1", "x")]);
    if (outcome.ok) throw new Error("expected issues");
    expect(outcome.issues.map(({ rowKey, field }) => ({ rowKey, field }))).toEqual([
      { rowKey: 4, field: "arrival" },
      { rowKey: 5, field: "burst" },
      { rowKey: 6, field: "priority" },
    ]);
    expect(outcome.issues[0]?.message).toMatch(/arrival/i);
  });

  test("an empty table parses to an empty list so the core can reject it", () => {
    expect(parseWorkload([])).toEqual({ ok: true, processes: [] });
  });
});

describe("mapCoreErrors", () => {
  const rows = [row(10, "P1", "0", "1"), row(11, "P1", "0", "1")];

  test("maps processIndex and field to the row key and input", () => {
    const errors: ValidationError[] = [{ processIndex: 1, field: "id", message: 'duplicate id "P1"' }];
    expect(mapCoreErrors(errors, rows)).toEqual({
      fieldIssues: [{ rowKey: 11, field: "id", message: 'duplicate id "P1"' }],
      wholeInput: [],
    });
  });

  test("a whole-input error stays out of the fields", () => {
    const errors: ValidationError[] = [{ processIndex: null, field: "processes", message: "at least 1 process is required" }];
    expect(mapCoreErrors(errors, [])).toEqual({
      fieldIssues: [],
      wholeInput: ["at least 1 process is required"],
    });
  });

  test("an error that cannot be placed on an input is kept as a whole-input message", () => {
    const errors: ValidationError[] = [
      { processIndex: 9, field: "id", message: "stale index" },
      { processIndex: 0, field: "processes", message: "odd" },
      { processIndex: 0, field: "algorithm", message: "odd too" },
    ];
    const mapped = mapCoreErrors(errors, rows);
    expect(mapped.fieldIssues).toEqual([]);
    expect(mapped.wholeInput).toEqual(["stale index", "odd", "odd too"]);
  });

  test("keeps the core's wording and every error", () => {
    const errors: ValidationError[] = [
      { processIndex: 0, field: "id", message: "id must not be empty or whitespace-only" },
      { processIndex: 0, field: "burst", message: "burst must be > 0, got 0" },
    ];
    expect(mapCoreErrors(errors, rows).fieldIssues.map((i) => i.message)).toEqual([
      "id must not be empty or whitespace-only",
      "burst must be > 0, got 0",
    ]);
  });
});
