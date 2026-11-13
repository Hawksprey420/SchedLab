import { useCallback, useEffect, useState } from "react";
import { loadWasmAdapter } from "../bridge/wasmAdapter";
import type { SchedulerAdapter } from "../bridge/schedulerAdapter";

export type EngineState =
  | { status: "loading" }
  | { status: "ready"; adapter: SchedulerAdapter }
  | { status: "failed"; reason: string };

/** Loads the WebAssembly scheduler once and exposes a way to try again after a failure. */
export function useEngine(): { engine: EngineState; retry: () => void } {
  const [engine, setEngine] = useState<EngineState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Strict Mode mounts effects twice in development; only the latest attempt may set state.
    let ignore = false;
    loadWasmAdapter().then(
      (adapter) => {
        if (!ignore) setEngine({ status: "ready", adapter });
      },
      (error: unknown) => {
        if (!ignore) setEngine({ status: "failed", reason: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      ignore = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setEngine({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  return { engine, retry };
}
