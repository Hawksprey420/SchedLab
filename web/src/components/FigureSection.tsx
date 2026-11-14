import type { ResultView } from "../state/resultView";
import { GanttChart } from "./GanttChart";
import { SectionHeading } from "./SectionHeading";
import { isHybridSchedule } from "../lib/hybridView";

const MESSAGES: Record<Exclude<ResultView["kind"], "schedule">, string> = {
  none: "No result yet. Choose an algorithm and press Run simulation to draw the schedule and fill the results table.",
  stale: "The workload changed after the last run, so the old result was cleared. Press Run simulation to compute it again.",
  rejected: "The simulator rejected this workload, so there is no schedule to draw. Fix the problems listed under Workload and run again.",
};

export function FigureSection({ view, resultKey }: { view: ResultView; resultKey: string }) {
  return (
    <section id="figure" aria-labelledby="figure-heading" className="scroll-mt-4">
      <SectionHeading number={4} id="figure-heading">
        Gantt chart
      </SectionHeading>
      {view.kind === "schedule" ? (
        <>
          {isHybridSchedule(view.schedule) && <p className="mb-2 font-semibold text-accent">Experimental / simplified model</p>}
          <GanttChart key={resultKey} schedule={view.schedule} algorithm={view.algorithm} />
        </>
      ) : (
        <p className="border border-dashed border-ink-muted bg-surface px-4 py-10 text-ink-muted">{MESSAGES[view.kind]}</p>
      )}
    </section>
  );
}
