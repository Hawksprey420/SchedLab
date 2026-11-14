# Hardware assumptions

## Simulated profiles

Hybrid runs are labelled `SIMULATED` and `Experimental / simplified model`.
The selected queue order (FCFS or non-preemptive SJF) chooses an eligible process;
the independent placement heuristic chooses an idle lane. A process never migrates
or preempts. Burst is work units; duration is ceil(work / lane rate) ticks.

| Profile | Physical simulated lanes | Assumed work / tick | Assumed energy units / tick |
|---|---|---|---|
| Single core (graded) | CPU0 | 1 | 1 |
| Intel-style | P0..P5; E0..E3 | P: 2; E: 1 | P: 3; E: 1 |
| Arm-style | Prime0; Big0..Big2; LITTLE0..LITTLE3 | Prime: 3; Big: 2; LITTLE: 1 | Prime: 5; Big: 3; LITTLE: 1 |

These are fictional teaching values, not measurements of any CPU. The Intel
example represents six P and four E physical cores, ten lanes. P-core simultaneous
multithreading (SMT) adds logical processors: the example machine has sixteen
logical processors, not sixteen independent physical cores. SMT contention, caches,
memory, frequency scaling, thermal limits and OS policy are outside this model.
The Arm profile illustrates heterogeneous placement and is not a particular device.

FIRST_AVAILABLE chooses the lexicographically smallest idle core ID;
FASTEST_AVAILABLE chooses highest assumed rate, then core ID; ENERGY_FIRST chooses
lowest assumed energy units per tick, then core ID. The latter can finish later.
Lexicographic ID order means E precedes P and Big precedes LITTLE and Prime.
This explicit teaching convention is deterministic, not a recommendation for OS policy.

The energy index sums busy ticks times assumed energy units per tick. It has no
physical power unit. Compare it alongside makespan, total work and per-lane
utilisation. None of these simulated results measures a processor's performance
or energy consumption. The complete interface and tie rules are in
[the hybrid contract](hybrid-contract.md).

Single-core mode continues to interpret burst as ticks with a rate of one and
uses the existing mandatory scheduling call and rendering. Its defaults are unchanged.

## Native Windows traces

The standalone `native/windows-intel` program builds `schedlab-intel.exe`; it does
not link into the portable core or browser. `detect` only enumerates topology and
metadata. `bench` is explicit opt-in: one worker thread, one warm-up, a bounded fixed
integer workload, and 1 to 20 measured repeats. The browser imports a local file;
there is no native bridge, upload or network request. Bundled samples work offline.

Windows reports CPU Set IDs, processor groups, logical processor/core indices and
`EfficiencyClass`. On heterogeneous systems the larger class value denotes a faster,
less energy-efficient class. The tool chooses the highest and lowest eligible
classes at runtime, excluding CPU Sets allocated exclusively to another process.
It never hard-codes logical processors as P or E. A single eligible class yields a
clear skipped-comparison result instead of pretending there are two classes.
See Microsoft's [CPU Set structure](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-system_cpu_set_information).

CPU Sets express a scheduling constraint. They are not hardware isolation:
restrictive affinity masks, processor groups, reservations, parking, OS policy,
SMT siblings and competing processes affect execution. The tool records whether
the request succeeded and samples the actual group/logical CPU during each run,
including the count in the requested class. Sampling is intermittent and does not
prove the worker stayed in that class between observations. See Microsoft's
[CPU Sets behavior](https://learn.microsoft.com/en-us/windows/win32/procthread/cpu-sets)
and [thread selection API](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-setthreadselectedcpusets).

Measured milliseconds are elapsed wall-clock time from QueryPerformanceCounter,
not simulated ticks or CPU energy use. The fixed integer workload and checksum
are identical across classes. Report the median, range, requested CPU Set IDs,
observed processors, active power scheme and trace notes together. Background
activity, temperature, power limits, boost, SMT and warm-up effects limit comparisons.
No ambient/thermal control or measured power is claimed. Intel Thread Director
was neither read nor reimplemented. These runs are not FCFS or SJF schedules.

Committed samples are previously collected traces from this particular i7-12650H,
not predicted timings for other machines. Each trace includes its actual collection
time and power scheme. An imported file is a user's claim of measurement, not a
cryptographically authenticated experiment. The importer validates fields and
cross-field references but cannot establish the provenance of arbitrary local JSON.

## Trace schema version 1

Every trace has `schemaVersion: 1`, `mode: NATIVE_MEASURED`, `collectedAt` (UTC),
`machine` (CPU name, OS, topologyDetected), `powerScheme`, `cpuSets`, `scenario`,
`measurements`, `summary`, and text `notes`. See the TypeScript field definitions
in `web/src/models/hardwareTrace.ts` and native types in the standalone project.

CPU Sets contain `id`, `group`, `logicalProcessorIndex`, `coreIndex`,
`efficiencyClass`, `parked`, `allocated` and `allocatedToTargetProcess`.
The scenario contains workload (`detect` or `bounded_compute`), requestedClass
(`none`, `performance`, `efficient`), repeats, iterations and warmupRuns.
Detection has zero iterations/repeats/warmups, an empty measurements array and null
summary. A completed benchmark has one warm-up, 400,000,000 iterations per run,
and a medianMs/minMs/maxMs summary from its measured runs.

Each measurement records sequential run number, elapsedMs, selectedCpuSetIds,
observedLogicalCpus (`group`, `logicalProcessorIndex`, `samples`),
affinityRequestSucceeded, affinityError, requestedClassSamples, totalSamples and a
uint64 checksum represented as a decimal string. Integer identifiers and sample
counts stay exact. CPU observations use group plus logical index, so multi-group
systems cannot conflate processors with the same index.

The importer bounds files to 1,000,000 bytes before reading and parsing, validates
every consumed field and rejects invalid schema/mode, bad ranges, duplicate or
unknown topology references, inconsistent observation totals and invalid protocol
counts. It renders notes and errors as plain React text. Unsupported or malformed
files produce readable errors and clear the previous panel. New file/sample/clear
actions invalidate pending reads so a late file cannot replace a newer selection.
Measurements are displayed only in their own `Native measured` panel in milliseconds;
simulation continues independently in ticks. Original source JSON is not persisted.

### Previously collected sample results

On 14 November 2026, Balanced power scheme, three repeats after one warm-up:
performance-class request median 678.46 ms (range 668.69–689.65); efficient-class
request median 828.32 ms (795.04–838.23). Both use the same Release executable
and 400,000,000 integer iterations with checksum 51001733377.

All requests succeeded, but efficient traces sampled their requested class only
365/382, 310/382 and 365/382 times; the performance traces sampled it 382/382 each.
The importer displays a prominent warning whenever observations leave the requested
class. These data do not establish an isolated P/E hardware speed ratio. Parking
also changed between topology snapshots. See the actual JSON under `examples/`
and [extension verification](extension-verification.md) for all six durations and
caveats. No further full benchmark collection is part of automatic tests.
