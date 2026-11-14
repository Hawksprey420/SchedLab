import { formatAverage, formatTicks } from "../lib/format";
import type { Schedule } from "../models/types";
import { isHybridSchedule } from "../lib/hybridView";

interface MetricsTableProps {
  schedule: Schedule;
}

const COLUMNS = ["Arrival", "Burst", "Priority", "Start", "Completion", "Waiting", "Turnaround", "Response"] as const;

/** Table 1 and the averages, exactly as the core returned them; the only change is rounding for display. */
export function MetricsTable({ schedule }: MetricsTableProps) {
  const hybrid = isHybridSchedule(schedule);
  return (
    <div>
      {/* Outside the scrolling frame, so a narrow screen never clips the caption. */}
      <p id="results-caption" className="mb-2 font-serif text-sm">
        <span className="font-semibold">Table 1.</span> Results by process, in input order. {hybrid ? "Arrival and results in ticks; demand in work units." : "Times in ticks."}
      </p>
      {/* tabIndex makes the scrolling frame reachable by keyboard; the region name says what it holds. */}
      <div
        role="region"
        tabIndex={0}
        aria-labelledby="results-caption"
        className="max-h-[70vh] max-w-full overflow-auto border-b border-ink"
      >
        <table className="data-table text-sm" aria-labelledby="results-caption">
          <thead>
            <tr>
              <th scope="col">PID</th>
              {COLUMNS.map((name) => (
                <th key={name} scope="col">
                  {hybrid && name === "Burst" ? "Work" : name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.results.map((result) => (
              <tr key={result.id}>
                <th scope="row">{result.id}</th>
                <td>{formatTicks(result.arrival)}</td>
                <td>{formatTicks(result.burst)}</td>
                <td className="text-ink-muted">{formatTicks(result.priority)}</td>
                <td>{formatTicks(result.start)}</td>
                <td>{formatTicks(result.completion)}</td>
                <td>{formatTicks(result.waiting)}</td>
                <td>{formatTicks(result.turnaround)}</td>
                <td>{formatTicks(result.response)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-3">
        <Statistic label="Average waiting time" value={`${formatAverage(schedule.averageWaiting)} ticks`} />
        <Statistic label="Average turnaround time" value={`${formatAverage(schedule.averageTurnaround)} ticks`} />
        <Statistic label="Makespan" value={`${formatTicks(schedule.makespan)} ticks`} />
      </dl>
    </div>
  );
}

function Statistic({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-rule pt-2">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="m-0 text-lg font-semibold">{value}</dd>
    </div>
  );
}
