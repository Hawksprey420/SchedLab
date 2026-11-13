// Decides what text, if any, fits inside a Gantt bar. Estimated from the monospace advance so
// no layout is read during render; the schedule list below the figure always carries the PID.
import { AXIS_CHAR_WIDTH } from "./ticks";

const SIDE_PADDING = 6;
/** Shortest stem worth printing before the ellipsis. */
const MIN_STEM = 2;

export function fitLabel(text: string, barWidth: number): string | null {
  const room = Math.floor((barWidth - 2 * SIDE_PADDING) / AXIS_CHAR_WIDTH);
  const chars = Array.from(text);
  if (chars.length <= room) return chars.length > 0 ? text : null;
  // Leave one character of room for the ellipsis.
  const stem = room - 1;
  return stem >= MIN_STEM ? `${chars.slice(0, stem).join("")}…` : null;
}
