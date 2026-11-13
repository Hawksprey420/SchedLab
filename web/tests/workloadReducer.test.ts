// The workload state: rows, one level of undo for removals, which fields the user has touched.
import { describe, expect, test } from "vitest";
import { initialWorkload, nextFreeId, workloadReducer, type WorkloadState } from "../src/state/workloadReducer";
import type { ProcessRow } from "../src/models/workload";

const t1 = [
  { id: "P1", arrival: 0, burst: 8, priority: 2 },
  { id: "P2", arrival: 0, burst: 4, priority: 1 },
  { id: "P3", arrival: 0, burst: 2, priority: 3 },
];

function loaded(): WorkloadState {
  return workloadReducer(initialWorkload(), { type: "load", processes: t1 });
}

const ids = (state: WorkloadState) => state.rows.map((r) => r.id);

describe("load", () => {
  test("turns processes into text rows with distinct stable keys", () => {
    const state = loaded();
    expect(state.rows.map(({ id, arrival, burst, priority }) => ({ id, arrival, burst, priority }))).toEqual([
      { id: "P1", arrival: "0", burst: "8", priority: "2" },
      { id: "P2", arrival: "0", burst: "4", priority: "1" },
      { id: "P3", arrival: "0", burst: "2", priority: "3" },
    ]);
    expect(new Set(state.rows.map((r) => r.key)).size).toBe(3);
  });

  test("clears undo, touched fields and the attempt flag, and bumps the version", () => {
    let state = loaded();
    state = workloadReducer(state, { type: "remove", rowKey: state.rows[0]?.key ?? -1 });
    state = workloadReducer(state, { type: "attempt" });
    const next = workloadReducer(state, { type: "load", processes: t1 });
    expect(next.undo).toBeNull();
    expect(next.attempted).toBe(false);
    expect(next.touched).toEqual({});
    expect(next.version).toBeGreaterThan(state.version);
  });
});

describe("edit", () => {
  test("changes one field of one row and bumps the version", () => {
    const state = loaded();
    const key = state.rows[1]?.key ?? -1;
    const next = workloadReducer(state, { type: "edit", rowKey: key, field: "burst", value: "9" });
    expect(next.rows[1]?.burst).toBe("9");
    expect(next.rows[0]).toBe(state.rows[0]);
    expect(next.version).toBeGreaterThan(state.version);
  });

  test("editing a key that no longer exists changes nothing", () => {
    const state = loaded();
    expect(workloadReducer(state, { type: "edit", rowKey: 9999, field: "id", value: "x" })).toBe(state);
  });
});

describe("addRow and nextFreeId", () => {
  test("a new row gets the next free P<n> and empty numeric fields", () => {
    const next = workloadReducer(loaded(), { type: "add" });
    expect(next.rows).toHaveLength(4);
    expect(next.rows[3]).toMatchObject({ id: "P4", arrival: "", burst: "", priority: "" });
  });

  test("skips ids the user already typed", () => {
    const rows: ProcessRow[] = [
      { key: 1, id: "P2", arrival: "", burst: "", priority: "" },
      { key: 2, id: "p3", arrival: "", burst: "", priority: "" },
    ];
    expect(nextFreeId(rows)).toBe("P4");
  });

  test("ids are compared without surrounding spaces", () => {
    const rows: ProcessRow[] = [{ key: 1, id: " P2 ", arrival: "", burst: "", priority: "" }];
    expect(nextFreeId(rows)).toBe("P3");
    expect(nextFreeId([])).toBe("P1");
  });
});

describe("remove and undo", () => {
  test("removing a row records it so it can be restored in place", () => {
    const state = loaded();
    const removed = workloadReducer(state, { type: "remove", rowKey: state.rows[1]?.key ?? -1 });
    expect(ids(removed)).toEqual(["P1", "P3"]);
    expect(removed.undo?.removed.map((r) => r.row.id)).toEqual(["P2"]);
    const restored = workloadReducer(removed, { type: "undo" });
    expect(ids(restored)).toEqual(["P1", "P2", "P3"]);
    expect(restored.rows[1]).toBe(state.rows[1]);
    expect(restored.undo).toBeNull();
  });

  test("lowering the count removes rows from the end and is undoable in one step", () => {
    const state = loaded();
    const shrunk = workloadReducer(state, { type: "setCount", count: 1 });
    expect(ids(shrunk)).toEqual(["P1"]);
    expect(workloadReducer(shrunk, { type: "undo" }).rows).toEqual(state.rows);
  });

  test("raising the count adds rows with free ids at the end", () => {
    const grown = workloadReducer(loaded(), { type: "setCount", count: 5 });
    expect(ids(grown)).toEqual(["P1", "P2", "P3", "P4", "P5"]);
    expect(grown.undo).toBeNull();
  });

  test("setting the same count changes nothing", () => {
    const state = loaded();
    expect(workloadReducer(state, { type: "setCount", count: 3 })).toBe(state);
  });

  test("a second removal replaces the single undo level", () => {
    let state = loaded();
    state = workloadReducer(state, { type: "remove", rowKey: state.rows[0]?.key ?? -1 });
    state = workloadReducer(state, { type: "remove", rowKey: state.rows[0]?.key ?? -1 });
    expect(state.undo?.removed.map((r) => r.row.id)).toEqual(["P2"]);
  });

  test("undo survives edits to other rows and restores the removed row only", () => {
    let state = loaded();
    state = workloadReducer(state, { type: "remove", rowKey: state.rows[0]?.key ?? -1 });
    state = workloadReducer(state, { type: "edit", rowKey: state.rows[0]?.key ?? -1, field: "burst", value: "99" });
    const restored = workloadReducer(state, { type: "undo" });
    expect(ids(restored)).toEqual(["P1", "P2", "P3"]);
    expect(restored.rows[1]?.burst).toBe("99");
  });

  test("undo with nothing to undo is a no-op", () => {
    const state = loaded();
    expect(workloadReducer(state, { type: "undo" })).toBe(state);
  });

  test("removing the last row leaves an empty table the core can reject", () => {
    let state = workloadReducer(initialWorkload(), { type: "load", processes: [t1[0]!] });
    state = workloadReducer(state, { type: "remove", rowKey: state.rows[0]?.key ?? -1 });
    expect(state.rows).toEqual([]);
  });

  test("a removal bumps the version so a shown result is invalidated", () => {
    const state = loaded();
    expect(workloadReducer(state, { type: "remove", rowKey: state.rows[0]?.key ?? -1 }).version).toBeGreaterThan(
      state.version,
    );
  });

  test("count growth is capped so a typo cannot build a million rows", () => {
    const grown = workloadReducer(loaded(), { type: "setCount", count: 1_000_000 });
    expect(grown.rows.length).toBeLessThanOrEqual(200);
  });
});

describe("touch and attempt", () => {
  test("touching a field records it without changing the version", () => {
    const state = loaded();
    const next = workloadReducer(state, { type: "touch", rowKey: state.rows[0]?.key ?? -1, field: "arrival" });
    expect(Object.keys(next.touched)).toHaveLength(1);
    expect(next.version).toBe(state.version);
  });

  test("attempting a run marks every field as shown", () => {
    expect(workloadReducer(loaded(), { type: "attempt" }).attempted).toBe(true);
  });
});
