import { useRef, useState } from "react";
import type { HardwareTrace } from "../models/hardwareTrace";
import { MAX_TRACE_BYTES, parseHardwareTrace } from "../lib/hardwareTrace";
import { HardwareTracePanel } from "./HardwareTracePanel";

const samples = import.meta.glob<string>("../../../examples/sample-native-trace-*.json", { query: "?raw", import: "default", eager: true });
type ImportState = {kind:"empty"} | {kind:"loading"} | {kind:"error"; message:string} | {kind:"ready"; trace:HardwareTrace};

export function HardwareTraceImport() {
  const [state, setState] = useState<ImportState>({kind:"empty"});
  const request = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  function accept(source: string) {
    const outcome = parseHardwareTrace(source);
    setState(outcome.ok ? {kind:"ready",trace:outcome.trace} : {kind:"error",message:outcome.error});
  }
  async function readFile(file: File | undefined) {
    const id = ++request.current;
    if (!file) return;
    if (file.size > MAX_TRACE_BYTES) {
      setState({kind:"error",message:"Trace exceeds the 1 MB size limit. Choose a smaller native trace."});
      return;
    }
    setState({kind:"loading"});
    try {
      const source = await file.text();
      if (id === request.current) accept(source);
    } catch {
      if (id === request.current) setState({kind:"error",message:"Could not read the file. Choose it again or load a sample."});
    }
  }
  function clear() {
    ++request.current;
    if (fileInput.current) fileInput.current.value = "";
    setState({kind:"empty"});
  }
  return (
    <section aria-labelledby="hardware-heading" className="mt-10 border-t border-rule pt-4">
      <h2 id="hardware-heading" className="font-serif text-xl font-semibold">Optional hardware trace</h2>
      <p id="trace-help" className="mt-1 text-sm text-ink-muted">Import a local schedlab-intel JSON file (up to 1 MB). Files stay in this page; nothing is uploaded. Samples were previously collected on this specific machine.</p>
      <form onSubmit={e => e.preventDefault()} aria-label="Hardware trace import" className="mt-4 space-y-3">
        <label htmlFor="hardware-file" className="block text-sm font-medium">Import hardware trace</label>
        <input ref={fileInput} id="hardware-file" name="hardware-trace" type="file" accept=".json,application/json" aria-describedby="trace-help" onChange={e => { void readFile(e.target.files?.[0]); }} className="block min-h-11 w-full min-w-0 rounded-control border border-ink-muted p-2 text-sm" />
        <div className="flex flex-wrap gap-2">
          {(["performance","efficient"] as const).map(name => <button key={name} type="button" onClick={() => {
            ++request.current;
            if (fileInput.current) fileInput.current.value = "";
            const source = samples[`../../../examples/sample-native-trace-${name}.json`];
            if (source) accept(source);
            else setState({kind:"error",message:"The sample is unavailable. Choose a native trace file."});
          }} className="min-h-11 rounded-control border border-ink px-3 text-sm font-medium hover:bg-surface">Load {name} sample</button>)}
          <button type="button" onClick={clear} className="min-h-11 rounded-control border border-ink px-3 text-sm font-medium hover:bg-surface">Clear imported trace</button>
        </div>
      </form>
      {state.kind === "loading" && <p role="status" aria-busy="true" className="mt-4">Reading local trace…</p>}
      {state.kind === "error" && <p role="alert" className="mt-4 text-danger">{state.message}</p>}
      {state.kind === "empty" && <p className="mt-4 text-sm text-ink-muted">No hardware trace loaded. Choose a file or load a previously collected sample.</p>}
      {state.kind === "ready" && <><p role="status" className="mt-4 text-sm">Native trace loaded.</p><HardwareTracePanel trace={state.trace} /></>}
    </section>
  );
}
