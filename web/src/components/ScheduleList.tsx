import { segmentListText } from "../lib/segmentText";
import type { Segment } from "../models/types";

/** The figure as text: its accessible alternative, and a readable fallback when labels are dropped. */
export function ScheduleList({ segments, showCore = false }: { segments: readonly Segment[]; showCore?: boolean }) {
  return (
    <div className="mt-5">
      <h3 id="schedule-text-heading" className="font-serif text-base font-semibold">
        The same schedule as text
      </h3>
      <ol aria-labelledby="schedule-text-heading" className="mt-1 columns-[18rem] gap-6 font-mono text-sm">
        {segments.map((segment, index) => (
          <li key={index} className="break-inside-avoid py-0.5 [overflow-wrap:anywhere]">
            {showCore && `${segment.coreId}: `}{segmentListText(segment)}
          </li>
        ))}
      </ol>
    </div>
  );
}
