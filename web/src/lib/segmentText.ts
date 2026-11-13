// Plain-text wording of a schedule segment. One place, so the bar's accessible name, the
// readout and the list below the figure always say the same thing.
import type { Segment } from "../models/types";
import { formatTicks } from "./format";

export function segmentName(segment: Segment): string {
  return segment.idle ? "idle" : segment.processId;
}

/** "P2: begin 8, end 12, duration 4 ticks" */
export function describeSegment(segment: Segment): string {
  const duration = segment.end - segment.begin;
  const unit = duration === 1 ? "tick" : "ticks";
  const name = segment.idle ? "Idle" : segment.processId;
  return `${name}: begin ${formatTicks(segment.begin)}, end ${formatTicks(segment.end)}, duration ${formatTicks(duration)} ${unit}`;
}

/** "0 to 8: P1", the line shown in the text version of the figure. */
export function segmentListText(segment: Segment): string {
  return `${formatTicks(segment.begin)} to ${formatTicks(segment.end)}: ${segmentName(segment)}`;
}
