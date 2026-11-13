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

  // Summed as double: 100 waiting times of up to INT64_MAX each would overflow int64.
  double waiting_sum = 0.0;
  double turnaround_sum = 0.0;
  std::int64_t makespan = 0;
  for (const ProcessResult& result : schedule.results) {
    waiting_sum += static_cast<double>(result.waiting);
    turnaround_sum += static_cast<double>(result.turnaround);
    makespan = std::max(makespan, result.completion);
  }

  const double count = static_cast<double>(schedule.results.size());
  schedule.average_waiting = count > 0 ? waiting_sum / count : 0.0;
  schedule.average_turnaround = count > 0 ? turnaround_sum / count : 0.0;
  schedule.makespan = makespan;
  schedule.segments = std::move(segments);
  return schedule;
}

}  // namespace schedlab
