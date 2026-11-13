// T8: metric and schedule invariants over several workloads, for both algorithms,
// plus direct tests of compute_schedule_metrics.
#include <cstdint>
#include <stdexcept>
#include <string>
#include <vector>

#include "schedlab/metrics.hpp"
#include "schedlab/scheduler.hpp"
#include "support.hpp"

using schedlab::Algorithm;
using schedlab::Process;
using schedlab::Schedule;
using support::proc;

namespace {

// Deterministic 100-process workload from fixed formulas (no random seed). Arrival gaps,
// repeated bursts and shared arrivals exercise idle time and every tie-break.
std::vector<Process> generated_workload() {
  std::vector<Process> processes;
  for (std::int64_t i = 0; i < 100; ++i) {
    // The +3 keeps every arrival after t=0 so the schedule opens with an idle segment.
    const std::int64_t arrival = (i * 7) % 61 + (i % 5 == 0 ? 40 : 0) + 3;
    const std::int64_t burst = (i * 13) % 9 + 1;
    processes.push_back(proc("P" + std::to_string(i), arrival, burst, static_cast<int>(i % 4)));
  }
  return processes;
}

void invariants_hold_for_every_workload_and_algorithm() {
  const std::vector<std::vector<Process>> workloads = {
      {proc("P1", 0, 8), proc("P2", 0, 4), proc("P3", 0, 2)},
      {proc("P1", 0, 8), proc("P2", 1, 4), proc("P3", 2, 2)},
      {proc("P1", 3, 2)},
      {proc("P1", 0, 1), proc("P2", 4, 2)},
      {proc("A", 0, 3), proc("B", 0, 3), proc("C", 0, 3)},
      {proc("P1", 10, 1), proc("P2", 0, 1), proc("P3", 20, 5), proc("P4", 20, 1)},
      generated_workload(),
  };
  for (const std::vector<Process>& workload : workloads) {
    for (const Algorithm algorithm : {Algorithm::FCFS, Algorithm::SJF_NON_PREEMPTIVE}) {
      support::check_invariants(workload, schedlab::simulate_single_core(workload, algorithm));
    }
  }
}

void generated_workload_is_valid_and_starts_idle() {
  const std::vector<Process> workload = generated_workload();
  CHECK_EQ(workload.size(), 100U);
  CHECK(schedlab::validate(workload).empty());

  // The earliest arrival is after t=0, so both algorithms must open with idle time.
  for (const Algorithm algorithm : {Algorithm::FCFS, Algorithm::SJF_NON_PREEMPTIVE}) {
    const Schedule s = schedlab::simulate_single_core(workload, algorithm);
    CHECK(!s.segments.empty() && s.segments.front().idle);
  }
}

void averages_do_not_overflow_int64() {
  // Two jobs of 4e18 ticks: the turnaround sum (4e18 + 8e18) exceeds INT64_MAX, so it
  // must not be accumulated in an int64 sum.
  constexpr std::int64_t kBurst = 4'000'000'000'000'000'000;
  const std::vector<Process> input = {proc("A", 0, kBurst), proc("B", 0, kBurst)};
  const Schedule s = schedlab::simulate_single_core(input, Algorithm::FCFS);
  CHECK_NEAR(s.average_waiting / 1e18, 2.0);
  CHECK_NEAR(s.average_turnaround / 1e18, 6.0);
  CHECK_EQ(s.makespan, 2 * kBurst);
}

void metrics_are_derived_from_segments() {
  // Hand-made segments, deliberately not produced by either algorithm.
  const std::vector<Process> processes = {proc("B", 2, 3), proc("A", 0, 2)};
  std::vector<schedlab::Segment> segments = {
      {"CPU0", "A", false, 0, 2},
      {"CPU0", "B", false, 2, 5},
  };
  const Schedule s = schedlab::compute_schedule_metrics(processes, segments);

  CHECK_EQ(s.results.size(), 2U);
  support::check_result(s.results.at(0), "B", 2, 5, 0, 3, 0);  // input order: B first
  support::check_result(s.results.at(1), "A", 0, 2, 0, 2, 0);
  CHECK_NEAR(s.average_waiting, 0.0);
  CHECK_NEAR(s.average_turnaround, 2.5);
  CHECK_EQ(s.makespan, 5);
}

void large_integer_average_stays_exact() {
  const Schedule s = schedlab::simulate_single_core(
      {proc("A", 0, 9'007'199'254'740'989), proc("B", 0, 1), proc("C", 0, 1)},
      Algorithm::FCFS);
  CHECK_EQ(s.average_turnaround, 9'007'199'254'740'990.0);
  const Schedule native = schedlab::simulate_single_core(
      {proc("A", 0, 9'007'199'254'740'993), proc("B", 0, 1)}, Algorithm::FCFS);
  CHECK_EQ(native.average_turnaround, 9'007'199'254'740'994.0);
}

void unknown_process_in_segments_is_an_error() {
  bool threw = false;
  try {
    schedlab::compute_schedule_metrics({proc("A", 0, 1)}, {{"CPU0", "Z", false, 0, 1}});
  } catch (const std::logic_error&) {
    threw = true;
  }
  CHECK(threw);
}

}  // namespace

int main() {
  invariants_hold_for_every_workload_and_algorithm();
  generated_workload_is_valid_and_starts_idle();
  averages_do_not_overflow_int64();
  large_integer_average_stays_exact();
  metrics_are_derived_from_segments();
  unknown_process_in_segments_is_an_error();
  return check::finish("test_metrics");
}
