import type { ResultView } from "../state/resultView";
import { MetricsTable } from "./MetricsTable";
import { SectionHeading } from "./SectionHeading";

export function ResultsSection({ view }: { view: ResultView }) {
  return (
    <section aria-labelledby="results-heading">
      <SectionHeading number={5} id="results-heading">
        Results
      </SectionHeading>
      {view.kind === "schedule" ? (
        <MetricsTable schedule={view.schedule} />
      ) : (
        <p className="text-sm text-ink-muted">The table and the averages appear here after a run.</p>
      )}
    </section>
  );
}
