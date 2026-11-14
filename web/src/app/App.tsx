import { AlgorithmSelector } from "../components/AlgorithmSelector";
import { EngineStatus } from "../components/EngineStatus";
import { ErrorSummary } from "../components/ErrorSummary";
import { FigureSection } from "../components/FigureSection";
import { Header } from "../components/Header";
import { LiveRegion } from "../components/LiveRegion";
import { ProcessEditor } from "../components/ProcessEditor";
import { ResultsSection } from "../components/ResultsSection";
import { RunControls } from "../components/RunControls";
import { TopologySelector } from "../components/TopologySelector";
import { HardwareTraceImport } from "../components/HardwareTraceImport";
import { EXAMPLES } from "../lib/examples";
import { useSchedLab } from "../state/useSchedLab";

/**
 * Composition only: all state and behaviour live in useSchedLab. The DOM order is the reading
 * order (workload, algorithm, run, figure, results); on wide screens the workload sits in its
 * own column beside the rest, so Run and the figure are visible next to the table.
 */
export function App() {
  const app = useSchedLab();

  return (
    <div className="mx-auto max-w-[88rem] px-4 pb-16 sm:px-6 lg:px-10">
      <Header />
      <main>
        <EngineStatus engine={app.engine} onRetry={app.retryEngine} />
        {/* noValidate: the checks are the app's own, and Run moves focus to the first problem itself. */}
        <form noValidate onSubmit={app.run} className="mt-8 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,27rem)_minmax(0,1fr)]">
          <div className="min-w-0">
            <ProcessEditor
              workUnits={app.profile !== "SINGLE_CORE"}
              rows={app.rows}
              issues={app.issues}
              removed={app.removed}
              examples={EXAMPLES}
              onEdit={app.edit}
              onBlurField={app.blurField}
              onAdd={app.addRow}
              onRemove={app.removeRow}
              onCommitCount={app.commitCount}
              onInvalidCount={app.announce}
              onEditCount={app.clearResult}
              onUndo={app.undo}
              onLoadExample={app.loadExample}
            />
          </div>
          <div className="min-w-0 space-y-10">
            <AlgorithmSelector value={app.algorithm} onChange={app.changeAlgorithm} />
            <div>
              <RunControls engineReady={app.engine.status === "ready"} onReset={app.reset} />
              <ErrorSummary items={app.summary.items} wholeInput={app.summary.wholeInput} onGoTo={app.focusField} />
            </div>
            <FigureSection view={app.view} resultKey={app.resultKey} />
            <ResultsSection view={app.view} />
          </div>
        </form>
        <TopologySelector profile={app.profile} heuristic={app.heuristic} onProfile={app.changeProfile} onHeuristic={app.changeHeuristic} />
        <HardwareTraceImport />
      </main>
      <LiveRegion message={app.liveMessage} />
    </div>
  );
}
