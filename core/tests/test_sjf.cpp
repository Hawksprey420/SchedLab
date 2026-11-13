// Non-preemptive SJF: plan.md T1-T6 plus tie-breaking and the FCFS/SJF divergence case.
#include <cstdint>
#include <limits>
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

Schedule run_sjf(const std::vector<schedlab::Process>& processes) {
  Schedule schedule = schedlab::simulate_single_core(processes, Algorithm::SJF_NON_PREEMPTIVE);
  support::check_invariants(processes, schedule);
  return schedule;
}

void t1_everyone_arrives_at_zero() {
  const Schedule s = run_sjf({proc("P1", 0, 8), proc("P2", 0, 4), proc("P3", 0, 2)});

  CHECK_EQ(s.segments.size(), 3U);
  if (s.segments.size() == 3) {
    check_run(s.segments[0], "P3", 0, 2);
    check_run(s.segments[1], "P2", 2, 6);
    check_run(s.segments[2], "P1", 6, 14);
  }
  // Results stay in INPUT order (P1, P2, P3) although execution order is P3, P2, P1.
  CHECK_EQ(s.results.size(), 3U);
  if (s.results.size() == 3) {
    check_result(s.results[0], "P1", 6, 14, 6, 14, 6);
    check_result(s.results[1], "P2", 2, 6, 2, 6, 2);
    check_result(s.results[2], "P3", 0, 2, 0, 2, 0);
  }
  CHECK_NEAR(s.average_waiting, 8.0 / 3.0);
  CHECK_NEAR(s.average_turnaround, 22.0 / 3.0);
  CHECK_EQ(s.makespan, 14);
}

void t2_does_not_preempt_the_running_process() {
  const Schedule s = run_sjf({proc("P1", 0, 8), proc("P2", 1, 4), proc("P3", 2, 2)});

  // Critical assertion: P3 (burst 2) arrives at t=2 while P1 runs, but P1 keeps the CPU
  // for its whole burst. P1 appears once, as [0,8).
  CHECK_EQ(s.segments.size(), 3U);
  if (s.segments.size() == 3) {
    check_run(s.segments[0], "P1", 0, 8);
    check_run(s.segments[1], "P3", 8, 10);
    check_run(s.segments[2], "P2", 10, 14);
  }
  CHECK_EQ(s.results.size(), 3U);
  if (s.results.size() == 3) {
    check_result(s.results[0], "P1", 0, 8, 0, 8, 0);
    check_result(s.results[1], "P2", 10, 14, 9, 13, 9);
    check_result(s.results[2], "P3", 8, 10, 6, 8, 6);
  }
  CHECK_NEAR(s.average_waiting, 15.0 / 3.0);
  CHECK_NEAR(s.average_turnaround, 29.0 / 3.0);
  CHECK_EQ(s.makespan, 14);
}

void t3_idle_at_the_beginning() {
  const Schedule s = run_sjf({proc("P1", 3, 2)});

  CHECK_EQ(s.segments.size(), 2U);
  if (s.segments.size() == 2) {
    check_idle(s.segments[0], 0, 3);
    check_run(s.segments[1], "P1", 3, 5);
  }
  check_result(s.results.at(0), "P1", 3, 5, 0, 2, 0);
}

void t4_idle_between_jobs() {
  const Schedule s = run_sjf({proc("P1", 0, 1), proc("P2", 4, 2)});

  CHECK_EQ(s.segments.size(), 3U);
  if (s.segments.size() == 3) {
    check_run(s.segments[0], "P1", 0, 1);
    check_idle(s.segments[1], 1, 4);
    check_run(s.segments[2], "P2", 4, 6);
  }
  check_result(s.results.at(1), "P2", 4, 6, 0, 2, 0);
}

void t5_identical_jobs_keep_input_order() {
  const Schedule s = run_sjf({proc("C", 0, 3), proc("A", 0, 3), proc("B", 0, 3)});

  CHECK_EQ(s.segments.size(), 3U);
  if (s.segments.size() == 3) {
    check_run(s.segments[0], "C", 0, 3);
    check_run(s.segments[1], "A", 3, 6);
    check_run(s.segments[2], "B", 6, 9);
  }
}

void equal_bursts_are_broken_by_arrival_then_input_order() {
  // P1 runs [0,5). At t=5 P2, P4 and P3 are all waiting with burst 2:
  //   P4 and P3 arrived at 1, P2 arrived at 3 -> P2 goes last (earlier arrival wins);
  //   P4 is before P3 in the input -> P4 goes first (then input order).
  const Schedule s =
      run_sjf({proc("P1", 0, 5), proc("P2", 3, 2), proc("P4", 1, 2), proc("P3", 1, 2)});

  CHECK_EQ(s.segments.size(), 4U);
  if (s.segments.size() == 4) {
    check_run(s.segments[0], "P1", 0, 5);
    check_run(s.segments[1], "P4", 5, 7);
    check_run(s.segments[2], "P3", 7, 9);
    check_run(s.segments[3], "P2", 9, 11);
  }
  CHECK_EQ(s.results.size(), 4U);
  if (s.results.size() == 4) {
    check_result(s.results[0], "P1", 0, 5, 0, 5, 0);
    check_result(s.results[1], "P2", 9, 11, 6, 8, 6);
    check_result(s.results[2], "P4", 5, 7, 4, 6, 4);
    check_result(s.results[3], "P3", 7, 9, 6, 8, 6);
  }
}

void t6_single_job() {
  const Schedule s = run_sjf({proc("Only", 0, 5)});

  CHECK_EQ(s.segments.size(), 1U);
  if (!s.segments.empty()) check_run(s.segments[0], "Only", 0, 5);
  check_result(s.results.at(0), "Only", 0, 5, 0, 5, 0);
  CHECK_NEAR(s.average_waiting, 0.0);
  CHECK_NEAR(s.average_turnaround, 5.0);
  CHECK_EQ(s.makespan, 5);
}

void priority_does_not_change_the_order() {
  const Schedule s = run_sjf({proc("P1", 0, 5, 1), proc("P2", 0, 2, 99)});
  CHECK_EQ(s.segments.at(0).process_id, "P2");  // shortest burst, not highest priority value
}

// Hand-computed case where FCFS and SJF differ right after an idle gap.
//
// Input: P1(0,2) P2(4,6) P3(4,1) P4(5,3). The CPU idles in [2,4); at t=4 both P2 and P3
// are waiting.
//   FCFS: P1 [0,2) idle [2,4) P2 [4,10) P3 [10,11) P4 [11,14)
//         waiting 0,0,6,6 -> 12/4 = 3.0; turnaround 2,6,7,9 -> 24/4 = 6.0; makespan 14
//   SJF : P1 [0,2) idle [2,4) P3 [4,5) P4 [5,8) P2 [8,14)
//         waiting 0,4,0,0 -> 4/4 = 1.0;  turnaround 2,10,1,3 -> 16/4 = 4.0; makespan 14
void sjf_and_fcfs_differ_after_an_idle_gap() {
  const std::vector<schedlab::Process> input = {proc("P1", 0, 2), proc("P2", 4, 6),
                                                proc("P3", 4, 1), proc("P4", 5, 3)};

  const Schedule fcfs = schedlab::simulate_single_core(input, Algorithm::FCFS);
  support::check_invariants(input, fcfs);
  CHECK_EQ(fcfs.segments.size(), 5U);
  if (fcfs.segments.size() == 5) {
    check_run(fcfs.segments[0], "P1", 0, 2);
    check_idle(fcfs.segments[1], 2, 4);
    check_run(fcfs.segments[2], "P2", 4, 10);
    check_run(fcfs.segments[3], "P3", 10, 11);
    check_run(fcfs.segments[4], "P4", 11, 14);
  }
  CHECK_NEAR(fcfs.average_waiting, 3.0);
  CHECK_NEAR(fcfs.average_turnaround, 6.0);
  CHECK_EQ(fcfs.makespan, 14);

  const Schedule sjf = run_sjf(input);
  CHECK_EQ(sjf.segments.size(), 5U);
  if (sjf.segments.size() == 5) {
    check_run(sjf.segments[0], "P1", 0, 2);
    check_idle(sjf.segments[1], 2, 4);
    check_run(sjf.segments[2], "P3", 4, 5);
    check_run(sjf.segments[3], "P4", 5, 8);
    check_run(sjf.segments[4], "P2", 8, 14);
  }
  CHECK_EQ(sjf.results.size(), 4U);
  if (sjf.results.size() == 4) {
    check_result(sjf.results[0], "P1", 0, 2, 0, 2, 0);
    check_result(sjf.results[1], "P2", 8, 14, 4, 10, 4);
    check_result(sjf.results[2], "P3", 4, 5, 0, 1, 0);
    check_result(sjf.results[3], "P4", 5, 8, 0, 3, 0);
  }
  CHECK_NEAR(sjf.average_waiting, 1.0);
  CHECK_NEAR(sjf.average_turnaround, 4.0);
  CHECK_EQ(sjf.makespan, 14);
}

void largest_representable_timeline_does_not_overflow() {
  constexpr std::int64_t kMax = std::numeric_limits<std::int64_t>::max();
  const Schedule s = run_sjf({proc("P1", kMax - 10, 10)});
  CHECK_EQ(s.makespan, kMax);
}

}  // namespace

int main() {
  t1_everyone_arrives_at_zero();
  t2_does_not_preempt_the_running_process();
  t3_idle_at_the_beginning();
  t4_idle_between_jobs();
  t5_identical_jobs_keep_input_order();
  equal_bursts_are_broken_by_arrival_then_input_order();
  t6_single_job();
  priority_does_not_change_the_order();
  sjf_and_fcfs_differ_after_an_idle_gap();
  largest_representable_timeline_does_not_overflow();
  return check::finish("test_sjf");
}
