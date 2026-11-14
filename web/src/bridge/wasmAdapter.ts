import createSchedLabModule from "../wasm/schedlab.mjs";
import type { SchedulerAdapter } from "./schedulerAdapter";

let loading: Promise<SchedulerAdapter> | undefined;

/**
 * Loads the WebAssembly module once and returns the adapter. Later calls share the same
 * promise; a failed load is forgotten so the caller can retry.
 */
export function loadWasmAdapter(): Promise<SchedulerAdapter> {
  loading ??= createSchedLabModule().then(
    (module) => ({ simulate: module.simulate, simulateHybrid: module.simulateHybrid }),
    (error: unknown) => {
      loading = undefined;
      throw error;
    },
  );
  return loading;
}
