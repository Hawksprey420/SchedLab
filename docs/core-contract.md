# Core contract

The portable C++20 scheduling core in `core/`. This refines `plan.md` section 4; where the
two differ, this file records the decision and the reason.

## Public API (`core/include/schedlab/`)

```cpp
namespace schedlab {
  inline constexpr std::size_t kMaxProcesses = 100;
  inline constexpr std::size_t kWholeInput = static_cast<std::size_t>(-1);

  enum class Algorithm { FCFS, SJF_NON_PREEMPTIVE };

  struct Process {
    std::string id;           // trimmed by validate/simulate; unique, nonempty, not "IDLE"
    std::int64_t arrival;     // ticks, >= 0
    std::int64_t burst;       // ticks, > 0
    int priority;             // accepted, never used for ordering
  };

  struct Segment {
    std::string core_id;      // "CPU0" in single-core mode
    std::string process_id;   // empty when idle
    bool idle;                // explicit flag; never infer idle from the string
    std::int64_t begin;
    std::int64_t end;         // half-open [begin, end)
  };

  struct ProcessResult {
    std::string id;
    std::int64_t arrival, burst;
    int priority;
    std::int64_t start, completion, waiting, turnaround, response;
  };

  struct Schedule {
    std::vector<Segment> segments;        // chronological, contiguous from 0 to makespan
    std::vector<ProcessResult> results;   // in INPUT order, one per process
    double average_waiting;
    double average_turnaround;
    std::int64_t makespan;
  };

  struct ValidationError {
    std::size_t process_index;   // index into the input, or kWholeInput
    std::string field;           // "id", "arrival", "burst", "processes"
    std::string message;         // human-readable, names the offending value
  };

  std::vector<ValidationError> validate(const std::vector<Process>& processes);

  // Throws std::invalid_argument (message = first validation error) on invalid input.
  Schedule simulate_single_core(const std::vector<Process>& processes, Algorithm algorithm);
}
```

Differences from `plan.md` 4.1: the position in the input vector is the `input_index`
tie-breaker (no separate field that could disagree with the position); `Segment` has an
explicit `idle` flag; `ProcessResult` echoes the inputs so a results table needs no join.

## Validation rules

`validate` returns every error it finds, not only the first, in input order.

| Rule | Field | Scope |
|---|---|---|
| At least one process | `processes` | whole input |
| At most `kMaxProcesses` | `processes` | whole input |
| ID nonempty after trimming ASCII whitespace | `id` | per process |
| ID is not `IDLE` (case-insensitive, after trimming) | `id` | per process |
| ID unique after trimming (case-sensitive); reported on the later duplicate | `id` | per process |
| `arrival >= 0` | `arrival` | per process |
| `burst > 0` | `burst` | per process |
| `max(arrival) + sum(burst)` fits in `int64` (checked arithmetic, no UB) | `burst` | whole input |

The overflow rule is evaluated only when every arrival and burst is individually valid.
Fractional, NaN and missing values cannot be represented in `Process`; they are rejected
at each boundary that parses text or JavaScript numbers (CLI, WASM binding, UI) using the
same error shape.

## Algorithms

Both are single-core and non-preemptive. An idle segment is emitted whenever the CPU has
nothing eligible, including before the first arrival.

- **FCFS** (`src/fcfs.cpp`): order by `(arrival, input index)`; run each to completion.
- **SJF** (`src/sjf.cpp`): at each decision point choose, among processes with
  `arrival <= now`, the minimum `(burst, arrival, input index)`; run it to completion. A
  shorter process arriving during a run never interrupts it. O(n^2) selection is fine.

## Metrics (`src/metrics.cpp`)

`turnaround = completion - arrival`, `waiting = start - arrival`, `response = waiting`,
`average_* = sum / n`, `makespan = max(completion)`.

## CLI (`schedlab-cli`)

Text in, text out, so the native and WebAssembly builds can be compared byte for byte.

```text
schedlab-cli <fcfs|sjf> < input.txt
```

Input: one process per line, `id arrival burst priority`, whitespace separated. Blank
lines and lines starting with `#` are ignored. Numbers must be base-10 integers that fit
their type; anything else is a validation error for that line.

Output on success (exit 0), averages with exactly four decimal places:

```text
SEGMENT CPU0 P1 0 8
SEGMENT CPU0 IDLE 8 9
RESULT P1 start=0 completion=8 waiting=0 turnaround=8 response=0
AVERAGE waiting=6.6667 turnaround=11.3333
MAKESPAN 14
```

On invalid input (exit 1), one line per error on stdout: `ERROR <index|-> <field> <message>`.
Wrong usage prints usage to stderr and exits 2.

The formatting lives in one function, `std::string format_schedule(const Schedule&)`
(`include/schedlab/format.hpp`), reused by the CLI and the WASM parity test.

## Tests

Plain CTest executables, no third-party framework. `plan.md` section 8 defines T1-T8 and
their expected values; every listed value is asserted exactly (averages within 1e-9).
