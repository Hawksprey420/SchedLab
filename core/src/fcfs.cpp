#include <algorithm>
#include <numeric>

#include "algorithms.hpp"

namespace schedlab {
namespace {

// Process indices ordered by arrival. stable_sort keeps the input order for equal
// arrivals, which is exactly the (arrival, input index) tie-break.
std::vector<std::size_t> indices_by_arrival(const std::vector<Process>& processes) {
  std::vector<std::size_t> order(processes.size());
  std::iota(order.begin(), order.end(), std::size_t{0});
  std::stable_sort(order.begin(), order.end(), [&](std::size_t a, std::size_t b) {
    return processes[a].arrival < processes[b].arrival;
  });
  return order;
}

}  // namespace

// First-Come First-Served, non-preemptive, one core.
//   1. Visit processes in (arrival, input index) order.
//   2. If the next process has not arrived yet, the CPU idles until it does.
//   3. Run it to completion, then continue from the time it finished.
std::vector<Segment> fcfs_segments(const std::vector<Process>& processes) {
  std::vector<Segment> segments;
  std::int64_t now = 0;

  for (const std::size_t index : indices_by_arrival(processes)) {
    const Process& process = processes[index];

    if (process.arrival > now) {
      segments.push_back(make_idle_segment(now, process.arrival));
      now = process.arrival;
    }

    segments.push_back(make_run_segment(process, now));
    now += process.burst;
  }
  return segments;
}

}  // namespace schedlab
