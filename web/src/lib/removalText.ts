import type { RemovedRow } from "../models/workload";

const NAMED_LIMIT = 3;

/** "Removed P3." or "Removed 5 rows (P4, P5, P6 and 2 more)." for the undo notice and the live region. */
export function describeRemoval(removed: readonly RemovedRow[]): string {
  const names = removed.map(({ row, index }) => row.id.trim() || `row ${index + 1}`);
  if (names.length === 1) return `Removed ${names[0]}.`;
  const shown = names.slice(0, NAMED_LIMIT).join(", ");
  const rest = names.length - NAMED_LIMIT;
  return `Removed ${names.length} rows (${shown}${rest > 0 ? ` and ${rest} more` : ""}).`;
}
