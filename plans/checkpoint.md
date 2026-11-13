# Checkpoint

**Goal:** P0 software acceptance complete for owner review: FCFS and non-preemptive
SJF, C++/WebAssembly, React input/validation, Gantt chart and metrics. Stop here;
`v0.1-required` is deliberately untagged and P1-P3 have not started.

## Owner decisions (13 November 2026)

- GitHub repository `Hawksprey420/SchedLab` is public; one pull request per workstream.
- Browser engine is the C++ core through Emscripten/WASM, not the TypeScript fallback.
- Stop at the P0 gate for owner review before P1-P3.
- The owner's agent builds the C++ core that `plan.md` section 9 suggested for Lawrence;
  no separate Lawrence review is required.
- Commits carry no AI attribution trailers.
- Cheaper models do the implementation and review; Codex and Antigravity may be used as
  independent reviewers when their work is checked.
- Web UI: plan stack only (React, TypeScript, Vite, Tailwind, SVG), built with the
  modern-web-guidance, senior-frontend, frontend-design and antislop skills, antislop
  applied during the work. Direction: textbook / print-ready (`DESIGN.md`). Gantt
  processes use colour, pattern and label.
- Code must stay modular and maintainable; docs follow the antislop copy rules.

## State

| Task | Branch | Status |
|---|---|---|
| Scaffold, plan, agent rules, skills | `feature/core-fcfs-sjf` | merged (PR 1) |
| C++ core, validation, metrics, CLI, T1-T8 | `feature/core-fcfs-sjf` | merged (PR 1), `954734b` |
| WASM bridge and parity test | `feature/wasm-bridge` | independently reviewed; PR 2 merged at `393670d` |
| Web UI (P0) | `feature/web-ui` | PR 3 independently approved; final software/evidence head `393a195` |

## Verified commits and decisions

- Bridge fixes `1c168a7`, `cc1af32`: exact aggregate averages and native rounding,
  non-string algorithm errors, bounded structured IDs, regenerated WASM module.
- UI fixes `0ca83b9`, `ede73d3`, `368493b`, `6d9aff6`: count drafts/reset, mobile
  action clicks, idle hover/touch hit area, and bounded removal Undo. Count applies
  on Enter or Run; adding rows expires removal Undo, while field edits preserve it.
- Engine recovery/touch tests `1fcdc0d`; README, evidence and four inspected
  screenshots updated through `393a195`. Each defect has a regression seen fail first.
- Scheduling and metrics remain in `core/`; the UI only parses fields and renders
  adapter output. Structured IDs are capped at 1024 UTF-16 units before WASM copying.

## Latest verified result

At `393a195`, both implementer and independent reviewer observed: native configure
and Release build exit 0; **13/13 CTest entries**, **319/319 Vitest tests in 13 files**,
typecheck/build exit 0, and **13/13 Chromium Playwright tests**. The checker reports
zero console errors, DOM issues or page overflow at 375/1280 px, with all 23 visited
focus stops visibly focused. Both themes, T1/T2 under both algorithms, invalid
input, idle hover/touch, keyboard/Undo, engine loading/failure/retry, and 100 processes
with a 100,000,000-tick makespan passed. External requests were blocked while the
local server supplied all assets. Four fresh result screenshots were inspected.

PR 2 review: [approved and merged](https://github.com/Hawksprey420/SchedLab/pull/2#issuecomment-6857283446).
PR 3 review: [approved](https://github.com/Hawksprey420/SchedLab/pull/3#issuecomment-6858067574).
The reviewer also checked 12 final phone/theme edge probes, 18 additional T3-T8
native/browser cases and blocked-local-storage recovery. Full evidence and the
section 12 submission audit: `docs/p0-verification.md`; reproducible commands: `README.md`.

## Blockers and remaining submission work

No unresolved confirmed P0 software defects. The assignment PDF report, function
screenshots in that PDF, five conclusion answers and single group submission remain
open. Firefox/Safari, physical touch hardware, screen-reader speech, exhaustive
allocation failures, enormous malformed JS arrays and a fully disconnected OS were
not verified. axe-core's optional audit was not installed. No deployment occurred.

## Next action

Owner reviews the P0 implementation and verification record before any release tag
or further feature work. The agent stops at this checkpoint.
