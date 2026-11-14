import type { CpuSet, HardwareTrace, NativeMeasurement } from "../models/hardwareTrace";

export const MAX_TRACE_BYTES = 1_000_000;

type RecordValue = Record<string, unknown>;
function requireValue(condition: unknown, field: string): asserts condition {
  if (!condition) throw new Error(`Invalid ${field}. Choose a schemaVersion 1 native trace exported by schedlab-intel.`);
}
function object(value: unknown, field: string): RecordValue {
  requireValue(value !== null && typeof value === "object" && !Array.isArray(value), field);
  return value as RecordValue;
}
function text(value: unknown, field: string, empty = false): string {
  requireValue(typeof value === "string" && value.length <= 4096 && (empty || value.trim().length > 0), field);
  return value;
}
function integer(value: unknown, field: string, max: number, min = 0): number {
  requireValue(typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max, field);
  return value;
}
function boolean(value: unknown, field: string): boolean {
  requireValue(typeof value === "boolean", field);
  return value;
}
function list(value: unknown, field: string, max: number, min = 0): unknown[] {
  requireValue(Array.isArray(value) && value.length >= min && value.length <= max, field);
  return value;
}
function elapsed(value: unknown, field: string): number {
  requireValue(typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 5000, field);
  return value;
}
function cpuSet(value: unknown): CpuSet {
  const s = object(value, "CPU Set");
  return {
    id: integer(s.id, "CPU Set ID", 0xffffffff), group: integer(s.group, "processor group", 65535),
    logicalProcessorIndex: integer(s.logicalProcessorIndex, "logical processor", 255),
    coreIndex: integer(s.coreIndex, "core index", 255), efficiencyClass: integer(s.efficiencyClass, "efficiency class", 255),
    parked: boolean(s.parked, "parked flag"), allocated: boolean(s.allocated, "allocated flag"),
    allocatedToTargetProcess: boolean(s.allocatedToTargetProcess, "target allocation flag"),
  };
}
const cpuKey = (cpu: {group: number; logicalProcessorIndex: number}) => `${cpu.group}:${cpu.logicalProcessorIndex}`;

function measurement(value: unknown, index: number, sets: CpuSet[], selectedClass: number): NativeMeasurement {
  const m = object(value, "measurement");
  const run = integer(m.run, "run number", 20, 1);
  requireValue(run === index + 1, "run sequence");
  const selectedCpuSetIds = list(m.selectedCpuSetIds, "selected CPU Sets", sets.length, 1).map(v => integer(v, "selected ID", 0xffffffff));
  requireValue(new Set(selectedCpuSetIds).size === selectedCpuSetIds.length && selectedCpuSetIds.every(id => sets.some(s => s.id === id && s.efficiencyClass === selectedClass && (!s.allocated || s.allocatedToTargetProcess))), "selected class or allocation");
  const observedLogicalCpus = list(m.observedLogicalCpus, "observed CPUs", sets.length, 1).map(v => {
    const c = object(v, "CPU observation");
    return {group: integer(c.group, "observed group", 65535), logicalProcessorIndex: integer(c.logicalProcessorIndex, "observed processor", 255), samples: integer(c.samples, "sample count", 100000, 1)};
  });
  requireValue(new Set(observedLogicalCpus.map(cpuKey)).size === observedLogicalCpus.length && observedLogicalCpus.every(c => sets.some(s => cpuKey(s) === cpuKey(c))), "observed topology");
  const totalSamples = integer(m.totalSamples, "total samples", 100000, 1);
  const requestedClassSamples = integer(m.requestedClassSamples, "requested class samples", totalSamples);
  requireValue(totalSamples === observedLogicalCpus.reduce((sum, c) => sum + c.samples, 0), "sample total");
  requireValue(requestedClassSamples === observedLogicalCpus.reduce((sum, c) => sum + (sets.some(s => cpuKey(s) === cpuKey(c) && s.efficiencyClass === selectedClass) ? c.samples : 0), 0), "requested class sample total");
  const affinityRequestSucceeded = boolean(m.affinityRequestSucceeded, "request success");
  const affinityError = text(m.affinityError, "request error", true);
  requireValue(affinityRequestSucceeded ? affinityError === "" : affinityError.trim().length > 0, "request error detail");
  const checksum = text(m.checksum, "checksum");
  requireValue(/^(0|[1-9][0-9]{0,19})$/.test(checksum) && BigInt(checksum) <= 18446744073709551615n, "checksum");
  return {run, elapsedMs: elapsed(m.elapsedMs, "elapsed milliseconds"), selectedCpuSetIds, observedLogicalCpus, affinityRequestSucceeded, affinityError, requestedClassSamples, totalSamples, checksum};
}

function validate(value: unknown): HardwareTrace {
  const r = object(value, "trace root");
  requireValue(r.schemaVersion === 1, "schemaVersion (expected 1)");
  requireValue(r.mode === "NATIVE_MEASURED", "mode (expected NATIVE_MEASURED)");
  const collectedAt = text(r.collectedAt, "collection timestamp");
  requireValue(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(collectedAt) && Number.isFinite(Date.parse(collectedAt)), "UTC timestamp");
  const machine = object(r.machine, "machine");
  const cpuSets = list(r.cpuSets, "CPU Sets", 4096, 1).map(cpuSet);
  requireValue(new Set(cpuSets.map(s => s.id)).size === cpuSets.length && new Set(cpuSets.map(cpuKey)).size === cpuSets.length, "unique CPU Sets");
  const scenario = object(r.scenario, "scenario");
  requireValue(scenario.workload === "detect" || scenario.workload === "bounded_compute", "workload");
  const detect = scenario.workload === "detect";
  requireValue(detect ? scenario.requestedClass === "none" : scenario.requestedClass === "performance" || scenario.requestedClass === "efficient", "requested class");
  const repeats = integer(scenario.repeats, "repeats", 20, detect ? 0 : 1);
  requireValue(detect ? repeats === 0 && scenario.iterations === 0 && scenario.warmupRuns === 0 : scenario.iterations === 400000000 && scenario.warmupRuns === 1, "workload protocol");
  const classes = cpuSets.filter(s => !s.allocated || s.allocatedToTargetProcess).map(s => s.efficiencyClass);
  requireValue(detect || new Set(classes).size >= 2, "heterogeneous eligible classes");
  const selectedClass = scenario.requestedClass === "performance" ? Math.max(...classes) : Math.min(...classes);
  const measurements = list(r.measurements, "measurements", 20).map((m, i) => measurement(m, i, cpuSets, selectedClass));
  requireValue(measurements.length === repeats, "measurement count");
  let summary: HardwareTrace["summary"] = null;
  if (detect) requireValue(r.summary === null, "detect summary");
  else {
    const s = object(r.summary, "summary");
    summary = {medianMs: elapsed(s.medianMs, "median"), minMs: elapsed(s.minMs, "minimum"), maxMs: elapsed(s.maxMs, "maximum")};
    // Match native statistics.cpp exactly; keep the supplied summary for display.
    const times = measurements.map(m => m.elapsedMs).sort((a, b) => a - b);
    const middle = Math.floor(times.length / 2);
    const median = times.length % 2 === 0 ? (times[middle - 1]! + times[middle]!) / 2 : times[middle]!;
    requireValue(summary.minMs === times[0] && summary.maxMs === times[times.length - 1] && summary.medianMs === median, "summary consistency");
  }
  return {
    schemaVersion: 1, mode: "NATIVE_MEASURED", collectedAt,
    machine: {cpuName: text(machine.cpuName, "CPU name"), os: text(machine.os, "OS name"), topologyDetected: boolean(machine.topologyDetected, "topology status")},
    powerScheme: text(r.powerScheme, "power scheme"), cpuSets,
    scenario: {workload: scenario.workload, requestedClass: scenario.requestedClass as HardwareTrace["scenario"]["requestedClass"], repeats, iterations: scenario.iterations as number, warmupRuns: scenario.warmupRuns as number},
    measurements, summary, notes: list(r.notes, "notes", 100, 1).map(n => text(n, "note")),
  };
}

export function parseHardwareTrace(source: string): {ok: true; trace: HardwareTrace} | {ok: false; error: string} {
  if (new TextEncoder().encode(source).byteLength > MAX_TRACE_BYTES) return {ok: false, error: "Trace exceeds the 1 MB size limit. Choose a smaller native trace."};
  try { return {ok: true, trace: validate(JSON.parse(source))}; }
  catch (error) { return {ok: false, error: error instanceof SyntaxError ? "Could not parse JSON. Choose a JSON trace exported by schedlab-intel." : error instanceof Error ? error.message : "Could not read this trace."}; }
}
