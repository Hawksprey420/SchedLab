// Plain data types shared by every part of the scheduling core.
#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

namespace schedlab {

inline constexpr std::size_t kMaxProcesses = 100;

// process_index value for errors that concern the whole input, not one process.
inline constexpr std::size_t kWholeInput = static_cast<std::size_t>(-1);

enum class Algorithm { FCFS, SJF_NON_PREEMPTIVE };

struct Process {
  std::string id;  // trimmed by validate/simulate; unique, nonempty, not "IDLE"
  std::int64_t arrival;  // ticks, >= 0
  std::int64_t burst;    // ticks, > 0
  int priority;          // accepted, never used for ordering
};

// One contiguous interval on one core. Half-open: [begin, end).
struct Segment {
  std::string core_id;     // "CPU0" in single-core mode
  std::string process_id;  // empty when idle
  bool idle;               // explicit flag; never infer idle from the string
  std::int64_t begin;
  std::int64_t end;
};

struct ProcessResult {
  std::string id;
  std::int64_t arrival;
  std::int64_t burst;
  int priority;
  std::int64_t start;
  std::int64_t completion;
  std::int64_t waiting;
  std::int64_t turnaround;
  std::int64_t response;
};

struct Schedule {
  std::vector<Segment> segments;       // chronological, contiguous from 0 to makespan
  std::vector<ProcessResult> results;  // in INPUT order, one per process
  double average_waiting;
  double average_turnaround;
  std::int64_t makespan;
};

struct ValidationError {
  std::size_t process_index;  // index into the input, or kWholeInput
  std::string field;          // "id", "arrival", "burst", "processes"
  std::string message;        // human-readable, names the offending value
};

}  // namespace schedlab
