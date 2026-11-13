// Text to number for the editor's numeric fields. The UI checks only presence, base-10 integer
// syntax and the numeric limits from docs/web-contract.md; ID and count rules stay in the core.
import { formatTicks } from "./format";

export const FIELD_LIMITS = {
  arrival: { min: 0, max: 1_000_000 },
  burst: { min: 1, max: 1_000_000 },
  priority: { min: -1000, max: 1000 },
} as const;

export type NumericField = keyof typeof FIELD_LIMITS;

export type ParseResult = { ok: true; value: number } | { ok: false; message: string };

/**
 * The editor never builds more rows than this. It is a guard against a typo such as 100000
 * freezing the page, not a scheduling rule: the core alone decides how many processes it
 * accepts, and it accepts fewer than this.
 */
export const MAX_EDITOR_ROWS = 200;

const LABELS: Record<NumericField, string> = { arrival: "Arrival", burst: "Burst", priority: "Priority" };
const UNITS: Record<NumericField, string> = { arrival: " ticks", burst: " ticks", priority: "" };

// Same syntax as the core's text parser (std::from_chars): an optional minus sign and ASCII
// digits. A leading plus, a fraction, an exponent and digit separators are rejected.
const INTEGER = /^-?[0-9]+$/;
const MAX_ECHOED_CHARS = 16;

/** The user's text as it appears in a message; long values are cut so layouts survive. */
function echo(text: string): string {
  const chars = Array.from(text);
  return chars.length > MAX_ECHOED_CHARS ? `${chars.slice(0, MAX_ECHOED_CHARS).join("")}…` : text;
}

function rangeText(min: number, max: number): string {
  return `${formatTicks(min)} to ${formatTicks(max)}`;
}

export function parseNumericField(field: NumericField, text: string): ParseResult {
  const { min, max } = FIELD_LIMITS[field];
  const label = LABELS[field];
  const advice = `Enter a whole number from ${rangeText(min, max)}${UNITS[field]}.`;
  const trimmed = text.trim();

  if (trimmed === "") return { ok: false, message: `${label} is empty. ${advice}` };
  if (!INTEGER.test(trimmed)) {
    return { ok: false, message: `${label} "${echo(trimmed)}" is not a whole number. ${advice}` };
  }

  const negative = trimmed.startsWith("-");
  const digits = trimmed.replace(/^-?0*/, "");
  // More than 15 significant digits cannot be held exactly by a double, and is far past every
  // limit anyway, so decide from the length instead of converting.
  const value = digits.length > 15 ? (negative ? -Infinity : Infinity) : Number(trimmed) + 0;

  if (value < min) return { ok: false, message: `${label} "${echo(trimmed)}" is below ${formatTicks(min)}. ${advice}` };
  if (value > max) return { ok: false, message: `${label} "${echo(trimmed)}" is above ${formatTicks(max)}. ${advice}` };
  return { ok: true, value };
}

/** The "Number of processes" field. Zero is allowed so the core's "no processes" error is reachable. */
export function parseCount(text: string): ParseResult {
  const advice = `Enter a whole number from 0 to ${MAX_EDITOR_ROWS}.`;
  const trimmed = text.trim();
  if (trimmed === "") return { ok: false, message: `Number of processes is empty. ${advice}` };
  if (!INTEGER.test(trimmed) || trimmed.startsWith("-")) {
    return { ok: false, message: `Number of processes "${echo(trimmed)}" is not a whole number. ${advice}` };
  }
  const digits = trimmed.replace(/^0+/, "");
  if (digits.length > 15 || Number(trimmed) > MAX_EDITOR_ROWS) {
    return {
      ok: false,
      message: `Number of processes "${echo(trimmed)}" is too large for this table, which holds at most ${MAX_EDITOR_ROWS} rows. ${advice}`,
    };
  }
  return { ok: true, value: Number(trimmed) };
}
