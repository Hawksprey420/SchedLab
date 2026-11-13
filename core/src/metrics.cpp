#include "schedlab/metrics.hpp"

#include <algorithm>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <utility>

namespace schedlab {
namespace {

// One result per input process, in input order, with the timing fields still unset.
std::vector<ProcessResult> make_empty_results(const std::vector<Process>& processes) {
  std::vector<ProcessResult> results;
  results.reserve(processes.size());
  for (const Process& p : processes) {
    results.push_back(ProcessResult{p.id, p.arrival, p.burst, p.priority, 0, 0, 0, 0, 0});
  }
  return results;
}

// Copies each run segment's begin/end into the matching process's start/completion.
void record_start_and_completion(const std::vector<Segment>& segments,
                                 std::vector<ProcessResult>& results) {
  std::unordered_map<std::string, std::size_t> index_by_id;
  for (std::size_t i = 0; i < results.size(); ++i) index_by_id.emplace(results[i].id, i);

  for (const Segment& segment : segments) {
    if (segment.idle) continue;
    const auto found = index_by_id.find(segment.process_id);
    if (found == index_by_id.end()) {
      throw std::logic_error("segment refers to unknown process \"" + segment.process_id + "\"");
    }
    ProcessResult& result = results[found->second];
    result.start = segment.begin;
    result.completion = segment.end;
  }
}

void derive_waiting_turnaround_response(std::vector<ProcessResult>& results) {
  for (ProcessResult& result : results) {
    result.waiting = result.start - result.arrival;
    result.turnaround = result.completion - result.arrival;
    result.response = result.waiting;
  }
}

}  // namespace

Schedule compute_schedule_metrics(const std::vector<Process>& processes,
                                  std::vector<Segment> segments) {
  Schedule schedule;
  schedule.results = make_empty_results(processes);
  record_start_and_completion(segments, schedule.results);
  derive_waiting_turnaround_response(schedule.results);

  // Divide before summing: quotients fit in int64, remainders sum to at most n*(n-1).
  const auto count = static_cast<std::int64_t>(schedule.results.size());
  std::int64_t waiting_quotient = 0, waiting_remainder = 0;
  std::int64_t turnaround_quotient = 0, turnaround_remainder = 0;
  std::int64_t makespan = 0;
  for (const ProcessResult& result : schedule.results) {
    waiting_quotient += result.waiting / count;
    waiting_remainder += result.waiting % count;
    turnaround_quotient += result.turnaround / count;
    turnaround_remainder += result.turnaround % count;
    makespan = std::max(makespan, result.completion);
  }

  schedule.average_waiting = count > 0
      ? static_cast<double>(waiting_quotient + waiting_remainder / count) +
            static_cast<double>(waiting_remainder % count) / static_cast<double>(count)
      : 0.0;
  schedule.average_turnaround = count > 0
      ? static_cast<double>(turnaround_quotient + turnaround_remainder / count) +
            static_cast<double>(turnaround_remainder % count) / static_cast<double>(count)
      : 0.0;
  schedule.makespan = makespan;
  schedule.segments = std::move(segments);
  return schedule;
}

}  // namespace schedlab
