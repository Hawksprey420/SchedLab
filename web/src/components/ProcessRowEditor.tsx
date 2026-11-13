import { fieldErrorId, type FieldName, type ProcessRow } from "../models/workload";
import { ProcessField } from "./ProcessField";

const FIELD_LABELS: Record<FieldName, string> = {
  id: "PID",
  arrival: "Arrival",
  burst: "Burst",
  priority: "Priority",
};
const FIELD_ORDER: FieldName[] = ["id", "arrival", "burst", "priority"];

interface ProcessRowEditorProps {
  row: ProcessRow;
  /** 1-based position, used to name a row whose PID is empty. */
  position: number;
  issues: Partial<Record<FieldName, string>>;
  onEdit: (rowKey: number, field: FieldName, value: string) => void;
  onBlur: (rowKey: number, field: FieldName) => void;
  onRemove: (rowKey: number) => void;
}

/** One process: its inputs, and below them any errors for those inputs. */
export function ProcessRowEditor({ row, position, issues, onEdit, onBlur, onRemove }: ProcessRowEditorProps) {
  const name = row.id.trim() || `row ${position}`;
  const problems = FIELD_ORDER.filter((field) => issues[field] !== undefined);

  return (
    <tbody>
      <tr>
        {FIELD_ORDER.map((field) => (
          <td key={field} className="px-1 py-1 align-top">
            <ProcessField
              rowKey={row.key}
              field={field}
              label={`${FIELD_LABELS[field]} of ${name}`}
              value={row[field]}
              error={issues[field]}
              onChange={onEdit}
              onBlur={onBlur}
            />
          </td>
        ))}
        <td className="py-1 pl-1 align-top">
          <button
            type="button"
            id={`remove-${row.key}`}
            aria-label={`Remove ${name}`}
            onClick={() => onRemove(row.key)}
            className="min-h-11 w-full rounded-control border border-ink-muted px-1.5 text-sm hover:bg-surface"
          >
            Remove
          </button>
        </td>
      </tr>
      {problems.length > 0 && (
        <tr>
          <td colSpan={5} className="px-1 pb-2">
            {problems.map((field) => (
              <p key={field} id={fieldErrorId(row.key, field)} className="text-sm leading-snug text-danger [overflow-wrap:anywhere]">
                <span className="font-semibold">Error:</span> {issues[field]}
              </p>
            ))}
          </td>
        </tr>
      )}
    </tbody>
  );
}
