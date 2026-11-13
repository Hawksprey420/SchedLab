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

## State

| Task | Branch | Status |
|---|---|---|
| Repository scaffold, plan, agent rules | `feature/core-fcfs-sjf` | in progress |
| C++ core, validation, metrics, T1-T8 | `feature/core-fcfs-sjf` | not started |
| WASM bridge and parity test | `feature/wasm-bridge` | not started |
| Web UI (P0) | `feature/web-ui` | not started |

## Next action

Implement `core/` test first against the contract in `docs/core-contract.md`.
