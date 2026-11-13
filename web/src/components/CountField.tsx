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
 * "Number of processes". The table changes when the reader leaves the field or presses Enter,
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

  function commit() {
    if (draft === null) return;
    const parsed = parseCount(draft);
    if (parsed.ok) {
      onCommit(parsed.value);
      setDraft(null);
      setError(null);
    } else {
      setError(parsed.message);
      onInvalid(parsed.message);
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
          onEdit();
          setDraft(event.target.value);
          setError(null);
        }}
        onBlur={commit}
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
        Rows are added or removed at the end when you leave the field or press Enter.
      </p>
      {error !== null && (
        <p id={ERROR_ID} className="mt-1 max-w-[16rem] text-sm leading-snug text-danger">
          <span className="font-semibold">Error:</span> {error}
        </p>
      )}
    </div>
  );
}
