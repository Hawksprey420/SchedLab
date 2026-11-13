#include <stdexcept>

#include "algorithms.hpp"
#include "schedlab/metrics.hpp"
#include "schedlab/scheduler.hpp"
#include "text_util.hpp"

namespace schedlab {
namespace {

// Copy of the input with IDs trimmed, so output never contains stray whitespace.
std::vector<Process> with_trimmed_ids(const std::vector<Process>& processes) {
  std::vector<Process> trimmed = processes;
  for (Process& process : trimmed) process.id = trim_ascii(process.id);
  return trimmed;
}

std::vector<Segment> run_algorithm(const std::vector<Process>& processes, Algorithm algorithm) {
  switch (algorithm) {
    case Algorithm::FCFS:
      return fcfs_segments(processes);
    case Algorithm::SJF_NON_PREEMPTIVE:
      return sjf_segments(processes);
  }
  throw std::invalid_argument("unknown algorithm");
}

}  // namespace

Schedule simulate_single_core(const std::vector<Process>& processes, Algorithm algorithm) {
  const std::vector<ValidationError> errors = validate(processes);
  if (!errors.empty()) throw std::invalid_argument(errors.front().message);

  const std::vector<Process> trimmed = with_trimmed_ids(processes);
  return compute_schedule_metrics(trimmed, run_algorithm(trimmed, algorithm));
}

}  // namespace schedlab
