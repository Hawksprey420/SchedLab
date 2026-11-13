import { BAR_HEIGHT, LANE_TOP } from "../lib/ganttLayout";
import { labelColor, type ProcessStyle } from "../lib/processStyle";
import type { BarRect } from "../lib/scale";
import { describeSegment } from "../lib/segmentText";
import type { Segment } from "../models/types";
import { patternUrl } from "./GanttDefs";

interface GanttBarProps {
  index: number;
  segment: Segment;
  rect: BarRect;
  /** Null for idle time, which is drawn as a dashed outline with no fill. */
  style: ProcessStyle | null;
  patternPrefix: string;
  /** Text that fits inside the bar, or null when the bar is too narrow for any. */
  label: string | null;
  active: boolean;
  /** Roving tabindex: only one bar is a Tab stop, the arrow keys move between bars. */
  tabbable: boolean;
  onEnter: (index: number) => void;
  onLeave: (index: number) => void;
  onFocus: (index: number) => void;
  onBlur: (index: number) => void;
  onSelect: (index: number) => void;
}

export function GanttBar({
  index,
  segment,
  rect,
  style,
  patternPrefix,
  label,
  active,
  tabbable,
  onEnter,
  onLeave,
  onFocus,
  onBlur,
  onSelect,
}: GanttBarProps) {
  return (
    <g
      className="gantt-bar"
      data-bar={index}
      data-idle={style === null}
      data-active={active}
      role="img"
      aria-label={describeSegment(segment)}
      tabIndex={tabbable ? 0 : -1}
      onPointerEnter={() => onEnter(index)}
      onPointerLeave={() => onLeave(index)}
      onFocus={() => onFocus(index)}
      onBlur={() => onBlur(index)}
      onClick={() => onSelect(index)}
    >
      <rect
        className="bar-shape"
        x={rect.x}
        y={LANE_TOP}
        width={rect.width}
        height={BAR_HEIGHT}
        style={{ fill: style === null ? "none" : patternUrl(patternPrefix, style) }}
      />
      {label !== null && (
        <text
          className="gantt-text bar-label"
          x={rect.x + rect.width / 2}
          y={LANE_TOP + BAR_HEIGHT / 2 + 4}
          textAnchor="middle"
          style={
            style === null
              ? { fill: "var(--ink-muted)", stroke: "var(--surface)" }
              : { fill: labelColor(style.labelTone), stroke: style.fill }
          }
        >
          {label}
        </text>
      )}
    </g>
  );
}
