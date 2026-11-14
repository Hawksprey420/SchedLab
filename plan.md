# SchedLab — Implementation Plan

**Project:** Interactive CPU Scheduling Algorithm Simulator with Heterogeneous-Core Demonstration  
**Course:** Operating Systems — Final Project  
**Deadline:** Sunday, 22 November 2026  
**Status:** P0, P2 and P3 implemented and merged; P1 playback and comparison not built. See section 12 for the checked list.  
**Primary reference:** `Final Project OS.pdf` (2 pages).

> **Implementation directive for coding agents:** Build the mandatory, fully tested FCFS and non-preemptive SJF simulator first. Do not start native Intel benchmarking, introduce authentication/databases, or rewrite the UI architecture until the P0 acceptance gate passes. The optional hybrid extension must never compromise the mandatory deliverable.

## 0. Project decision

Use **C++20 for the scheduling and hardware-sensitive code**, **React + TypeScript + Vite for the interactive dashboard**, and **Emscripten to expose the portable C++ scheduler to the browser as WebAssembly**. The optional Windows-native C++ program will detect CPU topology, run controlled per-core experiments, and export JSON traces that the dashboard can import.

This produces one portable demonstration (browser-based CPU scheduling) and one hardware-specific demonstration (an optional Windows executable). **WebAssembly cannot use Windows CPU-affinity APIs from the browser.** Keep the two execution environments separate.

### Hard scope boundary

| Tier | Feature | Deadline gate |
|---|---|---|
| **P0 — required** | FCFS, non-preemptive SJF, process input/editing, arrivals/bursts/priority field, Gantt chart, per-process metrics, averages, validation, clear algorithm choice | Complete by Nov 16 |
| **P1 — presentation quality** | Play/pause/step, synchronized timeline and table, comparison view, preset datasets, responsive UI, offline demonstration | Complete by Nov 18 |
| **P2 — optional architecture simulation** | Simulated Intel P/E and Arm heterogeneous topology, multiple lanes, explicitly defined core-placement heuristics and relative performance/energy indices | Complete only if P0/P1 stable |
| **P3 — stretch native experiment** | Windows C++ topology discovery, measured P/E task run with CPU Sets, export/import experiment trace | Must not delay submission |

**Rubric alignment:** Exact FCFS/SJF implementations, metrics, Gantt output, clean modular code, PDF documentation, and five conclusion answers are the assessed deliverables. The assignment is for **FCFS and non-preemptive SJF**, not Priority/RR/SRTF. The priority field is required input but is **not** a scheduling criterion for the specified algorithms. Only one group submission is needed.

## 1. Product goals and non-goals

### Goals

1. Enter or edit processes with `pid`, `arrival`, `burst`, and `priority`.
2. Execute FCFS or non-preemptive SJF deterministically with **integer simulation ticks**.
3. Display a correct single-core Gantt chart, including explicit idle intervals.
4. Compute per-process `start`, `completion`, `waiting`, `turnaround`, and `response` times, plus average waiting and turnaround times.
5. Allow a user to change the same workload and instantly compare FCFS against SJF.
6. Visually advance simulation time without rerunning the scheduling algorithm on each animation frame.
7. If time allows, run the same workload on *illustrative* heterogeneous processor topologies, then explain why modeled task placement and OS scheduling differ.
8. If the native experiment is completed, show measured per-core workload durations from the actual i7-12650H, with appropriate caveats.

### Non-goals

- Reimplementing Windows 11's scheduler, Intel Thread Director, Linux EAS, or Arm firmware scheduling.
- Equating FCFS/SJF directly with real Windows scheduling policies.
- Claiming fixed P/E or big/LITTLE performance ratios represent real CPU benchmarks.
- Guaranteeing thread affinity, exact frequencies, sustained boost, or measured power use.
- Creating a database, account system, remote backend, cloud deployment requirement, or full CPU emulator.
- Adding unrequired scheduling algorithms before the required ones pass tests.

## 2. Technology and runtime boundaries

| Area | Choice | Reason |
|---|---|---|
| Scheduling core | C++20, pure functions | Strong algorithmic separation; same engine across CLI and WASM |
| Core tests | CTest or Catch2/doctest (if available) | Independently verify the math; minimal build dependencies preferred |
| Web integration | Emscripten (`embind` or narrow C ABI) | Call compiled C++ from JS/TS without rewriting scheduling logic |
| UI | React, TypeScript, Vite, Tailwind CSS | Lightweight offline-friendly interface |
| Visualization | SVG + DOM/CSS | Precise Gantt positions, interactive tooltips, no chart library required |
| Native Intel extension | Separate C++20 Windows console executable | CPU Set APIs and high-resolution measurements unavailable to browser WASM |
| Data exchange | Versioned JSON files | Easy reproducibility; no always-running native bridge required |
| Storage | None required; optional browser local storage | Keep inputs recoverable without adding infrastructure |

**Fallback rule:** If the Emscripten toolchain is the critical path, ship a **fully verified TypeScript port of P0** behind the identical `SchedulerAdapter` interface and retain the C++ native CLI/reference tests. Do not let toolchain setup prevent passing the assignment. Document which engine the submitted browser build actually uses.

## 3. Repository structure

```text
schedlab/
├── plan.md
├── README.md
├── docs/
│   ├── architecture.md
│   ├── algorithms.md
│   ├── hardware-assumptions.md
│   ├── test-cases.md
│   ├── demo-script.md
│   ├── screenshots/
│   └── final-report.pdf              # generated final documentation
├── core/
│   ├── CMakeLists.txt
│   ├── include/schedlab/
│   │   ├── types.hpp
│   │   ├── scheduler.hpp
│   │   ├── metrics.hpp
│   │   └── topology.hpp
│   ├── src/
│   │   ├── fcfs.cpp
│   │   ├── sjf.cpp
│   │   ├── metrics.cpp
│   │   ├── hybrid_sim.cpp
│   │   └── wasm_bindings.cpp
│   └── tests/
│       ├── test_fcfs.cpp
│       ├── test_sjf.cpp
│       ├── test_metrics.cpp
│       └── test_hybrid.cpp
├── native/
│   └── windows-intel/
│       ├── CMakeLists.txt
│       ├── src/
│       │   ├── main.cpp
│       │   ├── topology_win.cpp
│       │   ├── cpu_sets.cpp
│       │   ├── workload.cpp
│       │   └── measurement.cpp
│       └── README.md
├── web/
│   ├── package.json
│   ├── src/
│   │   ├── app/App.tsx
│   │   ├── bridge/schedulerAdapter.ts
│   │   ├── bridge/wasmAdapter.ts
│   │   ├── models/types.ts
│   │   ├── components/ProcessEditor.tsx
│   │   ├── components/AlgorithmSelector.tsx
│   │   ├── components/TopologySelector.tsx
│   │   ├── components/GanttChart.tsx
│   │   ├── components/PlaybackControls.tsx
│   │   ├── components/MetricsTable.tsx
│   │   ├── components/ComparisonPanel.tsx
│   │   └── components/HardwareTraceImport.tsx
│   └── public/wasm/              # generated assets; not source-of-truth
└── examples/
    ├── all-at-zero.json
    ├── staggered-arrivals.json
    ├── cpu-idle.json
    ├── equal-bursts.json
    └── sample-native-trace.json
```

The directory tree defines ownership boundaries. UI does not directly implement FCFS/SJF; hardware code does not live in the portable core.

## 4. Contracts and algorithm rules

### 4.1 Portable C++ types (conceptual API)

```cpp
namespace schedlab {
  enum class Algorithm { FCFS, SJF_NON_PREEMPTIVE };

  struct Process {
    std::string id;             // unique and nonempty
    std::int64_t arrival;       // simulation ticks; >= 0
    std::int64_t burst;         // work units; > 0
    int priority;               // accepted input; unused by FCFS/SJF
    std::size_t input_index;    // deterministic tie-breaker
  };

  struct Segment {
    std::string core_id;        // "CPU0" for mandatory single-core mode
    std::string process_id;     // empty / sentinel for IDLE
    std::int64_t begin;
    std::int64_t end;           // half-open interval [begin, end)
  };

  struct ProcessResult {
    std::string id;
    std::int64_t start;
    std::int64_t completion;
    std::int64_t waiting;
    std::int64_t turnaround;
    std::int64_t response;
  };

  struct Schedule {
    std::vector<Segment> segments;
    std::vector<ProcessResult> results;
    double average_waiting;
    double average_turnaround;
    std::int64_t makespan;
  };

  Schedule simulate_single_core(
    const std::vector<Process>& processes,
    Algorithm algorithm
  );
}
```

Implement validation at **both** the UI boundary and core boundary. For identical timestamp ties, preserve `input_index` ordering. Use a separate internal `IDLE` representation if blank string PID would be ambiguous; never permit the user to define `IDLE` as a PID.

### 4.2 Input rules

- `1 <= process_count <= 100` for the mandatory UI (cap may be documented and adjusted).
- Unique nonempty PIDs; trim whitespace; preserve display names.
- Arrival is a **nonnegative integer**; burst is a **positive integer**.
- Priority is a valid integer but does not affect FCFS/SJF. Clearly label this in the UI.
- Reject missing, NaN, negative, fractional, and overflowing inputs with field-level error messages.
- Use 64-bit arithmetic in C++ and bound UI values to keep summations/timing safe.
- Do not silently change invalid values into zeros.

### 4.3 FCFS — non-preemptive single-core

1. Sort by `(arrival, input_index)`.
2. Keep `now = 0`.
3. For each process, if `arrival > now`, emit an `IDLE` segment `[now, arrival)`.
4. Set `start = max(now, arrival)`, `completion = start + burst`.
5. Emit the process segment and advance `now = completion`.
6. Return segments, metrics, and averages.

### 4.4 SJF — non-preemptive single-core

1. Keep a set of unfinished processes and `now = 0`.
2. Find only processes with `arrival <= now`.
3. If none exists, jump `now` to the earliest future arrival and emit `IDLE`.
4. Among currently available processes, choose the minimum `(burst, arrival, input_index)`.
5. Run the chosen process to completion. **Never interrupt it when a shorter process arrives.**
6. Repeat until all processes finish.

Simple O(n²) selection is acceptable for <=100 processes; a heap is optional and must not obstruct clarity.

### 4.5 Metrics (single-core baseline)

For each process:

- `turnaround = completion - arrival`
- `waiting = start - arrival`
- `response = start - arrival` (same as waiting in the required non-preemptive single-core models)
- `completion = end time of its execution interval`

For total `n` processes:

- `average_waiting = sum(waiting) / n`
- `average_turnaround = sum(turnaround) / n`
- `makespan = max(completion)`; single-core busy-time utilization may be `sum(burst) / makespan` when `makespan > 0`

**Do not calculate a process's waiting time from its unchanged `burst` in hybrid mode if work units execute at different modeled capacities.** Since hybrid mode remains non-preemptive, use `waiting = start - arrival`, `turnaround = completion - arrival`, and `response = start - arrival` there as well.

### 4.6 Example JSON exchange

```json
{
  "schemaVersion": 1,
  "algorithm": "SJF_NON_PREEMPTIVE",
  "topology": "SINGLE_CORE",
  "processes": [
    {"id": "P1", "arrival": 0, "burst": 8, "priority": 2},
    {"id": "P2", "arrival": 1, "burst": 4, "priority": 1},
    {"id": "P3", "arrival": 2, "burst": 2, "priority": 3}
  ]
}
```

JSON outputs must contain the scheduling segments, per-process results, averages, selected settings, and a mode label (`SIMULATED` or `NATIVE_MEASURED`). A native measured trace must not be passed off as the result of textbook FCFS/SJF.

## 5. Hybrid simulator (optional P2)

### 5.1 Profiles

| Profile | Example topology | Illustrative work-rate units | Explicit limitation |
|---|---|---|---|
| Single core | 1 identical core | 1 | Required assignment reference |
| Intel i7-12650H-style | 6 P + 4 E **physical** cores | P=2, E=1 | Ratios are fictional teaching assumptions, **not** actual i7-12650H measurements |
| Arm DynamIQ-style | 1 Prime + 3 Big + 4 LITTLE | Prime=3, Big=2, LITTLE=1 | Illustrative, not tied to one device |

The actual Intel Core i7-12650H has **6 P-cores, 4 E-cores, 10 physical cores, and 16 logical threads**. For a simplified 10-lane physical-core simulator, **do not incorrectly draw 16 independent physical cores**. Explain that P-core SMT contributes additional logical processors without doubling physical cores.

Give each simulated core a *positive integer work rate*. Define a job's CPU demand in **work units**, independent of the core. For example, with `work = 7` and `rate = 2`, its illustrative duration is `ceil(7/2) = 4` simulation ticks. This intentionally ignores many real microarchitectural effects.

### 5.2 Scheduling and placement must be decoupled

- **Queue ordering:** FCFS or non-preemptive SJF chooses which eligible job is dispatched next.
- **Core placement:** A separately selected teaching heuristic chooses the idle CPU lane.
- **Events:** Process arrivals and core completion events advance virtual time. At each event, dispatch eligible jobs to idle cores until no further assignment is possible.
- **Tie-breaks:** Stable ordering by process input index and core ID; deterministic for identical input/configuration.
- **Non-preemptive:** Once placed, a process stays on its selected core until the job completes.

Suggested selectable placement heuristics:

1. `FIRST_AVAILABLE`: stable core order.
2. `FASTEST_AVAILABLE`: choose highest work-rate idle core, then core ID.
3. `ENERGY_FIRST`: choose a lower-energy-index idle core, then core ID.

The energy model uses **abstract, explicitly configured energy units** (e.g., per-core assumed units/tick). `energy_index = sum(busy_duration_ticks * assumed_energy_units_per_tick)`. **Do not label this watts, joules, battery consumption, or measured power.** Show total work, makespan, utilization per lane, and energy *index* side by side; energy-only comparisons must acknowledge possible slower completion.

### 5.3 UI separation

- `Single-core (graded)` is always the default and must remain clearly distinct.
- When hybrid mode is enabled, show `Experimental / simplified model` next to results.
- Render one Gantt lane per **physical simulated core**.
- Use the same process input; display chosen algorithm and placement heuristic independently.
- Disable or mark unsupported metrics rather than fabricating precision.

## 6. Native Intel experiment (optional P3; Windows C++ only)

### 6.1 Why C++ is justified

Browser JavaScript/WASM cannot directly enumerate Windows CPU Sets or apply thread CPU Set restrictions. A Windows-native C++ helper can inspect processor topology and request CPU Sets for worker threads.

Use these documented APIs:

- `GetSystemCpuSetInformation()` — enumerate CPU Sets, core indices, group IDs, logical processor indices, and `EfficiencyClass`.
- `SetThreadSelectedCpuSets()` — request selected CPU Sets for the controlled worker thread.
- `GetCurrentProcessorNumberEx()` — sample the logical CPU on which a worker actually executed.
- `QueryPerformanceCounter()` / `QueryPerformanceFrequency()` — high-resolution elapsed timing.
- Optionally `QueryThreadCycleTime()` for a separate cycles-based diagnostic; do not substitute it for elapsed wall-clock time.

**Important:** `EfficiencyClass` is the OS-reported classification, not a universal P/E label on every processor. On supported heterogeneous systems, a larger numeric value denotes a faster/less-energy-efficient CPU Set class. Detect available classes at runtime; do not hardcode which logical processor indices are P or E. Confirm topology and report unknown classifications explicitly.

**CPU Sets are scheduling constraints, not proof of perfect hardware isolation.** OS policy, other process activity, group affinity, power limits, core parking, thermal throttling, SMT, and measurement noise can influence results. Report successful API calls and observed CPU samples; never claim Intel Thread Director itself was read or reimplemented.

### 6.2 Native CLI contract

Minimum commands:

```powershell
schedlab-intel.exe detect --output topology.json
schedlab-intel.exe bench --class performance --repeats 10 --output p-core-trace.json
schedlab-intel.exe bench --class efficient --repeats 10 --output e-core-trace.json
```

These are the **planned CLI arguments to implement**, not existing commands. The `detect` command must work without running any stress test. `bench` must be opt-in and time-bounded.

Required trace fields:

```json
{
  "schemaVersion": 1,
  "mode": "NATIVE_MEASURED",
  "machine": {"cpuName": "...", "os": "Windows 11", "topologyDetected": true},
  "scenario": {"workload": "bounded_compute", "requestedClass": "performance", "repeats": 10},
  "measurements": [
    {"run": 1, "elapsedMs": 0, "selectedCpuSetIds": [], "observedLogicalCpus": [], "affinityRequestSucceeded": false}
  ],
  "notes": ["Values are observed and may vary with temperature, power policy, and background activity."]
}
```

### 6.3 Benchmark protocol

1. Detect eligible P-like/E-like classes and display their CPU Set IDs. If only one class exists, **skip the P/E comparison**.
2. Use a deterministic bounded compute workload, not arbitrary busy looping; prevent the compiler from optimizing away its result.
3. Control work size, compiler flags, thread count, and workload code between classes. Use **one software worker thread** for the baseline comparison; optional simultaneous workloads should be separate experiments.
4. Perform warm-up(s), then a small fixed number of repeated measured runs. Report **median, min/max**, OS power mode, and visible ambient/thermal uncertainty.
5. Record the actual executing logical processors during execution where possible, including how often the selected class was observed.
6. Display results as **measured empirical traces**, not guaranteed outcomes and not FCFS/SJF timing calculations.
7. Provide a `--help`, bounded execution limits, no elevated privilege requirement, and a clear user opt-in; stop when requested.
8. If the user machine is too hot, power constrained, or busy, use **pre-captured example traces**, clearly marked as illustrative or previously collected.

### 6.4 Integration choice (minimize risk)

**Recommended:** native helper writes JSON → user clicks **Import hardware trace** → browser visualizes the data. This avoids writing an Electron/Tauri host, Node server, unsafe browser bridging, or a native installer for the mandatory assignment.

A live native-to-web bridge is **out of scope** unless P0–P2 are complete and the group explicitly chooses to extend after submission.

## 7. UI behavior and component specification

### Main screen layout

1. **Header:** SchedLab title, educational mode label, algorithm and topology selections.
2. **Process Editor:** editable table (`PID`, `Arrival`, `Burst`, `Priority`), add/delete rows, sample preset selector, inline validation.
3. **Simulation Controls:** Run / Reset, Play / Pause, Step one tick, speed selection and timeline scrubber. Animation is presentation of a *precomputed* schedule.
4. **Gantt Chart:** accurate x-position widths from `[begin, end)` intervals; idle bars visible; hover/focus shows timestamps, PID and core.
5. **Metrics Panel:** waiting, turnaround, completion, response, average waiting/turnaround, makespan, and clear units.
6. **Compare View:** run same dataset on both FCFS and SJF; results appear in parallel with same axes where feasible.
7. **Architecture Panel (P2/P3 only):** core lanes, topology assumptions, optional affinity trace import, and comparison annotations.

### Required interaction details

- Updating process data invalidates prior schedule and pauses playback.
- Changing algorithm resets the playhead and calculates a fresh timeline.
- Playback **never** affects calculation correctness: every frame filters/reveals immutable precomputed segments.
- Paused/step states are deterministic for identical input.
- On narrow screens, let Gantt scroll horizontally with explicit tick marks; do not compress events to unreadable widths.
- Distinguish `0 simulated ticks` and `0 ms measured`; do not mix units within a chart.
- Keyboard-accessible controls and labels; consistent process colors across algorithms.
- A demo must work locally with no internet connection.

## 8. Tests and verified examples

All expected values below are in **single-core simulation ticks**. Tests compare exact integer metrics, segment order/times, and averages with numeric tolerance.

### T1 — Everyone arrives at 0 (clear FCFS/SJF comparison)

Input order: `P1(arrival=0, burst=8)`, `P2(0,4)`, `P3(0,2)`.

| Algorithm | Segments | Waiting times (P1/P2/P3) | Average waiting | Average turnaround |
|---|---|---|---|---|
| FCFS | P1 `[0,8)`, P2 `[8,12)`, P3 `[12,14)` | 0 / 8 / 12 | 20/3 = 6.6667 | 34/3 = 11.3333 |
| SJF | P3 `[0,2)`, P2 `[2,6)`, P1 `[6,14)` | 6 / 2 / 0 | 8/3 = 2.6667 | 22/3 = 7.3333 |

### T2 — Staggered arrivals and non-preemption

Input: `P1(0,8)`, `P2(1,4)`, `P3(2,2)`.

| Algorithm | Segments | Waiting times (P1/P2/P3) | Average waiting | Average turnaround |
|---|---|---|---|---|
| FCFS | P1 `[0,8)`, P2 `[8,12)`, P3 `[12,14)` | 0 / 7 / 10 | 17/3 = 5.6667 | 31/3 = 10.3333 |
| SJF | P1 `[0,8)`, P3 `[8,10)`, P2 `[10,14)` | 0 / 9 / 6 | 15/3 = 5.0000 | 29/3 = 9.6667 |

**Critical assertion:** SJF cannot interrupt P1 after P3 arrives, because this variant is non-preemptive.

### T3–T9 — Other required cases

- **T3 Idle at beginning:** one process `P1(3,2)` → `IDLE [0,3)` and `P1 [3,5)`; `wait=0`, `turnaround=2`.
- **T4 Idle between jobs:** `P1(0,1)`, `P2(4,2)` → idle `[1,4)`; `P2 start=4`.
- **T5 Identical arrivals/bursts:** input order preserved with `input_index` tie-breaker.
- **T6 Single job:** all results valid, waiting=0, response=0.
- **T7 Invalid input:** negative arrival, zero/negative burst, duplicate ID, missing ID, fractional input, integer overflow, no processes → human-readable errors, no crash.
- **T8 Metric invariants:** every `completion >= start >= arrival`; `waiting >= 0`; `turnaround = completion-arrival`; `response = waiting` (non-preemptive); no two execution segments overlap on the same core; all valid jobs appear exactly once.
- **T9 Hybrid deterministic fixtures:** repeated simulation on the same topology and inputs yields identical lane assignments, durations and metrics. Every job appears exactly once across lanes.

Use tests in the native C++ core and one end-to-end browser test for entering processes, switching algorithms, and rendering results. A screenshot alone does not verify correctness.

## 9. Day-by-day execution and merge gates

| Date | Deliverable | Gate |
|---|---|---|
| **Nov 13** | Create repo, define schema, types, sample workloads, and test vectors; assign owners | `plan.md` committed, test fixtures reviewed |
| **Nov 14** | Implement native C++ single-core FCFS/SJF, validation, and metrics | All T1–T8 native tests pass |
| **Nov 15** | C++ → WASM integration (or bounded TS fallback), build input UI, show static Gantt | Same data produce identical native/browser outputs |
| **Nov 16** | Full mandatory simulator: results table, averages, error handling, algorithm picker | **P0 RELEASE TAG: `v0.1-required`** |
| **Nov 17** | Playback, comparison, presets, styling, accessibility fixes | P1 demonstration stable |
| **Nov 18** | Optional 10-lane Intel-style and 8-lane Arm-style **simulation** | P2 assumptions disclosed and tested |
| **Nov 19** | Optional Windows-native C++ CPU topology detector + benchmark CLI | P3 experimental; may be dropped entirely |
| **Nov 20** | PDF report, function screenshots, UI screenshots, conclusion answers, reproducibility check | All assignment documents complete |
| **Nov 21** | Offline demo rehearsal, bug fixing, fallback screenshots/video, code freeze | `v1.0-submission` candidate verified |
| **Nov 22** | Final group source+PDF submission | Submission confirmed |

### Suggested ownership (to be confirmed by both contributors)

- **Lawrence:** C++ scheduling core, algorithm tests, CMake/Emscripten bridge, technical review of benchmark validity.
- **You:** Process editor, UI/UX, Gantt chart/playback/comparison, Intel/Arm topology explanations and demo storyline, PDF documentation.
- **Pair session:** shared JSON contract, integration checks, deployment/offline packaging, final presentation rehearsal.

This is a division of **bounded responsibilities**, not an attribution of existing work. Cross-review every functional change at the interface boundary. No contributor should silently take over a task without agreeing on the new ownership and commit history.

## 10. Coding-agent execution instructions

### Order of operations

1. Create the directory skeleton and this plan, then implement tests and `simulate_single_core()` before styling.
2. For every algorithm change, run the full native test suite.
3. Introduce `SchedulerAdapter` in TS; the UI must consume it, not independently calculate scheduling decisions.
4. Write a native/browser parity test for T1 and T2.
5. Implement P0 UX (inputs, errors, Gantt, metrics) and tag a known-good release.
6. Only after P0, add playback/comparison and architecture simulation behind isolated feature flags/components.
7. Only after P1, add native Intel experiment. Keep it a separate build target and export mechanism.
8. Produce documentation screenshots from **working** code, not fabricated concept mockups.
9. Ensure the final deliverable builds and runs offline on the instructor's computer using documented instructions.

### Suggested build commands (document/adapt to actual environment)

```powershell
# Native C++ (Visual Studio 2022 + CMake/Ninja or equivalent)
cmake -S core -B build/core -DCMAKE_BUILD_TYPE=Release
cmake --build build/core --config Release
ctest --test-dir build/core --output-on-failure -C Release

# Web frontend
cd web
npm install
npm run dev
npm run build

# WASM compilation requires an installed/activated Emscripten SDK;
# provide a reproducible script such as scripts/build-wasm.ps1.

# Optional native experiment, separate from browser build
cmake -S native/windows-intel -B build/intel
cmake --build build/intel --config Release
```

### Git integration policy

- Branch by workstream: `feature/core-fcfs-sjf`, `feature/web-ui`, `feature/wasm-bridge`, `feature/hybrid-sim`, `experiment/intel-native`.
- Pull requests must include changes, test output, screenshots when UI changes, and updated documentation when behavior changes.
- No direct edits to both scheduling implementation and UI behavior in a single unreviewable change unless necessary for an agreed interface migration.
- Freeze `v0.1-required` before experimentation; never replace the working mandatory project with an unstable extension.

## 11. Demo script (5–7 minutes)

1. **Requirements (~45s):** show FCFS and SJF selector, explain process ID/arrival/burst/priority; priority unused in this rubric's algorithms.
2. **FCFS (~60s):** load T1, play its timeline, highlight order and averages.
3. **SJF (~60s):** use identical T1 inputs, switch to SJF, explain shorter waiting and turnaround values.
4. **Arrival effect (~60s):** load T2 and show why non-preemptive SJF cannot replace the already-running P1.
5. **Hybrid visualization (~60–90s, optional):** switch to Intel-style 6P+4E and Arm illustrative topology; explain separate queue order vs core placement, multiple lanes, assumed work rates.
6. **Native demonstration (~30–60s, optional):** import a Windows C++ trace from the i7-12650H, showing measured elapsed times and caveats. Skip if not reproducible.
7. **Finish (~30s):** explain scheduler tradeoffs, two real OS insights, and limitations.

**Fallback:** If WASM, native affinity, or architecture mode fails on demo day, demonstrate the fully tested P0 version, test fixtures, and screenshots. This remains compliant with the actual assignment.

## 12. Submission checklist

Status as of 14 November 2026 at `17773a9`. Evidence: `docs/p0-verification.md`,
`docs/extension-verification.md`, `plans/checkpoint.md`.

- [x] FCFS non-preemptive is implemented and correctly tested. (`core/src/fcfs.cpp`, `core/tests/test_fcfs.cpp`)
- [x] SJF non-preemptive is implemented and correctly tested. (`core/src/sjf.cpp`, `core/tests/test_sjf.cpp`)
- [x] Inputs: PID, arrival, burst, priority; invalid cases rejected. (core, WASM binding and UI)
- [x] Each algorithm outputs a readable correct Gantt chart, with idle time if necessary.
- [x] Every process shows waiting, turnaround, completion and response times.
- [x] Average waiting and turnaround are correct. (T1 and T2 match section 8)
- [x] CPU metrics and time units are explained without conflating simulation with physical performance.
- [x] Source code is documented, modular, reproducible, and committed.
- [x] PDF explains each algorithm and includes screenshots of the **actual implementation functions**. (`docs/final-report.pdf`)
- [x] PDF contains screenshots of actual program outputs.
- [ ] PDF answers all five conclusion questions from `Final Project OS.pdf`. (drafts are in the PDF; the group must revise them into its own words and fill in the `[GROUP MEMBER NAMES]` placeholder)
- [x] Intel/Arm enhancements are labeled optional and educational.
- [x] Native measurements, if any, clearly distinguish measured data from modeled data.
- [ ] Offline functionality and single group submission are verified before Nov 22. (tests blocked external requests; a fully disconnected machine and the submission itself are not done)

### Implementation status by tier

| Tier | Status | Where |
|---|---|---|
| P0 required | Done, tagged `v0.1-required` | Pull requests 1 to 3 |
| P1 play/pause/step, scrubber, comparison view | Not built (owner chose the P/E work first) | |
| P1 presets, responsive UI, offline assets | Done | Pull request 3 |
| P2 simulated Intel/Arm lanes | Done | Pull request 4 |
| P3 native CPU Sets tool and trace import | Done | Pull request 5 |
| PDF report | Generated; needs the group's edits | Pull request 6 |

Latest suite results: core CTest 15 of 15, native CTest 9 of 9, Vitest 772 of 772,
typecheck and build clean, Playwright 22 of 22 (Chromium only).

### Differences from this plan

- Section 3 files not created: `docs/architecture.md`, `docs/algorithms.md`,
  `docs/test-cases.md` (their content is in `docs/core-contract.md`,
  `docs/web-contract.md`, `docs/hybrid-contract.md` and the verification documents),
  `docs/demo-script.md`, `examples/equal-bursts.json`,
  `web/src/components/PlaybackControls.tsx`, `web/src/components/ComparisonPanel.tsx`.
- `examples/sample-native-trace.json` became three files: topology, performance, efficient.
- The generated WebAssembly module is committed at `web/src/wasm/schedlab.mjs`, not
  ignored under `web/public/wasm/`.
- `Process` has no `input_index` field; position in the input list is the tie-breaker.
- The instructor's assignment PDF is kept out of the public repository.
- Not verified: Firefox, Safari, physical touch devices, screen-reader speech, a fully
  disconnected machine. No `v1.0-submission` tag or demo rehearsal yet.

## 13. Technical references

- [Intel Core i7-12650H official specifications](https://www.intel.com/content/www/us/en/products/sku/226066/intel-core-i712650h-processor-24m-cache-up-to-4-70-ghz/specifications.html)
- [Intel Thread Director overview](https://www.intel.com/content/www/us/en/support/articles/000097053/processors/intel-core-processors.html)
- [Microsoft: GetSystemCpuSetInformation](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getsystemcpusetinformation)
- [Microsoft: SYSTEM_CPU_SET_INFORMATION / EfficiencyClass](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-system_cpu_set_information)
- [Microsoft: SetThreadSelectedCpuSets](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-setthreadselectedcpusets)
- [Microsoft: CPU Sets behavior and caveats](https://learn.microsoft.com/en-us/windows/win32/procthread/cpu-sets)

---

### Definition of done

**Required completion** means anyone can launch the app, enter a valid workload, choose FCFS or non-preemptive SJF, inspect a correct Gantt chart, verify individual and average metrics, and consult source code plus PDF documentation. Hybrid simulation and native Intel benchmarks are demonstrable extras, **not requirements for declaring the final project finished**.
