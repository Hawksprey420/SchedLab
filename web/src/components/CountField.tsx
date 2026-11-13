import { useState } from "react";
import { parseCount } from "../lib/parseField";

interface CountFieldProps {
  rowCount: number;
  onCommit: (count: number) => void;
  onInvalid: (message: string) => void;
  onEdit: () => void;
}

const ERROR_ID = "process-count-error";
const HINT_ID = "process-count-hint";

/**
 * "Number of processes". The table changes when the reader presses Enter or Run,
 * not per keystroke: typing 10 must not delete rows on the way through 1.
 */
export function CountField({ rowCount, onCommit, onInvalid, onEdit }: CountFieldProps) {
  const [previousCount, setPreviousCount] = useState(rowCount);
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (previousCount !== rowCount) {
    setPreviousCount(rowCount);
    setDraft(null);
    setError(null);
  }

  function validateDraft() {
    if (draft === null) return null;
    const parsed = parseCount(draft);
    setError(parsed.ok ? null : parsed.message);
    if (!parsed.ok) onInvalid(parsed.message);
    return parsed;
  }

  function commit() {
    const parsed = validateDraft();
    if (parsed?.ok) {
      onCommit(parsed.value);
      setDraft(null);
    }
  }

  return (
    <div>
      <label htmlFor="process-count" className="block text-sm font-medium">
        Number of processes
      </label>
      <input
        id="process-count"
        name="process-count"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={draft ?? String(rowCount)}
        aria-invalid={error !== null}
        aria-describedby={error !== null ? `${HINT_ID} ${ERROR_ID}` : HINT_ID}
        onChange={(event) => {
          event.currentTarget.setCustomValidity("");
          onEdit();
          setDraft(event.target.value);
          setError(null);
        }}
        onBlur={(event) => {
          // Actions must finish before an error can move their pointer target.
          if (event.relatedTarget instanceof HTMLElement &&
              event.relatedTarget.matches("button, a[href], select, input[type=radio], input[type=checkbox]")) return;
          validateDraft();
        }}
        onInvalid={(event) => {
          event.preventDefault();
          setError(event.currentTarget.validationMessage);
        }}
        onKeyDown={(event) => {
          // Enter would otherwise submit the form and run the simulation.
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
        className={[
          "mt-1 block min-h-11 w-24 rounded-control border bg-paper px-2 text-end",
          error !== null ? "border-2 border-danger" : "border-ink-muted",
        ].join(" ")}
      />
      <p id={HINT_ID} className="mt-1 max-w-[16rem] text-xs text-ink-muted">
        Press Enter or Run to apply this count. Adding rows or loading an example discards an unapplied count.
      </p>
      {error !== null && (
        <p id={ERROR_ID} className="mt-1 max-w-[16rem] text-sm leading-snug text-danger">
          <span className="font-semibold">Error:</span> {error}
        </p>
      )}
    </div>
  );
}
