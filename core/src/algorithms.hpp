// Internal interface between simulate_single_core and the two algorithms.
//
// An algorithm only decides WHEN each process runs and returns a chronological, gap-free
// list of segments (including idle ones). Per-process results and averages are derived
// from those segments in metrics.cpp so that both algorithms share one set of formulas.
#pragma once

#include <vector>

#include "schedlab/types.hpp"

namespace schedlab {

inline constexpr const char* kSingleCoreId = "CPU0";

// Precondition for both: the input passed validate() and IDs are already trimmed.
std::vector<Segment> fcfs_segments(const std::vector<Process>& processes);
std::vector<Segment> sjf_segments(const std::vector<Process>& processes);

inline Segment make_idle_segment(std::int64_t begin, std::int64_t end) {
  return Segment{kSingleCoreId, "", true, begin, end};
}

inline Segment make_run_segment(const Process& process, std::int64_t begin) {
  return Segment{kSingleCoreId, process.id, false, begin, begin + process.burst};
}

}  // namespace schedlab
