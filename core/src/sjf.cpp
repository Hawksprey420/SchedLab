#include <algorithm>
#include <limits>
#include <optional>

#include "algorithms.hpp"

namespace schedlab {
namespace {

// True if `a` should run before `b`: shorter burst first, then earlier arrival.
// Equal on both means the caller keeps the lower input index (see pick_shortest_job).
bool is_shorter_job(const Process& a, const Process& b) {
  if (a.burst != b.burst) return a.burst < b.burst;
  return a.arrival < b.arrival;
}

// Among unfinished processes that have already arrived at `now`, returns the one to run
// next, or nothing if the CPU would be idle. Scanning in input order and replacing the
// best only on a strictly better job makes the input index the final tie-break.
std::optional<std::size_t> pick_shortest_job(const std::vector<Process>& processes,
                                             const std::vector<bool>& finished,
                                             std::int64_t now) {
  std::optional<std::size_t> best;
  for (std::size_t i = 0; i < processes.size(); ++i) {
    if (finished[i] || processes[i].arrival > now) continue;
    if (!best || is_shorter_job(processes[i], processes[*best])) best = i;
  }
  return best;
}

std::int64_t earliest_unfinished_arrival(const std::vector<Process>& processes,
                                         const std::vector<bool>& finished) {
  std::int64_t earliest = std::numeric_limits<std::int64_t>::max();
  for (std::size_t i = 0; i < processes.size(); ++i) {
    if (!finished[i]) earliest = std::min(earliest, processes[i].arrival);
  }
  return earliest;
}

}  // namespace

// Shortest Job First, non-preemptive, one core.
//   1. Look only at processes that have arrived by `now`.
//   2. If there are none, idle until the earliest future arrival.
//   3. Run the shortest of them (ties: earlier arrival, then input order) to completion.
//      A shorter job arriving meanwhile waits; it never interrupts the running one.
//   4. Repeat until every process has run.
std::vector<Segment> sjf_segments(const std::vector<Process>& processes) {
  std::vector<Segment> segments;
  std::vector<bool> finished(processes.size(), false);
  std::int64_t now = 0;

  for (std::size_t completed = 0; completed < processes.size(); ++completed) {
    std::optional<std::size_t> next = pick_shortest_job(processes, finished, now);

    if (!next) {
      const std::int64_t next_arrival = earliest_unfinished_arrival(processes, finished);
      segments.push_back(make_idle_segment(now, next_arrival));
      now = next_arrival;
      next = pick_shortest_job(processes, finished, now);
    }

    const Process& process = processes[*next];
    segments.push_back(make_run_segment(process, now));
    now += process.burst;
    finished[*next] = true;
  }
  return segments;
}

}  // namespace schedlab
