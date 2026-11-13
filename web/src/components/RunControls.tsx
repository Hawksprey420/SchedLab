import { SectionHeading } from "./SectionHeading";

interface RunControlsProps {
  /** False until the WebAssembly scheduler has loaded. */
  engineReady: boolean;
  onReset: () => void;
}

/** Run submits the surrounding form, so pressing Enter in any field runs too. */
export function RunControls({ engineReady, onReset }: RunControlsProps) {
  return (
    <section aria-labelledby="run-heading">
      <SectionHeading number={3} id="run-heading">
        Run
      </SectionHeading>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!engineReady}
          className="min-h-12 rounded-control bg-accent px-6 font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Run simulation
        </button>
        <button
          type="button"
          onClick={onReset}
          className="min-h-12 rounded-control border border-ink px-5 font-medium hover:bg-surface"
        >
          Reset
        </button>
      </div>
      <p className="mt-2 text-sm text-ink-muted">Reset loads the T1 example and FCFS.</p>
    </section>
  );
}
