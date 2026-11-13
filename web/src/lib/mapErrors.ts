// Places the core's validation errors on the editor: a row's input when the core names one,
// the whole-input list otherwise. The core's wording is kept; the UI adds no rules of its own.
import type { ValidationError } from "../models/types";
import type { FieldIssue, FieldName, ProcessRow } from "../models/workload";

export interface MappedCoreErrors {
  fieldIssues: FieldIssue[];
  /** Messages that belong to no single input, such as "at most 100 processes". */
  wholeInput: string[];
}

const ROW_FIELDS: readonly string[] = ["id", "arrival", "burst", "priority"];

function isRowField(field: string): field is FieldName {
  return ROW_FIELDS.includes(field);
}

export function mapCoreErrors(errors: readonly ValidationError[], rows: readonly ProcessRow[]): MappedCoreErrors {
  const fieldIssues: FieldIssue[] = [];
  const wholeInput: string[] = [];

  for (const error of errors) {
    const row = error.processIndex === null ? undefined : rows[error.processIndex];
    if (row && isRowField(error.field)) fieldIssues.push({ rowKey: row.key, field: error.field, message: error.message });
    else wholeInput.push(error.message);
  }
  return { fieldIssues, wholeInput };
}
