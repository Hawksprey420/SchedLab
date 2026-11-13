# Handoff to Codex (13 November 2026)

Claude Code stopped at about 94% usage on the owner's instruction. Codex now owns the work
to the P0 gate. Git and fresh verification outrank this note.

## Read before acting

1. `AGENTS.md` (rules: task branches, test first, explicit staging, Conventional Commits,
   no AI attribution trailers, PowerShell only because Git Bash cannot fork here).
2. `plans/checkpoint.md` (owner decisions; do not re-ask them).
3. `plan.md` sections 1, 4, 7, 8; `docs/core-contract.md`; `docs/web-contract.md`; `DESIGN.md`.
4. The Codex review comments on pull requests 1 and 2 (`gh pr view <n> --comments`).

## State at handoff

| Item | State |
|---|---|
| `master` | PR 1 merged (`954734b`): C++ core, CLI, 11 CTest cases |
| `feature/wasm-bridge` | PR 2 open. Verified by Claude: ctest 13 of 13, `npm test` 167 of 167, `tsc` clean. Codex review says CHANGES NEEDED (F1, F2, F3 below) |
| `feature/web-ui` (this worktree) | Branched from `feature/wasm-bridge`. Six UI commits, `d976f7d` to `186e03e`. Working tree clean. NOT verified by anyone but the implementer, who was stopped during its browser-check phase and never reported |
| Emscripten SDK | Installed at `C:\Users\Hawksprey\emsdk`; `pwsh -NoProfile -File scripts/build-wasm.ps1` |
| Review worktrees | `core-review` and `bridge-review` under `C:\Users\Hawksprey\orca\workspaces\SchedLab\` are finished and can be ignored |

Screenshots from the stopped implementer are in `web/.ui-check/` (git-ignored). Treat them
as stale until regenerated.

## Open findings from the PR 2 review

- **F1** incorrect averages for very large numbers.
- **F2** a non-string algorithm argument escapes validation.
- **F3** a very long ID makes the WebAssembly module abort (out of memory).

The full reproductions are in the PR 2 comment. Each fix needs a regression test that was
seen failing first. Core changes require rebuilding and recommitting
`web/src/wasm/schedlab.mjs`, and the parity test must still pass.

## Work remaining to the P0 gate, in order

1. On `feature/wasm-bridge`: fix F1 to F3, rerun ctest, rebuild the module, rerun
   `npm test` and typecheck, push, comment on PR 2, merge PR 2 into `master`.
2. On `feature/web-ui`: bring in the fixed bridge (merge `master`), then verify the UI
   from scratch. Do not trust the commit messages.
   - `cd web; npm install; npm test; npm run typecheck; npm run build; npm run test:e2e`
   - Check every item of the task below against the running app in a real browser at
     375 px and 1280 px, light and dark: T1 and T2 values from `plan.md` section 8 for
     both algorithms, idle bars, invalid input (negative arrival, empty burst, duplicate
     PID, `IDLE`, 1.5, over 100 processes), undo of row removal, keyboard-only use, no
     console errors, no sideways page scroll, 100 processes, makespan of 100,000,000.
   - The UI must never compute a schedule or metric itself; ID and count rules come from
     the core's errors (`docs/web-contract.md`, "Who validates what").
   - Fix defects with tests. Keep components small and logic in `web/src/lib/`.
3. Write `README.md`: what the project is, how to build and run it offline, how to run
   every test, which engine the browser uses (C++ through WebAssembly), known limits.
4. Open PR 3 (`feature/web-ui` into `master`) with changes, real test output and
   screenshots; review it against `plan.md` section 12; merge when clean.
5. Update `plans/checkpoint.md` with commits, results and one next action.
6. **Stop at the P0 gate.** Do not tag `v0.1-required` and do not start playback,
   comparison, hybrid lanes or the native Intel tool. The owner reviews first.

## UI task summary (the brief the stopped implementer was given)

One page, P0 only, React + TypeScript + Vite + Tailwind, SVG chart, no chart or UI
library, fonts bundled for offline use, direction from `DESIGN.md`:

- Header with the name as text and a working light/dark toggle.
- Workload table (PID, Arrival, Burst, Priority), a "Number of processes" field, add and
  remove rows with one-level undo, example workloads T1, T2 and a CPU-idle case loaded
  from `examples/*.json`, T1 on first load, a note that priority is not used by FCFS/SJF.
- Algorithm radio group with a one-sentence rule for each.
- Run and Reset. Editing a field hides the old result; changing the algorithm recomputes.
- Gantt figure: ruled axis with bounded tick count, idle bars dashed and labelled,
  colour + hatch pattern + PID label per process (stable by input position), details on
  hover, focus and touch, caption, plain-text schedule list below, sideways scroll inside
  the figure frame only.
- Results table in input order, averages to 2 decimals, makespan, units in ticks.
- States: engine loading, engine failed with retry, no result, field errors inline and
  announced, whole-input errors, long PIDs, 100 rows.
- Tests: Vitest for every helper, one Playwright end-to-end test, existing 167 tests.

## Experiments already done (do not repeat)

- Core passes under clang-cl 22 and MSVC AddressSanitizer (11 of 11, before the bridge).
- A scratch CPU Sets probe showed two efficiency classes on this i7-12650H, pinning
  works, P-class about 24% faster on one integer workload. It is not in the repository
  and P3 is not approved.
