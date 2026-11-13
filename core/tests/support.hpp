// Helpers shared by the scheduling tests: building input and asserting on output.
#pragma once

#include <cstdint>
#include <string>
#include <utility>
#include <vector>

#include "check.hpp"
#include "schedlab/types.hpp"

namespace support {

inline schedlab::Process proc(std::string id, std::int64_t arrival, std::int64_t burst,
                              int priority = 0) {
  return schedlab::Process{std::move(id), arrival, burst, priority};
}

// Asserts one non-idle segment on CPU0.
inline void check_run(const schedlab::Segment& segment, const std::string& process_id,
                      std::int64_t begin, std::int64_t end) {
  CHECK_EQ(segment.core_id, "CPU0");
  CHECK_EQ(segment.process_id, process_id);
  CHECK(!segment.idle);
  CHECK_EQ(segment.begin, begin);
  CHECK_EQ(segment.end, end);
}

// Asserts one idle segment on CPU0: explicit flag set, empty process id.
inline void check_idle(const schedlab::Segment& segment, std::int64_t begin, std::int64_t end) {
  CHECK_EQ(segment.core_id, "CPU0");
  CHECK_EQ(segment.process_id, "");
  CHECK(segment.idle);
  CHECK_EQ(segment.begin, begin);
  CHECK_EQ(segment.end, end);
}

inline void check_result(const schedlab::ProcessResult& result, const std::string& id,
                        std::int64_t start, std::int64_t completion, std::int64_t waiting,
                        std::int64_t turnaround, std::int64_t response) {
  CHECK_EQ(result.id, id);
  CHECK_EQ(result.start, start);
  CHECK_EQ(result.completion, completion);
  CHECK_EQ(result.waiting, waiting);
  CHECK_EQ(result.turnaround, turnaround);
  CHECK_EQ(result.response, response);
}

// Invariants that must hold for every valid schedule (T8). `processes` is the (already
// trimmed) input in input order.
inline void check_invariants(const std::vector<schedlab::Process>& processes,
                             const schedlab::Schedule& schedule) {
  const std::size_t n = processes.size();
  CHECK_EQ(schedule.results.size(), n);
  if (schedule.results.size() != n) return;

  std::int64_t total_burst = 0;
  std::int64_t total_idle = 0;
  double waiting_sum = 0;
  double turnaround_sum = 0;
  std::int64_t latest_completion = 0;

  for (std::size_t i = 0; i < n; ++i) {
    const schedlab::ProcessResult& r = schedule.results[i];
    CHECK_EQ(r.id, processes[i].id);  // results are in input order
    CHECK_EQ(r.arrival, processes[i].arrival);
    CHECK_EQ(r.burst, processes[i].burst);
    CHECK(r.completion >= r.start);
    CHECK(r.start >= r.arrival);
    CHECK(r.waiting >= 0);
    CHECK_EQ(r.turnaround, r.completion - r.arrival);
    CHECK_EQ(r.waiting, r.start - r.arrival);
    CHECK_EQ(r.response, r.waiting);
    CHECK_EQ(r.completion - r.start, r.burst);
    total_burst += r.burst;
    waiting_sum += static_cast<double>(r.waiting);
    turnaround_sum += static_cast<double>(r.turnaround);
    if (r.completion > latest_completion) latest_completion = r.completion;
  }

  // Segments are contiguous from 0, never overlap, and each process runs exactly once.
  std::int64_t cursor = 0;
  std::vector<int> run_count(n, 0);
  for (const schedlab::Segment& segment : schedule.segments) {
    CHECK_EQ(segment.begin, cursor);
    CHECK(segment.end > segment.begin);
    cursor = segment.end;
    if (segment.idle) {
      CHECK_EQ(segment.process_id, "");
      total_idle += segment.end - segment.begin;
      continue;
    }
    for (std::size_t i = 0; i < n; ++i) {
      if (processes[i].id != segment.process_id) continue;
      ++run_count[i];
      CHECK_EQ(segment.begin, schedule.results[i].start);
      CHECK_EQ(segment.end, schedule.results[i].completion);
    }
  }
  for (std::size_t i = 0; i < n; ++i) CHECK_EQ(run_count[i], 1);

  CHECK_EQ(schedule.makespan, cursor);
  CHECK_EQ(schedule.makespan, latest_completion);
  CHECK_EQ(total_burst + total_idle, schedule.makespan);
  CHECK_NEAR(schedule.average_waiting, waiting_sum / static_cast<double>(n));
  CHECK_NEAR(schedule.average_turnaround, turnaround_sum / static_cast<double>(n));
}

}  // namespace support
