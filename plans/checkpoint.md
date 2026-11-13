# Checkpoint

**Goal:** P0 gate (`v0.1-required`): tested FCFS and non-preemptive SJF simulator, C++ core
compiled to WebAssembly, React UI with input, validation, Gantt chart and metrics.

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
| WASM bridge and parity test | `feature/wasm-bridge` | waiting on Emscripten SDK install |
| Web UI (P0) | `feature/web-ui` | not started |

## Latest verified result

`ctest --test-dir build/core -C Release`: 11 of 11 pass (MSVC, Visual Studio 2026) at
`a95281e`. Codex reviewed PR 1 independently, including 400 generated schedules checked
against its own reference implementation; its one confirmed defect (CLI range message)
and its BOM finding are fixed with regression cases. Not yet built with Emscripten, GCC
or Clang.

## Next action

When `emcc` is available, implement `docs/web-contract.md` (binding, `build-wasm.ps1`,
parity test) on `feature/wasm-bridge`.
