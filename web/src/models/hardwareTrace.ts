export interface CpuSet {
  id: number;
  group: number;
  logicalProcessorIndex: number;
  coreIndex: number;
  efficiencyClass: number;
  parked: boolean;
  allocated: boolean;
  allocatedToTargetProcess: boolean;
}
export interface NativeMeasurement {
  run: number;
  elapsedMs: number;
  selectedCpuSetIds: number[];
  observedLogicalCpus: { group: number; logicalProcessorIndex: number; samples: number }[];
  affinityRequestSucceeded: boolean;
  affinityError: string;
  requestedClassSamples: number;
  totalSamples: number;
  checksum: string;
}
export interface HardwareTrace {
  schemaVersion: 1;
  mode: "NATIVE_MEASURED";
  collectedAt: string;
  machine: { cpuName: string; os: string; topologyDetected: boolean };
  powerScheme: string;
  cpuSets: CpuSet[];
  scenario: { workload: "detect" | "bounded_compute"; requestedClass: "none" | "performance" | "efficient"; repeats: number; iterations: number; warmupRuns: number };
  measurements: NativeMeasurement[];
  summary: { medianMs: number; minMs: number; maxMs: number } | null;
  notes: string[];
}
