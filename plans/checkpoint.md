# Checkpoint

**Goal:** deliver approved P2 hybrid simulation, independently review and merge it;
then deliver P3 native Windows CPU Sets traces and offline browser import.
P0 is merged on master and tagged `v0.1-required`. Do not create another release
tag or write the assignment PDF report in this work.

## Decisions

- Owner approved P2 followed by P3 on 14 November 2026, superseding the old stop gate.
- One branch and PR per workstream: `feature/hybrid-sim`, then `experiment/intel-native`.
- Core alone owns queue order, placement, durations and metrics. No JS scheduler.
- Hybrid contract: `docs/hybrid-contract.md`; assumptions: `docs/hardware-assumptions.md`.
- Ten Intel physical lanes (6 P + 4 E), eight Arm lanes. Fictional integer rates
  and abstract energy index. Priority unused. Default graded mode unchanged.
- Optional controls follow the original form to retain the graded layout.
- Independent reviewer reruns all suites before merge; implementer does not merge.

## Latest verified result

P0 baseline: 13 CTest, 319 Vitest, 13 Playwright; see `docs/p0-verification.md`.
P2 UI: typecheck passes; 4/4 new Playwright cases pass at 375/1280 px in both themes,
with topology/placement switching, returned values, editing/rerun and return to
single core. Full suite, generated WASM, independent review and PR pending.
Browser skill checker: zero overflow, DOM issues or console errors at both widths;
all 24 default-view focus stops show focus. Hybrid matrix DOM/console clean.
SVG bar focus uses its active stroke; the generic checker only sees CSS outlines.

## Open work

Complete P2 full verification and independent review/merge. P3 has not started.
P1 playback/comparison, PDF report and conclusion answers are outside this task.
Not verified: Firefox/Safari, real touch hardware, screen-reader speech, optional axe.

## Next action

Finish and independently review P2, then create P3 from updated master.
