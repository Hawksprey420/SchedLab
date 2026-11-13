import { fieldElementId, fieldErrorId, type FieldName } from "../models/workload";

interface ProcessFieldProps {
  rowKey: number;
  field: FieldName;
  /** Accessible name; the column header is not enough once a cell is read on its own. */
  label: string;
  value: string;
  /** Shown only after interaction or a run; its presence also sets aria-invalid. */
  error: string | undefined;
  onChange: (rowKey: number, field: FieldName, value: string) => void;
  onBlur: (rowKey: number, field: FieldName) => void;
}

export function ProcessField({ rowKey, field, label, value, error, onChange, onBlur }: ProcessFieldProps) {
  const id = fieldElementId(rowKey, field);
  const isId = field === "id";
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        name={`${field}-${rowKey}`}
        type="text"
        // Priority may be negative, and iOS numeric keypads have no minus sign.
        inputMode={field === "priority" || isId ? "text" : "numeric"}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        value={value}
        aria-invalid={error !== undefined}
        // The error is referenced only while it is visible, or it would be read out from page load.
        aria-describedby={error !== undefined ? fieldErrorId(rowKey, field) : undefined}
        onChange={(event) => onChange(rowKey, field, event.target.value)}
        onBlur={() => onBlur(rowKey, field)}
        className={[
          "block min-h-11 w-full min-w-0 rounded-control border bg-paper px-1.5",
          isId ? "text-start font-mono text-sm" : "text-end",
          error !== undefined ? "border-2 border-danger" : "border-ink-muted",
        ].join(" ")}
      />
    </>
  );
}
