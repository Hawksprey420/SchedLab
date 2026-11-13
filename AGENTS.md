# Engineering guidance

SchedLab is an Operating Systems final project: a CPU scheduling simulator (FCFS and
non-preemptive SJF). `plan.md` is the specification; the instructor's `Final Project OS.pdf`
(assignment and rubric) is kept out of this public repository and is summarised in `plan.md`.
When they disagree with the code, report it instead of choosing silently.

## Boundaries

- `core/` is the only place scheduling decisions are made (portable C++20, no OS APIs).
- `web/` consumes the core through `SchedulerAdapter`; it never computes a schedule itself.
- `native/` (optional, Windows-only) never leaks into `core/`.
- Priority is accepted input but is not a scheduling criterion for FCFS/SJF.
- Do not start P1-P3 work until the P0 gate (`v0.1-required`) is tagged.

## Working method

Adapted from the Binturong/Bintanong workflow.

1. One task per branch: `feature/core-fcfs-sjf`, `feature/wasm-bridge`, `feature/web-ui`,
   `feature/hybrid-sim`, `experiment/intel-native`.
2. Test first: write the failing test, see it fail for the stated reason, then make it pass.
3. Commit small verified units. Stage explicit paths, never `git add -A` or `git add .`.
4. Conventional Commits: `type(scope): imperative summary`, 72 characters or fewer, no
   AI attribution or co-author trailers.
5. Every task gets an independent review (`.claude/agents/reviewer.md`) that reruns the
   checks before the branch is merged. The implementer does not merge its own task.
6. Keep `plans/checkpoint.md` a compact current snapshot: goal, commits, latest verified
   result, decisions, blockers, one next action.
7. Report real results: what passed, what was skipped, what could not be checked.

## Skills

| Task | Read before implementation |
|---|---|
| Any commit message | `.claude/skills/conventional-commits/SKILL.md` |
| Any UI code under `web/` | `.claude/skills/senior-frontend/SKILL.md` and its `references/ui-checklist.md`; verify in a real browser with `scripts/check_ui.mjs` |

Both are carried over from the Bintanong repository; `senior-frontend` is MIT-licensed
third-party material (see its `references/NOTICE.md`).

## Commands

```powershell
cmake -S core -B build/core
cmake --build build/core --config Release
ctest --test-dir build/core --output-on-failure -C Release
```

Git Bash cannot fork on the owner's machine; use PowerShell.
