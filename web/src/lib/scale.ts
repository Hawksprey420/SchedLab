// Time to pixel mapping for the Gantt chart. Pure geometry; nothing here reads the DOM.

export const MIN_CHART_WIDTH = 640;
export const MAX_CHART_WIDTH = 3_200;
/** Wide enough that a short schedule has bars worth reading, small enough to cap the maximum. */
const TARGET_PX_PER_TICK = 48;
/** A bar thinner than this would vanish; it is widened to stay visible and focusable. */
export const MIN_BAR_WIDTH = 2;

/** SVG width: grows with the makespan until the cap, then ticks get proportionally thinner. */
export function chartWidth(makespan: number): number {
  return Math.min(MAX_CHART_WIDTH, Math.max(MIN_CHART_WIDTH, makespan * TARGET_PX_PER_TICK));
}

export interface BarRect {
  x: number;
  width: number;
}

export interface TimeScale {
  x(time: number): number;
  bar(begin: number, end: number): BarRect;
}

export function createScale({ makespan, width, padding }: { makespan: number; width: number; padding: number }): TimeScale {
  const plotWidth = width - 2 * padding;
  const x = (time: number) => padding + (time / makespan) * plotWidth;
  const plotEnd = padding + plotWidth;

  return {
    x,
    bar(begin, end) {
      const exact = x(end) - x(begin);
      if (exact >= MIN_BAR_WIDTH) return { x: x(begin), width: exact };
      // Keep the widened bar inside the plot so the last segment is not pushed off the axis.
      return { x: Math.min(x(begin), plotEnd - MIN_BAR_WIDTH), width: MIN_BAR_WIDTH };
    },
  };
}
