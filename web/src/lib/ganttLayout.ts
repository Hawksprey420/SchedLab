// Vertical layout of the Gantt chart, in SVG user units (1 unit is 1 CSS px at natural size).

/** Space left and right of the plot, so the first and last tick labels are not clipped. */
export const PLOT_PADDING = 40;
export const LANE_TOP = 14;
export const BAR_HEIGHT = 56;
export const AXIS_Y = LANE_TOP + BAR_HEIGHT + 10;
export const TICK_LENGTH = 6;
export const TICK_LABEL_Y = AXIS_Y + TICK_LENGTH + 14;
export const AXIS_TITLE_Y = TICK_LABEL_Y + 20;
export const CHART_HEIGHT = AXIS_TITLE_Y + 8;
