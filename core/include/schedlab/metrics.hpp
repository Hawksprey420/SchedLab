// Turns a list of execution segments into per-process results and averages.
#pragma once

#include <vector>

#include "schedlab/types.hpp"

namespace schedlab {

// Builds the full Schedule from the input processes and the segments an algorithm produced.
//   waiting = start - arrival, turnaround = completion - arrival, response = waiting
//   (non-preemptive: the first and only run starts when the process first gets the CPU).
// Preconditions: process IDs are unique and every process has exactly one non-idle
// segment. Throws std::logic_error if a segment names an unknown process.
Schedule compute_schedule_metrics(const std::vector<Process>& processes,
                                  std::vector<Segment> segments);

}  // namespace schedlab
