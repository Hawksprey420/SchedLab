// Editor rows to the core's input. Only the numeric fields are checked here; the id is passed
// through exactly as typed because the core owns the ID rules.
import type { ProcessInput } from "../models/types";
import type { FieldIssue, ProcessRow } from "../models/workload";
import { parseNumericField, type NumericField } from "./parseField";

export type WorkloadParse = { ok: true; processes: ProcessInput[] } | { ok: false; issues: FieldIssue[] };

const NUMERIC_FIELDS: NumericField[] = ["arrival", "burst", "priority"];

export function parseWorkload(rows: readonly ProcessRow[]): WorkloadParse {
  const issues: FieldIssue[] = [];
  const processes: ProcessInput[] = [];

  for (const row of rows) {
    const numbers: Partial<Record<NumericField, number>> = {};
    for (const field of NUMERIC_FIELDS) {
      const parsed = parseNumericField(field, row[field]);
      if (parsed.ok) numbers[field] = parsed.value;
      else issues.push({ rowKey: row.key, field, message: parsed.message });
    }
    const { arrival, burst, priority } = numbers;
    if (arrival !== undefined && burst !== undefined && priority !== undefined) {
      processes.push({ id: row.id, arrival, burst, priority });
    }
  }

  return issues.length > 0 ? { ok: false, issues } : { ok: true, processes };
}

/** Numeric problems of a single row, for showing a message as soon as that field is left. */
export function parseRowField(row: ProcessRow, field: NumericField): string | null {
  const parsed = parseNumericField(field, row[field]);
  return parsed.ok ? null : parsed.message;
}
