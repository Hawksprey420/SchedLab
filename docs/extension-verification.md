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
