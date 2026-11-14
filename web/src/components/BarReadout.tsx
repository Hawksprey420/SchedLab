import { describeSegment } from "../lib/segmentText";
import type { Segment } from "../models/types";

/**
 * The details of the bar under the pointer, in focus or last tapped. It repeats the bar's
 * accessible name, so screen readers skip it. A fixed line (rather than a floating tooltip)
 * cannot be clipped by the scroll frame or hidden under a finger, and it reserves its height.
 */
export function BarReadout({ segment, showCore = false }: { segment: Segment | null; showCore?: boolean }) {
  return (
    <p aria-hidden="true" className="min-h-6 px-1 py-0.5 text-sm">
      {segment ? (
        <span className="font-mono">{showCore && `${segment.coreId}: `}{describeSegment(segment)}</span>
      ) : (
        <span className="text-ink-muted">Point at, focus or tap a bar for its begin, end and duration. The chart scrolls sideways when it is wider than the screen.</span>
      )}
    </p>
  );
}
