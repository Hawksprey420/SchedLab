import { formatAverage, formatTicks } from "../lib/format";
import type { HybridSchedule } from "../models/types";

export function HybridSummary({ schedule }: { schedule: HybridSchedule }) {
  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm">SIMULATED · {schedule.profile} · {schedule.algorithm} · {schedule.heuristic}. Non-preemptive, no migration.</p>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div><dt className="text-sm text-ink-muted">Total work</dt><dd className="m-0 font-semibold">{formatTicks(schedule.totalWork)} work units</dd></div>
        <div><dt className="text-sm text-ink-muted">Energy index</dt><dd className="m-0 font-semibold">{formatTicks(schedule.energyIndex)}</dd></div>
      </dl>
      <p className="text-sm text-ink-muted">Assumed energy units per tick multiplied by busy ticks. This is an abstract index. Rates and energy units below are assumptions.</p>
      <div role="region" tabIndex={0} aria-label="Lane assumptions and utilisation" className="max-w-full overflow-x-auto">
        <table className="data-table text-sm" aria-label="Lane assumptions and utilisation">
          <thead><tr><th scope="col">Lane</th><th scope="col">Work / tick</th><th scope="col">Energy units / tick</th><th scope="col">Busy ticks</th><th scope="col">Utilisation</th></tr></thead>
          <tbody>{schedule.lanes.map(lane => <tr key={lane.coreId}>
            <th scope="row"><span className="whitespace-nowrap">{lane.coreId}</span></th><td>{lane.rate}</td><td>{lane.energyPerTick}</td><td>{formatTicks(lane.busyTicks)}</td><td>{formatAverage(lane.utilisation * 100)}%</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
