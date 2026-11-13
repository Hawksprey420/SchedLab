// What the editor holds before anything is sent to the core: the text the user typed.

/** One editable row. Numbers stay as text so "1.5" or "" can be reported, never coerced. */
export interface ProcessRow {
  /** Stable React key and element-id suffix; never reused within a session. */
  key: number;
  id: string;
  arrival: string;
  burst: string;
  priority: string;
}

export type FieldName = "id" | "arrival" | "burst" | "priority";

/** A problem attached to one input of one row. */
export interface FieldIssue {
  rowKey: number;
  field: FieldName;
  message: string;
}

/** Element id of the input for a row field; also the target of focus requests and links. */
export function fieldElementId(rowKey: number, field: FieldName): string {
  return `field-${rowKey}-${field}`;
}

/** Key for maps and sets of per-field state. */
export function fieldKey(rowKey: number, field: FieldName): string {
  return `${rowKey}:${field}`;
}

/** Id of the element holding the visible error for a field; referenced by aria-describedby only while shown. */
export function fieldErrorId(rowKey: number, field: FieldName): string {
  return `error-${rowKey}-${field}`;
}

/** A row taken out of the table, remembered with its position so undo puts it back in place. */
export interface RemovedRow {
  index: number;
  row: ProcessRow;
}