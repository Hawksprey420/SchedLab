# SchedLab

SchedLab is a single-core CPU scheduling simulator for an Operating Systems final
project. Enter processes, choose first-come, first-served (FCFS) or non-preemptive
shortest job first (SJF), and inspect the Gantt chart and per-process results.
Priority is recorded input; neither algorithm uses it to choose a process.
All simulation times are integer ticks, not measured CPU performance.

The browser runs the **C++20 core compiled to WebAssembly with Emscripten**. React
parses the editor fields and renders the core's answers through `SchedulerAdapter`;
there is no JavaScript scheduling implementation or fallback engine. The native CLI
uses the same core and text parser.

The optional architecture controls below the graded simulator select Intel-style
6 P + 4 E physical lanes or Arm-style 1 Prime + 3 Big + 4 LITTLE lanes. FCFS/SJF
queue order and lane placement are separate choices. The core returns all placements,
durations and metrics; the browser only renders them. Single core (graded) stays
the default and retains its original chart and metrics.

Hybrid results carry `SIMULATED` and `Experimental / simplified model` labels.
Burst becomes work units, and duration is ceil(work / lane rate) ticks. Rate and
energy assumptions appear beside the results. They are fictional teaching values,
not measurements of a CPU. See [hardware assumptions](docs/hardware-assumptions.md)
and [the hybrid contract](docs/hybrid-contract.md) for tie rules, the ten physical
Intel lanes versus sixteen logical processors, and the abstract energy index.

## Build and run

Prerequisites: Node.js with npm, CMake 3.20 or later, and a C++20 compiler for the
native tests. Verification on Windows used Node 22.22.3 and Visual Studio 2026/MSVC.
Use PowerShell on the owner's machine; Git Bash cannot fork there.

From the repository root:

```powershell
cmake -S core -B build/core
cmake --build build/core --config Release
Set-Location web
npm ci
npm run dev
```

Open the local URL Vite prints. For a production build:

```powershell
# From web/
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Keep the local server running. Dependencies must be installed before disconnecting
from the internet. The built app, bundled fonts, examples and embedded WASM are
served locally and need no external requests or backend. It is not a PWA: opening
`dist/index.html` directly with `file://` or visiting an unserved URL offline is not
supported. Keep the repository and installed dependencies for an offline rebuild.

The page opens with T1 in the editor. Run displays results; editing hides the old
result. Switching algorithms recomputes a displayed result. Reset loads T1 with
FCFS. Apply a process count with Enter or Run; a count draft does not resize the table
on blur. Adding rows or loading an example discards an unapplied
count. Removal offers one level of Undo, which expires when rows are added or an
example is loaded. Field edits preserve Undo. Focus a Gantt bar and use Left/Right, Home or End to inspect other
bars; Escape dismisses its readout. Hover and touch also expose exact intervals.

## Run every check

```powershell
# From the repository root
cmake -S core -B build/core
cmake --build build/core --config Release
ctest --test-dir build/core --output-on-failure -C Release
Set-Location web
npm ci
npx playwright install chromium  # Once, while connected to the internet
npm test
npm run typecheck
npm run build
npm run test:e2e
```

`npm test` includes native/WASM parity and fails if the native CLI has not been
built. Playwright builds the app and starts its own preview server on port 4173;
leave that port free. The tests cover both algorithms and themes at 375 and 1280
pixels, malformed input, count drafts, undo, keyboard/touch details, engine
loading/failure/retry, and 100 processes with a 100,000,000-tick makespan.

For the frontend skill's DOM, overflow, console and focus audit, start a preview
server on another port, then run:

```powershell
# From web/, with the preview server running on port 4174
node ../.claude/skills/senior-frontend/scripts/check_ui.mjs http://127.0.0.1:4174 --out .ui-check
```

Results and checked screenshots are described in [P0 verification](docs/p0-verification.md).

## Rebuild WebAssembly after changing core/

The generated `web/src/wasm/schedlab.mjs` is committed so normal web builds do not
require Emscripten. Never edit it by hand. After **any** core change, rebuild it,
rerun native and web tests, and commit the generated module with the source change:

```powershell
# From the repository root; Emscripten 7.0.0 was used for verification
# EMSDK defaults to $HOME\emsdk; set $env:EMSDK for another SDK location.
pwsh -NoProfile -File scripts/build-wasm.ps1
```

## Limits and project boundaries

- Valid schedules contain 1 to 100 processes. The editor permits up to 200 rows so
  it can show the core's count error; larger table requests are rejected locally.
- Editor arrival is 0 to 1,000,000 ticks, burst 1 to 1,000,000 ticks, and priority
  -1000 to 1000. Fractional, empty and overflowing numbers are rejected.
- IDs are trimmed by the core, must be nonempty and unique (case-sensitive), and
  cannot be `IDLE` in any letter case. The structured WASM boundary accepts at most
  1024 UTF-16 code units before trimming. The native core has no ID-length cap.
- The binding restricts integer inputs and returned timestamps to JavaScript's
  safe-integer range. Averages use floating point and are displayed to two decimals.
  The native core supports checked signed 64-bit times.
- The chart is capped at 3200 CSS pixels. Very short intervals have a minimum
  visible width of 2 pixels and labels may be shortened or omitted. Exact begin/end
  values remain available in the readout and text schedule. Colour/pattern pairs
  repeat after 49 processes; PIDs remain the identifier.
- Workloads are held in memory and reset on reload. Theme choice can persist in
  local storage; blocked storage does not prevent use.
- Chromium is verified. Firefox, Safari, physical touch devices and screen-reader
  speech output have not been tested. Accessibility checks do not establish full
  conformance.
- P0 is frozen at `v0.1-required`. The owner approved the optional P2/P3 work after
  that gate. Playback and comparison panels remain outside this extension.
  The assignment PDF report and five conclusion answers remain submission work.

The specification is [plan.md](plan.md). API details and deliberate refinements are
in [the core contract](docs/core-contract.md) and [the web contract](docs/web-contract.md).
Scheduling decisions belong only in `core/`; `web/` renders them, and any future
Windows-specific code belongs in `native/`.
