# Extension verification

## P2 hybrid simulation, 14 November 2026

PowerShell on Windows with Visual Studio/MSVC, Node 22.22.3, Emscripten 7.0.0
and Chromium through Playwright 1.65.0. P0 was merged and tagged `v0.1-required`
before this extension. No new release tag or PDF report is part of this work.

| Command | Observed result |
|---|---|
| `cmake -S core -B build/core` | exit 0 |
| `cmake --build build/core --config Release` | exit 0 |
| `ctest --test-dir build/core --output-on-failure -C Release` | 15/15 passed, including all original 13 |
| `pwsh -NoProfile -File scripts/build-wasm.ps1` | exit 0; generated module rebuilt |
| `npm test` in web | 685/685 passed in 15 files, including all original 319 |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 |
| `npm run test:e2e -- --config .extension-config.ts` | 17/17 passed, including all original 13 |
| frontend skill `check_ui.mjs` at 375/1280 px | zero DOM issues, overflow or console errors; 24/24 default focus stops visible |

Port 4173 was already occupied. A temporary copy of the existing Playwright config
changed only the preview command and base URL to port 4175; tests were unchanged.
The scratch config is not committed. Normal reproduction uses `npm run test:e2e`
with port 4173 free. A separate preview on 4176 supplied browser audits.

The new browser matrix runs at 375 and 1280 px in light and dark themes. It switches
single core to Intel, checks ten lanes and assumptions, changes fastest/energy-first
placement and asserts the core's 21/14 energy indices for T1, switches to eight Arm
lanes and SJF, edits/reruns, then returns to single core and resets. External-origin
requests were blocked. All existing P0 cases passed unchanged.

Eight screenshots (both profiles, widths and themes) were generated for inspection.
Inspected phone/desktop and light/dark examples show lane labels, process colours and
patterns, shared tick axes, scrollable tables, experimental labels and assumptions.
Zero DOM issues, page overflow and console errors in all eight audit states.
The generic focus checker flags SVG groups because it checks CSS outline/shadow;
SchedLab indicates bar focus with its active shape stroke. A direct browser check
confirmed `data-active=true`, accent stroke `rgb(179,71,0)`, and stroke width 3px.
This is the existing chart focus convention, reused in hybrid mode.

Tests were written before implementation: native hybrid compilation failed on the
missing API; structured WASM tests failed on missing exports; the browser test
failed at the missing Topology control; the view-helper test failed at its missing
module. Fixtures include hand-computed multiple-job placements/metrics for each
profile, algorithm and heuristic, generated schedule invariants, exact baseline
single-core equivalence, invalid settings/processes, arithmetic overflow and unsafe
JS output. Native/WASM text parity includes hybrid generated and invalid workloads.

Not verified: Firefox/Safari, physical touch devices, screen-reader speech,
exhaustive allocation failures or a disconnected OS. Optional axe-core is absent.
The normal Vite node:module externalization and Playwright colour-environment
warnings remain; tested application browser consoles are clean.

Independent review and PR result will be recorded below before merge.

### Independent P2 review

The independent reviewer rebuilt the native project and reproduced 15/15 CTest,
685/685 Vitest, typecheck/build, 17/17 Playwright and an identical WASM module
(SHA256 `9E2F089AF7772CB344322C4D32AE89B9DEC977D0D0275A06A2949F52E5278896`).
A separate tick-by-tick oracle matched 720/720 generated setting combinations;
16 extra manual/boundary cases passed. The reviewer visually inspected all eight
profile/width/theme screenshots and repeated DOM, overflow, console and focus checks.

The reviewer found one unit-guidance error: the editor still said burst was ticks
in hybrid mode. A new browser assertion failed before correction. The editor now
receives the mode, says burst is work units for either heterogeneous profile, and
restores the exact original ticks sentence in single-core mode. The new matrix
asserts these states. No scheduling or generated-WASM change was needed for this fix.
See [PR 4](https://github.com/Hawksprey420/SchedLab/pull/4) and
[the initial independent review](https://github.com/Hawksprey420/SchedLab/pull/4#pullrequestreview-5900928551).

### P2 integration

[PR 4](https://github.com/Hawksprey420/SchedLab/pull/4) was independently approved
and merged at `12a319935dabbbb821ae2bc2020ad1d181b0756a`.
The [final review](https://github.com/Hawksprey420/SchedLab/pull/4#pullrequestreview-5900958284)
repeated all 15/685/17 tests and types/build, confirmed identical WASM, and verified
all eight browser states with corrected unit guidance. Temporary evidence was
removed from tracked files. No P0 assertions were changed.

## P3 native measurement and offline import, 14 November 2026

The Windows experiment is a separate CMake project. It does not link into core or
the browser. Core source and generated WASM did not change during P3.

| Command | Observed result |
|---|---|
| `cmake -S core -B build/core` and Release build | exit 0 |
| `ctest --test-dir build/core --output-on-failure -C Release` | 15/15 passed |
| `cmake -S native/windows-intel -B build/intel` and Release build | exit 0; warning-free MSVC build |
| `ctest --test-dir build/intel --output-on-failure -C Release` | 9/9 passed |
| `npm test` in web | 764/764 passed, 17 files |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 |
| `npx playwright test --config .extension-config.ts` | 22/22 passed |
| frontend `check_ui.mjs`, local preview 4176 | no DOM issues, overflow or console errors; 28/28 default focus stops visible |

The temporary Playwright config changes only the port to 4175 as described above.
Normal reproduction is `npm run test:e2e` with port 4173 free. Native tests cover
arguments, fake CPU classes/allocations, statistics, JSON escaping/locale, deterministic
workload and bounds, malformed variable-size CPU Set records, real workload-free
detect JSON, measurement boundaries, and saved sample consistency. The worker stop
path is tested with delayed atomic cancellation; manual delivery of console Ctrl+C
was not driven. The tests do not require two classes and do not collect full
benchmarks automatically. A 20 ms cancellation probe starts and stops a worker.

The file importer matrix covers 375/1280 px in both light and dark themes, blocked
external-origin requests, malformed JSON, a >1 MB file, schema/mode rejection,
real sample buttons, file import, clear/recovery, and a literal HTML-like note that
never becomes an element. It verifies measured milliseconds remain in their own
panel while the graded simulation renders ticks. A separate case forces file-read
failure, pauses a read, loads a sample, then releases the old read and confirms it
cannot replace the sample. A new off-class warning assertion failed before its
conditional display was added. Original P0 and P2 assertions remain unchanged.

Four native-panel screenshots were generated and visually inspected, with clean
DOM/console/overflow and keyboard-focus audits:

| Width | Light | Dark |
|---|---|---|
| 375 px | [screenshot](screenshots/p3-375-light.png) | [screenshot](screenshots/p3-375-dark.png) |
| 1280 px | [screenshot](screenshots/p3-1280-light.png) | [screenshot](screenshots/p3-1280-dark.png) |

### Real local captures

Executed sequentially against the same Release executable after stopping this
session's browser/build/test load, with one warm-up before three measured runs:

```powershell
build/intel/Release/schedlab-intel.exe detect --output examples/sample-native-topology.json
build/intel/Release/schedlab-intel.exe bench --class performance --repeats 3 --output examples/sample-native-trace-performance.json
build/intel/Release/schedlab-intel.exe bench --class efficient --repeats 3 --output examples/sample-native-trace-efficient.json
```

All three exited 0. Machine: 12th Gen Intel Core i7-12650H; active power scheme:
Balanced. Capture timestamps: 2026-11-14T03:20:33Z and 03:20:36Z. Runtime detection
found group 0 logical processors 0–11 in class 1 (CPU Set IDs 256–267), and 12–15
in class 0 (IDs 268–271). Parking differed between snapshots. No exclusive
allocations were reported. Classes were discovered at runtime, not assumed in code.

| Requested class | Per-run elapsed ms | Median ms | Min–max ms | Requested-class samples |
|---|---|---:|---|---|
| performance | 678.4595, 668.6926, 689.6459 | 678.4595 | 668.6926–689.6459 | 382/382 each run |
| efficient | 838.2289, 795.0416, 828.3228 | 828.3228 | 795.0416–838.2289 | 365/382, 310/382, 365/382 |

Every measured run reports successful CPU Set requests and checksum `51001733377`,
matching warm-up. The efficient requests nevertheless sampled other classes. The
JSON preserves all observations and the UI prominently warns that these timings
are not an isolated class comparison. The samples are previously collected on
this specific machine, not a guaranteed P/E speed ratio. They are never called
FCFS/SJF results or converted to ticks. CPU Sets are a scheduling constraint;
Intel Thread Director was neither read nor reimplemented.

Uncontrolled: temperature, frequencies, SMT interactions, power limits, battery/AC
state and background applications. Samples are intermittent, not continuous class
tracking. No measured power/energy or clean hardware isolation was established.
No additional full benchmarks were collected. Single-class skip is covered with
fake topology; this two-class machine cannot exercise that real-hardware branch.
Artificial failures of every Win32 metadata/QPC API and topology growth races were
not injected; error/retry/cleanup paths are explicit. Browser limits remain as in
P2: Chromium only, no physical touch/screen-reader speech or optional axe audit.
No deployment, new release tag, or PDF report was created.
