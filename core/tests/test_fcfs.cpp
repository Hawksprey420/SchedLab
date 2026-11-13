// FCFS: plan.md T1-T6 plus the boundary cases specific to this algorithm.
#include <cstdint>
#include <limits>
#include <stdexcept>
#include <vector>

#include "schedlab/scheduler.hpp"
#include "support.hpp"

using schedlab::Algorithm;
using schedlab::Schedule;
using support::check_idle;
using support::check_result;
using support::check_run;
using support::proc;

namespace {

Schedule run_fcfs(const std::vector<schedlab::Process>& processes) {
  Schedule schedule = schedlab::simulate_single_core(processes, Algorithm::FCFS);
  support::check_invariants(processes, schedule);
  return schedule;
}

void t1_everyone_arrives_at_zero() {
  const Schedule s = run_fcfs({proc("P1", 0, 8), proc("P2", 0, 4), proc("P3", 0, 2)});

  CHECK_EQ(s.segments.size(), 3U);
  if (s.segments.size() == 3) {
    check_run(s.segments[0], "P1", 0, 8);
    check_run(s.segments[1], "P2", 8, 12);
    check_run(s.segments[2], "P3", 12, 14);
  }
  CHECK_EQ(s.results.size(), 3U);
  if (s.results.size() == 3) {
    check_result(s.results[0], "P1", 0, 8, 0, 8, 0);
    check_result(s.results[1], "P2", 8, 12, 8, 12, 8);
    check_result(s.results[2], "P3", 12, 14, 12, 14, 12);
  }
  CHECK_NEAR(s.average_waiting, 20.0 / 3.0);
  CHECK_NEAR(s.average_turnaround, 34.0 / 3.0);
  CHECK_EQ(s.makespan, 14);
}

void t2_staggered_arrivals() {
  const Schedule s = run_fcfs({proc("P1", 0, 8), proc("P2", 1, 4), proc("P3", 2, 2)});

  CHECK_EQ(s.segments.size(), 3U);
  if (s.segments.size() == 3) {
    check_run(s.segments[0], "P1", 0, 8);
    check_run(s.segments[1], "P2", 8, 12);
    check_run(s.segments[2], "P3", 12, 14);
  }
  CHECK_EQ(s.results.size(), 3U);
  if (s.results.size() == 3) {
    check_result(s.results[0], "P1", 0, 8, 0, 8, 0);
    check_result(s.results[1], "P2", 8, 12, 7, 11, 7);
    check_result(s.results[2], "P3", 12, 14, 10, 12, 10);
  }
  CHECK_NEAR(s.average_waiting, 17.0 / 3.0);
  CHECK_NEAR(s.average_turnaround, 31.0 / 3.0);
  CHECK_EQ(s.makespan, 14);
}

void t3_idle_at_the_beginning() {
  const Schedule s = run_fcfs({proc("P1", 3, 2)});

  CHECK_EQ(s.segments.size(), 2U);
  if (s.segments.size() == 2) {
    check_idle(s.segments[0], 0, 3);
    check_run(s.segments[1], "P1", 3, 5);
  }
  check_result(s.results.at(0), "P1", 3, 5, 0, 2, 0);
  CHECK_EQ(s.makespan, 5);
}

void t4_idle_between_jobs() {
  const Schedule s = run_fcfs({proc("P1", 0, 1), proc("P2", 4, 2)});

  CHECK_EQ(s.segments.size(), 3U);
  if (s.segments.size() == 3) {
    check_run(s.segments[0], "P1", 0, 1);
    check_idle(s.segments[1], 1, 4);
    check_run(s.segments[2], "P2", 4, 6);
  }
  check_result(s.results.at(1), "P2", 4, 6, 0, 2, 0);
  CHECK_EQ(s.makespan, 6);
}

void t5_identical_jobs_keep_input_order() {
  // Input order is deliberately not alphabetical to show the tie-break is the position.
  const Schedule s = run_fcfs({proc("C", 0, 3), proc("A", 0, 3), proc("B", 0, 3)});

  CHECK_EQ(s.segments.size(), 3U);
  if (s.segments.size() == 3) {
    check_run(s.segments[0], "C", 0, 3);
    check_run(s.segments[1], "A", 3, 6);
    check_run(s.segments[2], "B", 6, 9);
  }
}

void unsorted_input_is_ordered_by_arrival() {
  // Results stay in input order even though execution order differs.
  const Schedule s = run_fcfs({proc("P1", 5, 2), proc("P2", 0, 2), proc("P3", 5, 1)});

  CHECK_EQ(s.segments.size(), 4U);
  if (s.segments.size() == 4) {
    check_run(s.segments[0], "P2", 0, 2);
    check_idle(s.segments[1], 2, 5);
    check_run(s.segments[2], "P1", 5, 7);  // same arrival as P3, earlier in the input
    check_run(s.segments[3], "P3", 7, 8);
  }
  CHECK_EQ(s.results.size(), 3U);
  if (s.results.size() == 3) {
    check_result(s.results[0], "P1", 5, 7, 0, 2, 0);
    check_result(s.results[1], "P2", 0, 2, 0, 2, 0);
    check_result(s.results[2], "P3", 7, 8, 2, 3, 2);
  }
}

void t6_single_job() {
  const Schedule s = run_fcfs({proc("Only", 0, 5, 3)});

  CHECK_EQ(s.segments.size(), 1U);
  if (!s.segments.empty()) check_run(s.segments[0], "Only", 0, 5);
  check_result(s.results.at(0), "Only", 0, 5, 0, 5, 0);
  CHECK_EQ(s.results.at(0).priority, 3);  // priority is echoed, not used
  CHECK_NEAR(s.average_waiting, 0.0);
  CHECK_NEAR(s.average_turnaround, 5.0);
  CHECK_EQ(s.makespan, 5);
}

void priority_does_not_change_the_order() {
  const Schedule s = run_fcfs({proc("P1", 0, 2, 9), proc("P2", 0, 2, 1)});
  CHECK_EQ(s.segments.at(0).process_id, "P1");
}

void ids_are_trimmed_in_the_output() {
  const Schedule s = schedlab::simulate_single_core({proc("  P1 ", 0, 2)}, Algorithm::FCFS);
  CHECK_EQ(s.segments.at(0).process_id, "P1");
  CHECK_EQ(s.results.at(0).id, "P1");
}

void invalid_input_throws() {
  bool threw = false;
  try {
    schedlab::simulate_single_core({proc("P1", 0, 0)}, Algorithm::FCFS);
  } catch (const std::invalid_argument&) {
    threw = true;
  }
  CHECK(threw);
}

void largest_representable_timeline_does_not_overflow() {
  constexpr std::int64_t kMax = std::numeric_limits<std::int64_t>::max();
  const Schedule s = run_fcfs({proc("P1", kMax - 10, 10)});
  CHECK_EQ(s.makespan, kMax);
  CHECK_EQ(s.results.at(0).completion, kMax);
}

}  // namespace

int main() {
  t1_everyone_arrives_at_zero();
  t2_staggered_arrivals();
  t3_idle_at_the_beginning();
  t4_idle_between_jobs();
  t5_identical_jobs_keep_input_order();
  unsorted_input_is_ordered_by_arrival();
  t6_single_job();
  priority_does_not_change_the_order();
  ids_are_trimmed_in_the_output();
  invalid_input_throws();
  largest_representable_timeline_does_not_overflow();
  return check::finish("test_fcfs");
}
