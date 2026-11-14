# P0 verification, 13 November 2026

This records simulator acceptance, not completion of the final assignment report.
The instructor's PDF is not in this public repository; the submission checklist in
`plan.md` section 12 is the available rubric summary.

## Executed checks

PowerShell, Windows, MSVC/Visual Studio 2026, Node 22.22.3, Chromium via Playwright
1.65.0, and Emscripten 7.0.0 for the committed module:

| Command | Observed result |
|---|---|
| `cmake -S core -B build/core` | exit 0 |
| `cmake --build build/core --config Release` | exit 0 |
| `ctest --test-dir build/core --output-on-failure -C Release` | 13/13 CTest entries passed |
| `npm install` in `web/` | exit 0; zero audit vulnerabilities reported |
| `npm test` | 319/319 tests, 13 files passed, including native/WASM parity |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 |
| `npm run test:e2e` | 13/13 Chromium tests passed against the production build |
| frontend skill `scripts/check_ui.mjs`, 375/1280 px | zero page overflow, console errors or DOM issues; all 23 visited focus stops visibly focused |

The checker lives at `.claude/skills/senior-frontend/scripts/check_ui.mjs`; see the
README for the complete command. axe-core was not installed, so its optional audit
was not run. The browser build reports that `node:module` in Emscripten's Node path
is externalized. Chromium exercised the browser path successfully. Playwright's
server processes also print a `NO_COLOR`/`FORCE_COLOR` environment warning. These
are build/runner messages; normal application browser-console checks were clean.

## Regressions reproduced before repair

- Bridge F1: safe individual timestamps had a wrong average after floating-point
  accumulation. Native and WASM tests failed with the reported input. Integer
  quotient/remainder accumulation fixes the sum; independent review additionally
  caught and regression-protected final rounding above 2^53 on the native path.
- Bridge F2: non-string algorithms threw an embind exception. All seven malformed
  algorithm tests failed before conversion moved behind JS value validation.
- Bridge F3: a 3,000,000-character ID aborted WASM with OOM. It now returns a field
  error before copying, and a following small call succeeds. A 1024-unit Unicode
  ID is accepted; 1025 units are rejected.
- Count draft: clicking Run with `100000` in the count field produced results from
  the old three-row table. The Playwright test failed, then passed after Run checked
  the draft using the existing count parser. Editing the count clears old results.
- Count reset: Reset left an invalid `no` draft and its error on screen. The test
  failed before reset/load and table-size changes reset that editor state.
- Mobile Run: showing an inline numeric error on blur moved the button between
  pointer-down and pointer-up. Event tracing showed the release/click land on the
  Run section heading, with no form submission. Both 375 px theme cases failed.
  Independent review found the same problem with Add and algorithm controls, and
  with count-field blur resizing before Run/Add/Load. Blur now defers feedback when
  focus moves to an action. Counts apply on Enter or Run, and Run uses the exact
  resized editor rows and version. Regressions for direct count-to-0/1 Run and
  field/count-to-Add/algorithm/Load all failed first and now pass.
- Idle hit area: the unfilled idle rectangle did not receive hover or tap events
  inside its outline. Both interactions timed out before the rectangle received
  an explicit pointer hit area, preserving its unfilled dashed appearance.
- Undo cap: growing back to 200 rows after removing 199, then Undo, restored 399
  rows; repetitions could grow the editor without bound. Both add-button and
  count-growth regressions failed first. Adding rows now expires the previous
  removal Undo; ordinary field edits preserve it. No current rows are truncated.

PR 2 was independently reviewed and merged at `393670d`, with fixes `1c168a7` and
`cc1af32`. Its reviewer independently reran 13 CTest entries, 177 bridge Vitest
tests, typecheck, a byte-identical WASM rebuild, 600 native schedules and 10,096
boundary/recovery assertions. See [the review](https://github.com/Hawksprey420/SchedLab/pull/2#issuecomment-6857283446).

## Browser coverage

The acceptance matrix runs at 375 and 1280 CSS pixels in both light and dark
themes. All four cases checked T1 and T2 under FCFS and SJF against the plan's
intervals, every process metric in input order, and the displayed two-decimal
averages. It also exercised theme switching, idle intervals and dashed idle bars,
field edits clearing results, removal/Undo with focus restoration, arrow-key bar
navigation, hover readouts and Escape dismissal.

Invalid negative arrival, empty burst, duplicate PID, `IDLE` and fractional burst
each produced inline errors, focused the invalid field and displayed no result.
Zero processes and 101 otherwise-valid processes showed the core's whole-input
errors. Long PIDs wrapped without page overflow. One hundred processes with bursts
of 1,000,000 produced 100 results and a makespan of 100,000,000 under both algorithms;
the axis remained bounded and the chart no wider than 3200 px. No tested state
produced horizontal page scroll. The chart and results table have their own
scrolling frames.

Separate tests exercised keyboard Run activation, count-draft errors and Reset,
WASM loading with Run disabled while editing remained possible, injected WASM
load failure, successful Retry preserving edits, and emulated phone touch readouts.
The failure test deliberately rejects `WebAssembly.instantiate` before restoring
the real factory; it does not substitute fake scheduling results.

For the offline check, every external-origin request was blocked in fresh browser
contexts; the app loaded all fonts/assets and completed the matrix with zero
external requests. The loopback HTTP server stayed available. This verifies local
operation without internet dependencies, not an installable/service-worker PWA.

Fresh screenshots of T2 SJF were generated and visually inspected:

| Width | Light | Dark |
|---|---|---|
| 375 px | [screenshot](screenshots/p0-375-light.png) | [screenshot](screenshots/p0-375-dark.png) |
| 1280 px | [screenshot](screenshots/p0-1280-light.png) | [screenshot](screenshots/p0-1280-dark.png) |

## Section 12 submission audit

FCFS/SJF, required inputs and validation, Gantt/idle output, per-process metrics,
averages, tick units, modular source, reproducible commands, local offline use and
actual program screenshots are covered by the checks above. Priority does not
affect scheduling and no simulated times are described as measured performance.

Still open for the final submission: the PDF explaining the algorithms with actual
implementation-function screenshots, embedding actual output screenshots, answering
all five conclusion questions, and the single group submission. No Intel/Arm or
native measurement enhancement has been implemented. `v0.1-required` is deliberately
untagged pending owner review; P1-P3 have not started.

Not verified: Firefox/Safari, physical touch hardware, screen-reader speech,
exhaustive allocation-failure injection, enormous malformed JS arrays, or a fully
disconnected operating system. The browser boundary's caps and chart display limits
are documented in the README. No deployment was performed.

Historical note (14 November 2026): the owner subsequently approved P0, merged it and tagged v0.1-required. The pre-approval status above is the original P0 record. Optional P2/P3 evidence is maintained in [extension verification](extension-verification.md); the required simulator remains the default.
