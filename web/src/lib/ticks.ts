// Axis tick values for the Gantt chart: 1-2-5 "nice" steps and a count bounded by the axis
// width, so a schedule of 100,000,000 ticks costs no more than one of 14.
import { formatTicks } from "./format";

/** Width of one character of the 12 px axis font (IBM Plex Mono advance is 0.6 em). */
export const AXIS_CHAR_WIDTH = 7.2;
const LABEL_PADDING = 16;

/** Smallest step of the form 1, 2 or 5 times a power of ten that fits `maxTicks` ticks. */
export function niceStep(max: number, maxTicks: number): number {
  for (let magnitude = 1; ; magnitude *= 10) {
    for (const mantissa of [1, 2, 5]) {
      const step = mantissa * magnitude;
      if (Math.floor(max / step) + 1 <= maxTicks) return step;
    }
  }
}

/**
 * Tick values from 0, spaced so labels of the longest value never collide on an axis
 * `width` px wide. The schedule's end is added as a last tick when it has room.
 */
export function axisTicks(max: number, width: number): number[] {
  if (!(max >= 1)) return [0];
  const gap = formatTicks(max).length * AXIS_CHAR_WIDTH + LABEL_PADDING;
  const maxTicks = Math.max(2, Math.floor(width / gap));
  const step = niceStep(max, maxTicks);

  const ticks: number[] = [];
  for (let value = 0; value <= max; value += step) ticks.push(value);

  const last = ticks[ticks.length - 1] ?? 0;
  if (last < max && ((max - last) / max) * width >= gap) ticks.push(max);
  return ticks;
}
