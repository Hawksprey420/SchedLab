# Hybrid simulation contract

This implements plan.md section 5 after the owner approved P2 and P3. P0 remains
unchanged. All scheduling, placement, durations and metrics are computed in core/.

## Types and profiles

`Profile` has SINGLE_CORE, INTEL_6P_4E, ARM_1_3_4. `Placement` has FIRST_AVAILABLE,
FASTEST_AVAILABLE, ENERGY_FIRST. `Core` contains `id`, positive integer `rate`, and
positive integer `energy_per_tick`. `profile_cores(Profile)` returns immutable teaching
assumptions: CPU0 rate 1 / energy 1; Intel P0..P5 rate 2 / energy 3 and E0..E3
rate 1 / energy 1; Arm Prime0 rate 3 / energy 5, Big0..Big2 rate 2 / energy 3,
LITTLE0..LITTLE3 rate 1 / energy 1. These are fictional teaching values, not CPU
measurements. Intel has ten physical simulated lanes; its six P cores support SMT,
which accounts for sixteen logical processors on the real example, not sixteen cores.

`HybridSchedule` contains `Schedule schedule`, `Profile profile`, `Algorithm algorithm`,
`Placement heuristic`, `vector<Lane> lanes`, `int64 total_work`, `int64 energy_index`.
`Lane` contains `Core core`, `int64 busy_ticks`, `double utilisation` (fraction 0..1).
API: `simulate_hybrid(processes, algorithm, profile, heuristic)`.

## Rules

Reuse validate() including its conservative overflow bound. Reject unknown enum values.
Burst denotes work units. Duration is work/rate + (work%rate != 0), avoiding an
addition overflow in ceil. Arrival and completion events advance virtual time.
At each event choose eligible jobs and place each on an idle core until either is
exhausted. FCFS orders by (arrival, input position); SJF orders by (work, arrival,
input position), matching the baseline when there is one lane. Priority is unused.
Placement is independent: FIRST_AVAILABLE chooses smallest core ID (lexicographic);
FASTEST_AVAILABLE chooses greatest rate then core ID; ENERGY_FIRST chooses least
energy_per_tick then core ID. Jobs never migrate or preempt. Simultaneous arrivals
and completions are both visible before dispatch. Stable output segments are sorted
by (begin, core ID); each lane includes explicit idle gaps from zero through makespan.
Results remain in input order. SINGLE_CORE must exactly match simulate_single_core,
including idle segments and aggregate averages, for either algorithm and every heuristic.

## Metrics and arithmetic

waiting = response = start-arrival; turnaround = completion-arrival. Reuse the exact
average accumulator from the baseline. makespan = maximum completion; lane busy_ticks
is the sum of its execution durations; utilisation = busy_ticks / makespan. total_work
is the sum of input bursts. energy_index is the checked sum of busy_ticks *
energy_per_tick. Check all integer addition and multiplication; throw overflow_error
rather than wrapping. No metric is measured power, watts, joules or battery use.

## Boundaries and labels

The existing single-core calls and output stay byte-for-byte compatible.
CLI: `schedlab-cli hybrid <fcfs|sjf> <SINGLE_CORE|INTEL_6P_4E|ARM_1_3_4>
<FIRST_AVAILABLE|FASTEST_AVAILABLE|ENERGY_FIRST>` reads the existing process format.
`runHybridText(algorithm, profile, heuristic, input)` shares that native text runner.
It emits MODE SIMULATED, PROFILE, ALGORITHM, HEURISTIC, the existing schedule text,
LANE records with rate, energyPerTick, busyTicks, utilisation, TOTAL_WORK, ENERGY_INDEX.

Structured WASM: `simulateHybrid(processes, algorithm, profile, heuristic)` returns
{ok:true,schedule:HybridSchedule} or the existing {ok:false,errors} shape. Here the
JSON/TS HybridSchedule *extends* Schedule (the schedule fields are flattened), adding
mode:SIMULATED, profile, algorithm, heuristic, lanes:[{coreId,rate,energyPerTick,
busyTicks,utilisation}], totalWork, energyIndex. Field errors additionally accept
profile and heuristic. Check settings are strings and recognized before conversion;
reuse process parsing and validation. Reject any returned integer above 2^53-1.
The UI calls through SchedulerAdapter.simulateHybrid and only renders returned values.
