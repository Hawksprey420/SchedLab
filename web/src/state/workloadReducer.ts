// The editor's workload: rows of text, one level of undo for removals, and which fields the
// user has already left (so errors appear after interaction, not while typing).
import type { ProcessInput } from "../models/types";
import { fieldKey, type FieldName, type ProcessRow } from "../models/workload";
import { MAX_EDITOR_ROWS } from "../lib/parseField";

export interface RemovedRow {
  index: number;
  row: ProcessRow;
}

export interface WorkloadState {
  rows: ProcessRow[];
  nextKey: number;
  /**
   * Bumped by every change to the rows. A result is valid only for the version it was computed
   * from, so a stale figure is never shown (derived, not synchronised by an effect).
   */
  version: number;
  /** The most recent removal, restorable once. Null when there is nothing to undo. */
  undo: { removed: RemovedRow[] } | null;
  touched: Record<string, true>;
  /** Set when Run is pressed with problems: every field's error is then shown. */
  attempted: boolean;
}

export type WorkloadAction =
  | { type: "load"; processes: readonly ProcessInput[] }
  | { type: "edit"; rowKey: number; field: FieldName; value: string }
  | { type: "add" }
  | { type: "remove"; rowKey: number }
  | { type: "setCount"; count: number }
  | { type: "undo" }
  | { type: "touch"; rowKey: number; field: FieldName }
  | { type: "attempt" };

export function initialWorkload(): WorkloadState {
  return { rows: [], nextKey: 1, version: 0, undo: null, touched: {}, attempted: false };
}

/** Lowest P<n> not already used, starting after the current row count. Compared without case or padding. */
export function nextFreeId(rows: readonly ProcessRow[]): string {
  const taken = new Set(rows.map((row) => row.id.trim().toLowerCase()));
  for (let n = rows.length + 1; ; n += 1) {
    if (!taken.has(`p${n}`)) return `P${n}`;
  }
}

function blankRows(existing: readonly ProcessRow[], count: number, firstKey: number): ProcessRow[] {
  const rows = [...existing];
  const added: ProcessRow[] = [];
  for (let i = 0; i < count; i += 1) {
    const row: ProcessRow = { key: firstKey + i, id: nextFreeId(rows), arrival: "", burst: "", priority: "" };
    rows.push(row);
    added.push(row);
  }
  return added;
}

function changed(state: WorkloadState, patch: Partial<WorkloadState>): WorkloadState {
  return { ...state, ...patch, version: state.version + 1 };
}

function removeRows(state: WorkloadState, keys: ReadonlySet<number>): WorkloadState {
  const removed: RemovedRow[] = [];
  const rows: ProcessRow[] = [];
  state.rows.forEach((row, index) => {
    if (keys.has(row.key)) removed.push({ index, row });
    else rows.push(row);
  });
  if (removed.length === 0) return state;
  return changed(state, { rows, undo: { removed } });
}

export function workloadReducer(state: WorkloadState, action: WorkloadAction): WorkloadState {
  switch (action.type) {
    case "load": {
      const rows = action.processes.map((p, i) => ({
        key: state.nextKey + i,
        id: p.id,
        arrival: String(p.arrival),
        burst: String(p.burst),
        priority: String(p.priority),
      }));
      return changed(state, {
        rows,
        nextKey: state.nextKey + rows.length,
        undo: null,
        touched: {},
        attempted: false,
      });
    }
    case "edit": {
      if (!state.rows.some((row) => row.key === action.rowKey)) return state;
      const rows = state.rows.map((row) => (row.key === action.rowKey ? { ...row, [action.field]: action.value } : row));
      return changed(state, { rows });
    }
    case "add": {
      if (state.rows.length >= MAX_EDITOR_ROWS) return state;
      const added = blankRows(state.rows, 1, state.nextKey);
      return changed(state, { rows: [...state.rows, ...added], nextKey: state.nextKey + added.length });
    }
    case "remove":
      return removeRows(state, new Set([action.rowKey]));
    case "setCount": {
      const target = Math.min(Math.max(action.count, 0), MAX_EDITOR_ROWS);
      if (target === state.rows.length) return state;
      if (target > state.rows.length) {
        const added = blankRows(state.rows, target - state.rows.length, state.nextKey);
        return changed(state, { rows: [...state.rows, ...added], nextKey: state.nextKey + added.length });
      }
      return removeRows(state, new Set(state.rows.slice(target).map((row) => row.key)));
    }
    case "undo": {
      if (!state.undo) return state;
      const rows = [...state.rows];
      // Ascending order puts each row back at its original index even when several went at once.
      for (const { index, row } of state.undo.removed) rows.splice(Math.min(index, rows.length), 0, row);
      return changed(state, { rows, undo: null });
    }
    case "touch": {
      const key = fieldKey(action.rowKey, action.field);
      return state.touched[key] ? state : { ...state, touched: { ...state.touched, [key]: true } };
    }
    case "attempt":
      return state.attempted ? state : { ...state, attempted: true };
  }
}
