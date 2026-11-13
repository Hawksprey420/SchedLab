import type { EngineState } from "../state/useEngine";

interface EngineStatusProps {
  engine: EngineState;
  onRetry: () => void;
}

/** Shown only while the WebAssembly scheduler is loading or if it could not be loaded. */
export function EngineStatus({ engine, onRetry }: EngineStatusProps) {
  if (engine.status === "ready") return null;

  if (engine.status === "loading") {
    return (
      <p role="status" className="mt-4 border border-rule bg-surface px-4 py-3 text-sm">
        Loading the scheduling engine. You can start editing the workload, and Run becomes available when it is ready.
      </p>
    );
  }

  return (
    <div role="alert" className="mt-4 border border-danger bg-surface px-4 py-3 text-sm">
      <p>
        <span className="font-semibold text-danger">Error:</span> The scheduling engine could not be loaded, so nothing can be simulated.
        Check that the page finished loading, then try again.
      </p>
      <p className="mt-1 text-ink-muted [overflow-wrap:anywhere]">Detail from the browser: {engine.reason}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 min-h-11 rounded-control border border-ink px-4 font-medium hover:bg-paper"
      >
        Try loading again
      </button>
    </div>
  );
}
