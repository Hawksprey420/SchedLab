import { fieldElementId, type FieldName } from "../models/workload";

export interface SummaryItem {
  rowKey: number;
  field: FieldName;
  /** "Row 2 (P2)": which row the problem is in; a PID alone can be ambiguous when ids repeat. */
  where: string;
  message: string;
}

interface ErrorSummaryProps {
  items: readonly SummaryItem[];
  /** Problems that belong to no single input, such as too many processes. */
  wholeInput: readonly string[];
  onGoTo: (rowKey: number, field: FieldName) => void;
}

const LISTED = 8;

/** Says how many problems there are and links each one to its input. Focus lands on the heading when no input is to blame. */
export function ErrorSummary({ items, wholeInput, onGoTo }: ErrorSummaryProps) {
  const count = items.length + wholeInput.length;
  if (count === 0) return null;
  const hidden = items.length - LISTED;

  return (
    <section aria-labelledby="problems-heading" className="mt-6 border-2 border-danger bg-surface px-4 py-3">
      <h2 id="problems-heading" tabIndex={-1} className="font-serif text-lg font-semibold text-danger">
        {count === 1 ? "1 problem to fix" : `${count} problems to fix`}
      </h2>
      <p className="text-sm text-ink-muted">Fix these fields, then run the simulation again.</p>
      <ul className="mt-2 space-y-1 text-sm">
        {wholeInput.map((message) => (
          <li key={message} className="[overflow-wrap:anywhere]">
            <span className="font-semibold text-danger">Error:</span> {message}
          </li>
        ))}
        {items.slice(0, LISTED).map((item) => (
          <li key={`${item.rowKey}-${item.field}`} className="[overflow-wrap:anywhere]">
            <a
              href={`#${fieldElementId(item.rowKey, item.field)}`}
              onClick={(event) => {
                // A fragment link only scrolls to an input; focus has to be moved explicitly.
                event.preventDefault();
                onGoTo(item.rowKey, item.field);
              }}
              className="font-medium text-accent underline underline-offset-2"
            >
              {item.where}
            </a>
            : {item.message}
          </li>
        ))}
        {hidden > 0 && <li>and {hidden} more. Fix these first.</li>}
      </ul>
    </section>
  );
}
