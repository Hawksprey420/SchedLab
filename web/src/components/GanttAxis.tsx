import { AXIS_TITLE_Y, AXIS_Y, TICK_LABEL_Y, TICK_LENGTH } from "../lib/ganttLayout";
import { formatTicks } from "../lib/format";
import type { TimeScale } from "../lib/scale";

interface GanttAxisProps {
  scale: TimeScale;
  /** Tick values from axisTicks: a bounded count however long the schedule is. */
  ticks: readonly number[];
  startX: number;
  endX: number;
}

/** The ruled time axis: the identity motif of the figure. Never draws more than `ticks.length` marks. */
export function GanttAxis({ scale, ticks, startX, endX }: GanttAxisProps) {
  return (
    <g aria-hidden="true">
      <line x1={startX} x2={endX} y1={AXIS_Y} y2={AXIS_Y} style={{ stroke: "var(--ink)", strokeWidth: 1.5 }} />
      {ticks.map((tick) => {
        const x = scale.x(tick);
        return (
          <g key={tick}>
            <line x1={x} x2={x} y1={AXIS_Y} y2={AXIS_Y + TICK_LENGTH} style={{ stroke: "var(--ink)", strokeWidth: 1.5 }} />
            <text className="gantt-text" x={x} y={TICK_LABEL_Y} textAnchor="middle" style={{ fill: "var(--ink-muted)" }}>
              {formatTicks(tick)}
            </text>
          </g>
        );
      })}
      <text className="gantt-text" x={(startX + endX) / 2} y={AXIS_TITLE_Y} textAnchor="middle" style={{ fill: "var(--ink-muted)" }}>
        Time (ticks)
      </text>
    </g>
  );
}
