import type { HardwareTrace } from "../models/hardwareTrace";
import { formatAverage } from "../lib/format";

export function HardwareTracePanel({ trace }: { trace: HardwareTrace }) {
  const summary = trace.summary;
  return (
    <div className="mt-5 space-y-4 [overflow-wrap:anywhere]">
      <h3 className="font-serif text-lg font-semibold">Native measured</h3>
      <p>{trace.machine.cpuName} · {trace.machine.os}</p>
      <p className="text-sm text-ink-muted">Previously collected at {trace.collectedAt}. Power scheme: {trace.powerScheme}. Topology detected: {trace.machine.topologyDetected ? "yes" : "no"}.</p>
      <p>Requested class: {trace.scenario.requestedClass}</p>
      {trace.measurements.some(m => m.requestedClassSamples < m.totalSamples) && <p className="font-semibold text-accent">Some observations were outside the requested class. These timings are not an isolated class comparison.</p>}
      <p className="text-sm">{trace.scenario.iterations.toLocaleString()} integer iterations per run; {trace.scenario.warmupRuns} warm-up run. These are measured milliseconds, independent of FCFS, SJF and simulated ticks.</p>
      {summary ? <>
        <dl className="grid gap-3 sm:grid-cols-3">
          <div><dt className="text-sm text-ink-muted">Median elapsed</dt><dd className="m-0 font-semibold">{formatAverage(summary.medianMs)} ms</dd></div>
          <div><dt className="text-sm text-ink-muted">Minimum elapsed</dt><dd className="m-0 font-semibold">{formatAverage(summary.minMs)} ms</dd></div>
          <div><dt className="text-sm text-ink-muted">Maximum elapsed</dt><dd className="m-0 font-semibold">{formatAverage(summary.maxMs)} ms</dd></div>
        </dl>
        <div role="region" tabIndex={0} aria-label="Measured native runs" className="max-w-full overflow-x-auto">
          <table className="data-table text-sm" aria-label="Measured native runs">
            <thead><tr><th scope="col">Run</th><th scope="col">Elapsed (ms)</th><th scope="col">CPU Set request</th><th scope="col">Class samples / total</th></tr></thead>
            <tbody>{trace.measurements.map(m => <tr key={m.run}><th scope="row">{m.run}</th><td>{formatAverage(m.elapsedMs)}</td><td>{m.affinityRequestSucceeded ? "Succeeded" : "Failed"}</td><td>{m.requestedClassSamples} / {m.totalSamples}</td></tr>)}</tbody>
          </table>
        </div>
        <details>
          <summary className="cursor-pointer font-medium">CPU Set requests and observations</summary>
          <ul className="mt-2 space-y-3 text-sm">{trace.measurements.map(m => <li key={m.run}>
            Run {m.run}: requested CPU Set IDs {m.selectedCpuSetIds.join(", ")}. Observed group:CPU (sample count): {m.observedLogicalCpus.map(c => `${c.group}:${c.logicalProcessorIndex} (${c.samples})`).join(", ")}. Checksum: {m.checksum}.{m.affinityError && ` Request error: ${m.affinityError}`}
          </li>)}</ul>
        </details>
      </> : <p>Detection only. No workload was run and no durations were measured.</p>}
      <ul className="list-disc space-y-2 pl-5 text-sm text-ink-muted">{trace.notes.map((note,i) => <li key={i}>{note}</li>)}</ul>
    </div>
  );
}
