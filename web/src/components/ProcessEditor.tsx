import type { ExampleWorkload } from "../lib/examples";
import { fieldKey, type FieldName, type ProcessRow, type RemovedRow } from "../models/workload";
import { CountField } from "./CountField";
import { ExampleLoader } from "./ExampleLoader";
import { ProcessRowEditor } from "./ProcessRowEditor";
import { SectionHeading } from "./SectionHeading";
import { UndoNotice } from "./UndoNotice";

const FIELDS: FieldName[] = ["id", "arrival", "burst", "priority"];

interface ProcessEditorProps {
  rows: readonly ProcessRow[];
  /** Messages already filtered to the ones that may be shown, keyed by fieldKey(rowKey, field). */
  issues: ReadonlyMap<string, string>;
  removed: readonly RemovedRow[] | null;
  examples: readonly ExampleWorkload[];
  onEdit: (rowKey: number, field: FieldName, value: string) => void;
  onBlurField: (rowKey: number, field: FieldName) => void;
  onAdd: () => void;
  onRemove: (rowKey: number) => void;
  onCommitCount: (count: number) => void;
  onInvalidCount: (message: string) => void;
  onUndo: () => void;
  onLoadExample: (example: ExampleWorkload) => void;
}

export function ProcessEditor({
  rows,
  issues,
  removed,
  examples,
  onEdit,
  onBlurField,
  onAdd,
  onRemove,
  onCommitCount,
  onInvalidCount,
  onUndo,
  onLoadExample,
}: ProcessEditorProps) {
  return (
    <section aria-labelledby="workload-heading">
      <SectionHeading number={1} id="workload-heading">
        Workload
      </SectionHeading>
      <p className="max-w-prose text-sm text-ink-muted">
        One row per process. Arrival and burst are in ticks. Priority is recorded but not used by FCFS or SJF.
      </p>

      <div className="mt-4 flex flex-wrap items-start gap-x-6 gap-y-4">
        <CountField rowCount={rows.length} onCommit={onCommitCount} onInvalid={onInvalidCount} />
        <div className="min-w-0 flex-1 basis-60">
          <ExampleLoader examples={examples} onLoad={onLoadExample} />
        </div>
      </div>

      <table className="mt-5 w-full table-fixed border-collapse">
        <caption className="sr-only">Processes to schedule, one row each</caption>
        <colgroup>
          <col className="w-[21%]" />
          <col className="w-[20%]" />
          <col className="w-[20%]" />
          <col className="w-[20%]" />
          <col className="w-[19%]" />
        </colgroup>
        <thead>
          <tr className="border-y border-ink bg-surface text-sm">
            <th scope="col" className="px-1 py-1.5 text-start font-semibold">
              PID
            </th>
            <th scope="col" className="px-1 py-1.5 text-end font-semibold">
              Arrival
            </th>
            <th scope="col" className="px-1 py-1.5 text-end font-semibold">
              Burst
            </th>
            <th scope="col" className="px-1 py-1.5 text-end font-semibold">
              Priority
            </th>
            <th scope="col" className="px-1 py-1.5">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        {rows.map((row, index) => (
          <ProcessRowEditor
            key={row.key}
            row={row}
            position={index + 1}
            issues={Object.fromEntries(
              FIELDS.flatMap((field) => {
                const message = issues.get(fieldKey(row.key, field));
                return message === undefined ? [] : [[field, message]];
              }),
            )}
            onEdit={onEdit}
            onBlur={onBlurField}
            onRemove={onRemove}
          />
        ))}
      </table>

      {rows.length === 0 && (
        <p className="border-b border-rule py-3 text-sm text-ink-muted">
          The table is empty. Add a process or load an example.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onAdd}
          className="min-h-11 rounded-control border border-ink px-4 text-sm font-medium hover:bg-surface"
        >
          Add process
        </button>
      </div>

      {removed !== null && <UndoNotice removed={removed} onUndo={onUndo} />}
    </section>
  );
}
