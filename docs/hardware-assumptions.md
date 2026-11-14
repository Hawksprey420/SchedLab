# Hardware assumptions

## Simulated profiles

Hybrid runs are labelled `SIMULATED` and `Experimental / simplified model`.
The selected queue order (FCFS or non-preemptive SJF) chooses an eligible process;
the independent placement heuristic chooses an idle lane. A process never migrates
or preempts. Burst is work units; duration is ceil(work / lane rate) ticks.

| Profile | Physical simulated lanes | Assumed work / tick | Assumed energy units / tick |
|---|---|---|---|
| Single core (graded) | CPU0 | 1 | 1 |
| Intel-style | P0..P5; E0..E3 | P: 2; E: 1 | P: 3; E: 1 |
| Arm-style | Prime0; Big0..Big2; LITTLE0..LITTLE3 | Prime: 3; Big: 2; LITTLE: 1 | Prime: 5; Big: 3; LITTLE: 1 |

These are fictional teaching values, not measurements of any CPU. The Intel
example represents six P and four E physical cores, ten lanes. P-core simultaneous
multithreading (SMT) adds logical processors: the example machine has sixteen
logical processors, not sixteen independent physical cores. SMT contention, caches,
memory, frequency scaling, thermal limits and OS policy are outside this model.
The Arm profile illustrates heterogeneous placement and is not a particular device.

FIRST_AVAILABLE chooses the lexicographically smallest idle core ID;
FASTEST_AVAILABLE chooses highest assumed rate, then core ID; ENERGY_FIRST chooses
lowest assumed energy units per tick, then core ID. The latter can finish later.
Lexicographic ID order means E precedes P and Big precedes LITTLE and Prime.
This explicit teaching convention is deterministic, not a recommendation for OS policy.

The energy index sums busy ticks times assumed energy units per tick. It has no
physical power unit. Compare it alongside makespan, total work and per-lane
utilisation. None of these simulated results measures a processor's performance
or energy consumption. The complete interface and tie rules are in
[the hybrid contract](hybrid-contract.md).

Single-core mode continues to interpret burst as ticks with a rate of one and
uses the existing mandatory scheduling call and rendering. Its defaults are unchanged.
