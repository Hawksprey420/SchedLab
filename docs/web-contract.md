# Web and WebAssembly contract

How the browser reaches the C++ core. The UI never computes a schedule; it parses text
fields, calls the adapter, and draws what comes back.

## Layers

```text
React components  ->  SchedulerAdapter (TypeScript interface)
                          |
                      wasmAdapter  ->  schedlab.mjs (Emscripten, wasm embedded)
                                           |
                                       core/src/wasm_bindings.cpp  ->  schedlab_core
```

## Generated module

`scripts/build-wasm.ps1` compiles `core/` with Emscripten and writes one file,
`web/src/wasm/schedlab.mjs` (ES module, `MODULARIZE`, `EXPORT_ES6`, `SINGLE_FILE` so the
wasm binary is embedded, `ENVIRONMENT=web,node`). The file is committed so the web app
builds and runs on a machine without the Emscripten SDK. It is generated output: never
edit it by hand, rebuild it whenever `core/` changes, and let the parity test catch drift.

## Binding surface (`core/src/wasm_bindings.cpp`, embind)

```ts
// Structured call used by the UI.
simulate(
  processes: { id: string; arrival: number; burst: number; priority: number }[],
  algorithm: "FCFS" | "SJF_NON_PREEMPTIVE",
): SimulationOutcome;

// Text call used by the parity test: same input and output as schedlab-cli.
runText(algorithm: "fcfs" | "sjf", input: string): { exitCode: number; stdout: string };
```

JavaScript numbers are doubles. The binding rejects, per field and with the core's
`ValidationError` shape, any `arrival`, `burst` or `priority` that is not a finite
integer inside the destination type's range, and any unknown algorithm name, before it
builds `schedlab::Process` values. It then calls `validate` and `simulate_single_core`.
No C++ exception may cross into JavaScript.

`runText` shares its line parser with `schedlab-cli` (one function in the core library),
so the two cannot drift.

## TypeScript types (`web/src/models/types.ts`)

```ts
type Algorithm = "FCFS" | "SJF_NON_PREEMPTIVE";

interface ProcessInput { id: string; arrival: number; burst: number; priority: number }

interface Segment { coreId: string; processId: string; idle: boolean; begin: number; end: number }

interface ProcessResult extends ProcessInput {
  start: number; completion: number; waiting: number; turnaround: number; response: number;
}

interface Schedule {
  segments: Segment[];
  results: ProcessResult[];      // input order
  averageWaiting: number;
  averageTurnaround: number;
  makespan: number;
}

interface ValidationError {
  processIndex: number | null;   // null = whole input
  field: "id" | "arrival" | "burst" | "priority" | "processes" | "algorithm";
  message: string;
}

type SimulationOutcome =
  | { ok: true; schedule: Schedule }
  | { ok: false; errors: ValidationError[] };

interface SchedulerAdapter {
  simulate(processes: ProcessInput[], algorithm: Algorithm): SimulationOutcome;
}
```

`loadWasmAdapter(): Promise<SchedulerAdapter>` (`web/src/bridge/wasmAdapter.ts`) loads the
module once. The UI shows a loading state until it resolves and an error state if it
rejects.

## Who validates what

| Check | UI boundary | Core |
|---|---|---|
| Field is present, a base-10 integer, no fraction | yes (text to number) | yes (binding) |
| `arrival` 0 to 1,000,000; `burst` 1 to 1,000,000; `priority` -1000 to 1000 | yes | sign and overflow only |
| ID nonempty, not `IDLE`, unique; count 1 to 100 | shows the core's message | yes, single source |

The UI limits keep every sum far below 2^53, so JavaScript numbers stay exact. The UI
does not reimplement the ID and count rules: it maps the core's errors to fields by
`processIndex` and `field`.

## Parity test

`web/tests/parity.test.ts` (Vitest, Node) runs every `core/tests/cli/*.txt` fixture and a
few generated workloads through both the native `schedlab-cli` executable and
`runText`, and requires identical stdout and exit codes. It fails, not skips, when the
native executable has not been built.
