import { useCallback, useMemo, useReducer, useState, type FormEvent } from "react";
import { ALGORITHM_NAME } from "../lib/algorithmNames";
import { DEFAULT_EXAMPLE, type ExampleWorkload } from "../lib/examples";
import { capitalize, formatAverage, formatTicks } from "../lib/format";
import { mapCoreErrors } from "../lib/mapErrors";
import { parseRowField, parseWorkload } from "../lib/parseWorkload";
import { parseCount, type NumericField } from "../lib/parseField";
import { describeRemoval } from "../lib/removalText";
import type { Algorithm, Schedule, Profile, Placement } from "../models/types";
import { fieldElementId, fieldKey, type FieldName, type ProcessRow } from "../models/workload";
import type { SummaryItem } from "../components/ErrorSummary";
import { deriveResultView } from "./resultView";
import { useAnnouncer } from "./useAnnouncer";
import { useEngine } from "./useEngine";
import { useFocusRequest } from "./useFocusRequest";
import { useSimulation } from "./useSimulation";
import { initialWorkload, workloadReducer } from "./workloadReducer";

const FIELD_ORDER: FieldName[] = ["id", "arrival", "burst", "priority"];
const SINGLE_COLUMN_QUERY = "(max-width: 63.99rem)";

function createInitialWorkload() {
  return workloadReducer(initialWorkload(), { type: "load", processes: DEFAULT_EXAMPLE.processes });
}

function rowName(row: ProcessRow, index: number): string {
  return row.id.trim() || `row ${index + 1}`;
}

function resultSentence(algorithm: Algorithm, schedule: Schedule): string {
  return (
    `${ALGORITHM_NAME[algorithm]} schedule ready. ` +
    `Average waiting time ${formatAverage(schedule.averageWaiting)} ticks, ` +
    `average turnaround time ${formatAverage(schedule.averageTurnaround)} ticks, ` +
    `makespan ${formatTicks(schedule.makespan)} ticks.`
  );
}

/**
 * Everything the page needs: the workload, the algorithm, the last result and the handlers
 * that connect them. It parses fields and relays the core's answers; it never schedules.
 */
export function useSchedLab() {
  const { engine, retry } = useEngine();
  const [workload, dispatch] = useReducer(workloadReducer, undefined, createInitialWorkload);
  const [algorithm, setAlgorithm] = useState<Algorithm>("FCFS");
  const [profile, setProfile] = useState<Profile>("SINGLE_CORE");
  const [heuristic, setHeuristic] = useState<Placement>("FIRST_AVAILABLE");
  const simulation = useSimulation(engine);
  const { message: liveMessage, announce } = useAnnouncer();
  const requestFocus = useFocusRequest();

  const { rows } = workload;
  const parsed = useMemo(() => parseWorkload(rows), [rows]);
  const view = deriveResultView(simulation.record, workload.version);

  const coreErrors = useMemo(() => {
    const outcome = simulation.record?.outcome;
    return view.kind === "rejected" && outcome && !outcome.ok
      ? mapCoreErrors(outcome.errors, rows)
      : { fieldIssues: [], wholeInput: [] };
  }, [view.kind, simulation.record, rows]);

  // Messages that may be shown now: a field's own problem after it was left or after Run, and
  // anything the core reported for the run on screen.
  const issues = useMemo(() => {
    const shown = new Map<string, string>();
    if (!parsed.ok) {
      for (const issue of parsed.issues) {
        const key = fieldKey(issue.rowKey, issue.field);
        if (workload.attempted || workload.touched[key]) shown.set(key, issue.message);
      }
    }
    for (const issue of coreErrors.fieldIssues) shown.set(fieldKey(issue.rowKey, issue.field), capitalize(issue.message));
    return shown;
  }, [parsed, workload.attempted, workload.touched, coreErrors]);

  const summary = useMemo(() => {
    const items: SummaryItem[] = [];
    if (workload.attempted || view.kind === "rejected") {
      rows.forEach((row, index) => {
        for (const field of FIELD_ORDER) {
          const message = issues.get(fieldKey(row.key, field));
          if (message !== undefined) items.push({ rowKey: row.key, field, where: row.id.trim() ? `Row ${index + 1} (${row.id.trim()})` : `Row ${index + 1}`, message });
        }
      });
    }
    return { items, wholeInput: coreErrors.wholeInput.map(capitalize) };
  }, [rows, issues, workload.attempted, view.kind, coreErrors.wholeInput]);

  const edit = useCallback(
    (rowKey: number, field: FieldName, value: string) => {
      if (view.kind === "schedule") announce("The workload changed, so the result was cleared. Run the simulation again.");
      dispatch({ type: "edit", rowKey, field, value });
    },
    [view.kind, announce],
  );

  const blurField = useCallback(
    (rowKey: number, field: FieldName) => {
      dispatch({ type: "touch", rowKey, field });
      const index = rows.findIndex((row) => row.key === rowKey);
      const row = rows[index];
      if (!row || field === "id") return;
      const problem = parseRowField(row, field as NumericField);
      // Half a second lets the screen reader finish announcing the field that just took focus.
      if (problem) announce(`${rowName(row, index)}, ${problem}`, 500);
    },
    [rows, announce],
  );

  const addRow = useCallback(() => {
    requestFocus(fieldElementId(workload.nextKey, "id"));
    dispatch({ type: "add" });
    announce(`Added row ${rows.length + 1}.`);
  }, [requestFocus, workload.nextKey, rows.length, announce]);

  const removeRow = useCallback(
    (rowKey: number) => {
      const index = rows.findIndex((row) => row.key === rowKey);
      const row = rows[index];
      if (!row) return;
      // Focus must not fall to <body>: go to the next row's Remove button, else the previous one's.
      const neighbour = rows[index + 1] ?? rows[index - 1];
      requestFocus(neighbour ? `remove-${neighbour.key}` : "process-count");
      dispatch({ type: "remove", rowKey });
      announce(`${describeRemoval([{ index, row }])} Undo is available.`);
    },
    [rows, requestFocus, announce],
  );

  const commitCount = useCallback(
    (count: number) => {
      if (count < rows.length) {
        const removed = rows.slice(count).map((row, i) => ({ index: count + i, row }));
        announce(`${describeRemoval(removed)} Undo is available.`);
      } else if (count > rows.length) {
        announce(`Added ${count - rows.length} rows.`);
      }
      dispatch({ type: "setCount", count });
    },
    [rows, announce],
  );

  const undo = useCallback(() => {
    const removed = workload.undo?.removed;
    const first = removed?.[0];
    if (!removed || !first) return;
    dispatch({ type: "undo" });
    requestFocus(fieldElementId(first.row.key, "id"));
    announce(removed.length === 1 ? `Restored ${rowName(first.row, first.index)}.` : `Restored ${removed.length} rows.`);
  }, [workload.undo, requestFocus, announce]);

  const loadExample = useCallback(
    (example: ExampleWorkload) => {
      dispatch({ type: "load", processes: example.processes });
      announce(`Loaded ${example.label}. The table was replaced.`);
    },
    [announce],
  );

  const reset = useCallback(() => {
    dispatch({ type: "load", processes: DEFAULT_EXAMPLE.processes });
    setAlgorithm("FCFS");
    setProfile("SINGLE_CORE");
    setHeuristic("FIRST_AVAILABLE");
    simulation.clear();
    announce("Reset to the T1 example with FCFS. No result yet.");
  }, [simulation, announce]);

  const changeAlgorithm = useCallback(
    (next: Algorithm) => {
      setAlgorithm(next);
      // Only a result that is on screen is recomputed; otherwise the choice waits for Run.
      if (view.kind !== "schedule" || !parsed.ok) return;
      const record = simulation.run(parsed.processes, next, workload.version, profile, heuristic);
      if (record?.outcome.ok) announce(resultSentence(next, record.outcome.schedule));
    },
    [view.kind, parsed, simulation, workload.version, profile, heuristic, announce],
  );

  function changeTopology(nextProfile: Profile, nextHeuristic: Placement) {
    setProfile(nextProfile);
    setHeuristic(nextHeuristic);
    if (view.kind !== "schedule" || !parsed.ok) return;
    const record = simulation.run(parsed.processes, algorithm, workload.version, nextProfile, nextHeuristic);
    if (record?.outcome.ok) announce(resultSentence(algorithm, record.outcome.schedule));
  }

  const run = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (engine.status !== "ready") return;

      const count = parseCount(String(new FormData(event.currentTarget).get("process-count") ?? ""));
      if (!count.ok) {
        simulation.clear();
        const field = event.currentTarget.elements.namedItem("process-count");
        if (field instanceof HTMLInputElement) {
          field.setCustomValidity(count.message);
          field.reportValidity();
          field.setCustomValidity("");
        }
        requestFocus("process-count");
        announce(count.message);
        return;
      }

      const submitted = count.value === rows.length
        ? workload
        : workloadReducer(workload, { type: "setCount", count: count.value });
      if (submitted !== workload) dispatch({ type: "setCount", count: count.value });
      const input = submitted === workload ? parsed : parseWorkload(submitted.rows);

      if (!input.ok) {
        dispatch({ type: "attempt" });
        const first = input.issues[0];
        if (first) requestFocus(fieldElementId(first.rowKey, first.field));
        announce(`${input.issues.length} ${input.issues.length === 1 ? "problem" : "problems"} found. The first one has focus.`, 700);
        return;
      }

      const record = simulation.run(input.processes, algorithm, submitted.version, profile, heuristic);
      if (!record) return;
      if (record.outcome.ok) {
        announce(resultSentence(algorithm, record.outcome.schedule));
        // On a phone the figure sits below the form, out of sight, so bring it into view.
        if (window.matchMedia(SINGLE_COLUMN_QUERY).matches) document.getElementById("figure")?.scrollIntoView();
        return;
      }

      dispatch({ type: "attempt" });
      const mapped = mapCoreErrors(record.outcome.errors, submitted.rows);
      const first = mapped.fieldIssues[0];
      requestFocus(first ? fieldElementId(first.rowKey, first.field) : "problems-heading");
      const total = record.outcome.errors.length;
      announce(`The simulator rejected the workload: ${total} ${total === 1 ? "problem" : "problems"}.`, 700);
    },
    [engine.status, parsed, simulation, algorithm, profile, heuristic, workload, rows, requestFocus, announce],
  );

  return {
    engine,
    retryEngine: retry,
    liveMessage,
    rows,
    issues,
    summary,
    removed: workload.undo?.removed ?? null,
    algorithm,
    profile,
    heuristic,
    changeProfile: (next: Profile) => changeTopology(next, heuristic),
    changeHeuristic: (next: Placement) => changeTopology(profile, next),
    view,
    resultKey: `${workload.version}-${algorithm}-${profile}-${heuristic}`,
    focusField: (rowKey: number, field: FieldName) => requestFocus(fieldElementId(rowKey, field)),
    announce,
    edit,
    blurField,
    addRow,
    removeRow,
    commitCount,
    undo,
    loadExample,
    reset,
    changeAlgorithm,
    run,
    clearResult: simulation.clear,
  };
}
