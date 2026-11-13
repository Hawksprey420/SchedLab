import { describeRemoval } from "../lib/removalText";
import type { RemovedRow } from "../models/workload";

interface UndoNoticeProps {
  removed: readonly RemovedRow[];
  onUndo: () => void;
}

/** One level of undo for removed rows. The same sentence is announced by the live region. */
export function UndoNotice({ removed, onUndo }: UndoNoticeProps) {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border border-rule bg-surface px-3 py-1 text-sm">
      <span className="min-w-0 [overflow-wrap:anywhere]">{describeRemoval(removed)}</span>
      <button
        type="button"
        id="undo-removal"
        onClick={onUndo}
        className="min-h-11 rounded-control px-2 font-semibold text-accent underline underline-offset-2"
      >
        Undo
      </button>
    </p>
  );
}
