import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { ALGORITHM_NAME } from "../lib/algorithmNames";
import { fitLabel } from "../lib/barLabel";
import { CHART_HEIGHT, PLOT_PADDING } from "../lib/ganttLayout";
import { processStyle } from "../lib/processStyle";
import { chartWidth, createScale } from "../lib/scale";
import { segmentName } from "../lib/segmentText";
import { axisTicks } from "../lib/ticks";
import type { Algorithm, Schedule } from "../models/types";
import { isHybridSchedule } from "../lib/hybridView";
import { BarReadout } from "./BarReadout";
import { GanttAxis } from "./GanttAxis";
import { GanttBar } from "./GanttBar";
import { GanttDefs } from "./GanttDefs";
import { ScheduleList } from "./ScheduleList";

interface GanttChartProps {
  schedule: Schedule;
  algorithm: Algorithm;
}

/**
 * Figure 1. Bars are placed from the core's [begin, end) intervals; nothing here decides what
 * runs when. The frame scrolls sideways on narrow screens, the page does not.
 */
export function GanttChart({ schedule, algorithm }: GanttChartProps) {
  const hybrid = isHybridSchedule(schedule) ? schedule : null;
  const laneHeight = 78;
  const extraHeight = hybrid ? (hybrid.lanes.length - 1) * laneHeight : 0;
  const padding = hybrid ? 90 : PLOT_PADDING;
  const idPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [tabStop, setTabStop] = useState(0);
  // Escape hides the readout without moving the pointer or focus (WCAG 1.4.13, dismissible).
  const [dismissed, setDismissed] = useState(false);

  const { width, ticks, scale, bars, styles } = useMemo(() => {
    const width = chartWidth(schedule.makespan);
    const scale = createScale({ makespan: schedule.makespan, width, padding });
    // A process keeps its colour and pattern by input position, in every algorithm.
    const position = new Map(schedule.results.map((result, index) => [result.id, index]));
    const bars = schedule.segments.map((segment) => {
      const rect = scale.bar(segment.begin, segment.end);
      const style = segment.idle ? null : processStyle(position.get(segment.processId) ?? 0);
      return { segment, rect, style, label: fitLabel(segmentName(segment), rect.width) };
    });
    return {
      width,
      scale,
      ticks: axisTicks(schedule.makespan, width - 2 * padding),
      bars,
      styles: bars.flatMap((bar) => (bar.style ? [bar.style] : [])),
    };
  }, [schedule, padding]);

  const shown = dismissed ? null : (hovered ?? focused);
  const activeIndex = hovered ?? focused;

  function reveal(update: () => void) {
    setDismissed(false);
    update();
  }

  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key === "Escape") {
      setDismissed(true);
      return;
    }
    const current = Number((event.target as Element).closest("[data-bar]")?.getAttribute("data-bar"));
    if (Number.isNaN(current)) return;
    const last = bars.length - 1;
    const target =
      event.key === "ArrowRight" ? Math.min(current + 1, last)
      : event.key === "ArrowLeft" ? Math.max(current - 1, 0)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (target === null) return;
    event.preventDefault();
    setTabStop(target);
    event.currentTarget.querySelector<SVGGElement>(`[data-bar="${target}"]`)?.focus();
  }

  return (
    <figure className="m-0">
      <div
        role="region"
        tabIndex={0}
        aria-label="Gantt chart. Scrolls sideways when it is wider than the screen."
        className="overflow-x-auto border-y border-ink bg-surface"
      >
        <svg
          role="group"
          aria-label={`Gantt chart with ${bars.length} segments. The same schedule is listed as text below the figure. Use the arrow keys to move between bars.`}
          viewBox={`0 0 ${width} ${CHART_HEIGHT + extraHeight}`}
          // The minimum width is the natural size: a narrow screen scrolls the frame instead of squeezing bars.
          style={{ minWidth: width, width: "100%", height: "auto", display: "block" }}
          onKeyDown={onKeyDown}
          onClick={(event) => {
            if (event.target === event.currentTarget) setFocused(null);
          }}
        >
          <GanttDefs styles={styles} idPrefix={idPrefix} />
          <g transform={hybrid ? `translate(0 ${extraHeight})` : undefined}>
            <GanttAxis scale={scale} ticks={ticks} startX={scale.x(0)} endX={scale.x(schedule.makespan)} />
          </g>
          {hybrid?.lanes.map((lane, index) => <text key={lane.coreId} data-lane={lane.coreId} className="gantt-text" x={8} y={index * laneHeight + 46} style={{ fill: "var(--ink)" }}>{lane.coreId}</text>)}
          {bars.map(({ segment, rect, style, label }, index) => (
            <g key={index} role={hybrid ? "group" : undefined} aria-label={hybrid ? `Lane ${segment.coreId}` : undefined} transform={hybrid ? `translate(0 ${hybrid.lanes.findIndex(lane => lane.coreId === segment.coreId) * laneHeight})` : undefined}>
            <GanttBar
              key={index}
              index={index}
              segment={segment}
              rect={rect}
              style={style}
              patternPrefix={idPrefix}
              label={label}
              active={activeIndex === index}
              tabbable={Math.min(tabStop, bars.length - 1) === index}
              onEnter={(i) => reveal(() => setHovered(i))}
              onLeave={() => setHovered(null)}
              onFocus={(i) => reveal(() => { setFocused(i); setTabStop(i); })}
              onBlur={() => setFocused(null)}
              onSelect={(i) => reveal(() => setFocused(i))}
            />
            </g>
          ))}
        </svg>
      </div>
      <BarReadout segment={shown === null ? null : (bars[shown]?.segment ?? null)} showCore={hybrid !== null} />
      <figcaption className="mt-1 font-serif text-sm">
        <span className="font-semibold">Figure 1.</span> {ALGORITHM_NAME[algorithm]} {hybrid ? `schedule, ${hybrid.profile}, ${hybrid.heuristic}.` : "schedule on one core."} Time in ticks.
      </figcaption>
      <ScheduleList segments={schedule.segments} showCore={hybrid !== null} />
    </figure>
  );
}
