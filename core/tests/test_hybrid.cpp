#include <algorithm>
#include <limits>
#include <map>
#include <stdexcept>
#include <tuple>

#include "schedlab/format.hpp"
#include "schedlab/scheduler.hpp"
#include "support.hpp"

using namespace schedlab;
using support::proc;

namespace {
constexpr Algorithm algorithms[] = {Algorithm::FCFS, Algorithm::SJF_NON_PREEMPTIVE};
constexpr Profile profiles[] = {Profile::SINGLE_CORE, Profile::INTEL_6P_4E, Profile::ARM_1_3_4};
constexpr Placement heuristics[] = {Placement::FIRST_AVAILABLE, Placement::FASTEST_AVAILABLE,
                                  Placement::ENERGY_FIRST};

void invariants(const std::vector<Process>& input, const HybridSchedule& hybrid) {
  const auto& s = hybrid.schedule;
  std::map<std::string, int> counts;
  std::int64_t work = 0, energy = 0;
  for (const auto& p : input) work += p.burst;
  CHECK_EQ(hybrid.total_work, work);
  for (const auto& lane : hybrid.lanes) {
    std::int64_t cursor = 0, busy = 0;
    for (const auto& segment : s.segments) {
      if (segment.core_id != lane.core.id) continue;
      CHECK_EQ(segment.begin, cursor);
      CHECK(segment.end > segment.begin);
      cursor = segment.end;
      if (segment.idle) { CHECK(segment.process_id.empty()); continue; }
      ++counts[segment.process_id];
      busy += segment.end - segment.begin;
      const auto result = std::find_if(s.results.begin(), s.results.end(), [&](const auto& r) {
        return r.id == segment.process_id;
      });
      CHECK(result != s.results.end());
      if (result == s.results.end()) continue;
      CHECK(segment.begin >= result->arrival);
      CHECK_EQ(result->start, segment.begin);
      CHECK_EQ(result->completion, segment.end);
      CHECK_EQ(segment.end - segment.begin,
               result->burst / lane.core.rate + (result->burst % lane.core.rate != 0));
    }
    CHECK_EQ(cursor, s.makespan);
    CHECK_EQ(lane.busy_ticks, busy);
    CHECK_NEAR(lane.utilisation, static_cast<double>(busy) / static_cast<double>(s.makespan));
    energy += busy * lane.core.energy_per_tick;
  }
  CHECK_EQ(hybrid.energy_index, energy);
  for (std::size_t i = 0; i < input.size(); ++i) {
    CHECK_EQ(s.results[i].id, input[i].id);
    CHECK_EQ(counts[input[i].id], 1);
    CHECK_EQ(s.results[i].waiting, s.results[i].start - input[i].arrival);
    CHECK_EQ(s.results[i].response, s.results[i].waiting);
    CHECK_EQ(s.results[i].turnaround, s.results[i].completion - input[i].arrival);
  }
  CHECK(std::is_sorted(s.segments.begin(), s.segments.end(), [](const auto& a, const auto& b) {
    return std::tie(a.begin, a.core_id) < std::tie(b.begin, b.core_id);
  }));
}

void hand_computed_profiles() {
  // One job arrives at 3 with 5 work: ceil(5/rate), waiting=0, energy=duration*cost.
  // ID order makes Intel FIRST choose E0; Arm FIRST chooses Big0.
  const char* ids[3][3] = {{"CPU0", "CPU0", "CPU0"}, {"E0", "P0", "E0"},
                          {"Big0", "Prime0", "LITTLE0"}};
  const int durations[3][3] = {{5, 5, 5}, {5, 3, 5}, {3, 2, 5}};
  const int costs[3][3] = {{1, 1, 1}, {1, 3, 1}, {3, 5, 1}};
  const std::vector<Process> input = {proc("A", 3, 5)};
  for (int p = 0; p < 3; ++p) for (int h = 0; h < 3; ++h) for (auto algorithm : algorithms) {
    const auto s = simulate_hybrid(input, algorithm, profiles[p], heuristics[h]);
    CHECK_EQ(s.lanes.size(), p == 0 ? 1U : p == 1 ? 10U : 8U);
    const auto run = std::find_if(s.schedule.segments.begin(), s.schedule.segments.end(),
                                  [](const auto& x) { return !x.idle; });
    CHECK_EQ(run->core_id, ids[p][h]);
    CHECK_EQ(run->begin, 3);
    CHECK_EQ(run->end, 3 + durations[p][h]);
    CHECK_EQ(s.energy_index, durations[p][h] * costs[p][h]);
    CHECK_NEAR(s.schedule.average_waiting, 0);
    CHECK_NEAR(s.schedule.average_turnaround, durations[p][h]);
    invariants(input, s);
  }
}

void generated_and_single_core_equivalence() {
  for (int seed = 0; seed < 25; ++seed) {
    std::vector<Process> input;
    for (int i = 0; i < 1 + seed * 4; ++i)
      input.push_back(proc("P" + std::to_string(i), (i * 7 + seed) % 43 + 3,
                           (i * 13 + seed) % 17 + 1, i % 5));
    for (auto algorithm : algorithms) for (auto heuristic : heuristics) for (auto profile : profiles) {
      const auto a = simulate_hybrid(input, algorithm, profile, heuristic);
      const auto b = simulate_hybrid(input, algorithm, profile, heuristic);
      invariants(input, a);
      CHECK_EQ(format_hybrid_schedule(a), format_hybrid_schedule(b));
      if (profile == Profile::SINGLE_CORE) {
        const auto baseline = simulate_single_core(input, algorithm);
        CHECK_EQ(format_schedule(a.schedule), format_schedule(baseline));
        CHECK_EQ(a.schedule.average_waiting, baseline.average_waiting);
        CHECK_EQ(a.schedule.average_turnaround, baseline.average_turnaround);
      }
    }
  }
}

void hand_computed_multiple_jobs() {
  // Three simultaneous jobs plus a late arrival exercise independent queue/placement
  // choices and an idle gap. A/B/C work=5/2/3; D work=1 arrives at20. All waits=0.
  const std::vector<Process> input = {proc("A", 3, 5), proc("B", 3, 2),
                                    proc("C", 3, 3), proc("D", 20, 1)};
  for (const auto profile : {Profile::INTEL_6P_4E, Profile::ARM_1_3_4}) {
    for (const auto heuristic : heuristics) for (const auto algorithm : algorithms) {
      const bool sjf = algorithm == Algorithm::SJF_NON_PREEMPTIVE;
      const bool intel = profile == Profile::INTEL_6P_4E;
      const bool fast = heuristic == Placement::FASTEST_AVAILABLE;
      const bool slow = heuristic == Placement::ENERGY_FIRST || (intel && !fast);
      // Queue order is A/B/C for FCFS, B/C/A for SJF. Placement ranks are independent.
      const std::string prefix = slow ? (intel ? "E" : "LITTLE") : "Big";
      const std::vector<std::string> ids = intel && fast
        ? std::vector<std::string>{"P0", "P1", "P2"}
        : !intel && fast ? std::vector<std::string>{"Prime0", "Big0", "Big1"}
        : std::vector<std::string>{prefix + "0", prefix + "1", prefix + "2"};
      const int rates[3] = {slow ? 1 : !intel && fast ? 3 : 2, slow ? 1 : 2, slow ? 1 : 2};
      const int costs[3] = {slow ? 1 : !intel && fast ? 5 : 3, slow ? 1 : 3, slow ? 1 : 3};
      const int order[3] = {sjf ? 1 : 0, sjf ? 2 : 1, sjf ? 0 : 2};
      const auto hybrid = simulate_hybrid(input, algorithm, profile, heuristic);
      std::int64_t expected_energy = costs[0]; // late D: ceil(1/rate)=1 tick
      double turnaround_sum = 1; // D turnaround
      for (int rank = 0; rank < 3; ++rank) {
        const auto index = static_cast<std::size_t>(order[rank]);
        const auto work = input[index].burst;
        const auto duration = work / rates[rank] + (work % rates[rank] != 0);
        expected_energy += duration * costs[rank];
        turnaround_sum += static_cast<double>(duration);
        const auto& r = hybrid.schedule.results[index];
        support::check_result(r, input[index].id, 3, 3 + duration, 0, duration, 0);
        const auto segment = std::find_if(hybrid.schedule.segments.begin(), hybrid.schedule.segments.end(),
          [&](const auto& s) { return s.process_id == r.id; });
        CHECK_EQ(segment->core_id, ids[rank]);
      }
      CHECK_EQ(hybrid.total_work, 11);
      CHECK_EQ(hybrid.energy_index, expected_energy);
      CHECK_EQ(hybrid.schedule.makespan, 21);
      CHECK_NEAR(hybrid.schedule.average_waiting, 0);
      CHECK_NEAR(hybrid.schedule.average_turnaround, turnaround_sum / 4);
      support::check_result(hybrid.schedule.results[3], "D", 20, 21, 0, 1, 0);
      invariants(input, hybrid);
    }
  }
}

void simultaneous_events_and_ordering() {
  // Intel's six P lanes complete at2, four E lanes at4. At2 queued B(7), C(3),
  // and newly arrived D(1) are all visible. FCFS selects B first; SJF selects D first.
  std::vector<Process> input;
  for (int i = 0; i < 10; ++i) input.push_back(proc("A" + std::to_string(i), 0, 4));
  input.push_back(proc("B", 1, 7)); input.push_back(proc("C", 1, 3));
  input.push_back(proc("D", 2, 1));
  const auto fcfs = simulate_hybrid(input, Algorithm::FCFS, Profile::INTEL_6P_4E,
                                    Placement::FASTEST_AVAILABLE);
  const auto sjf = simulate_hybrid(input, Algorithm::SJF_NON_PREEMPTIVE, Profile::INTEL_6P_4E,
                                   Placement::FASTEST_AVAILABLE);
  auto lane_for = [](const auto& s, const auto& id) {
    for (const auto& segment : s.schedule.segments) if (segment.process_id == id) return segment.core_id;
    return std::string();
  };
  CHECK_EQ(lane_for(fcfs, "B"), "P0");
  CHECK_EQ(lane_for(sjf, "D"), "P0");
  CHECK_EQ(fcfs.schedule.results[10].completion, 6); // 2 + ceil(7/2)
  CHECK_EQ(sjf.schedule.results[10].completion, 6);
  CHECK_EQ(fcfs.schedule.results[12].completion, 3); // 2 + ceil(1/2)
  CHECK_EQ(sjf.schedule.results[12].completion, 3);
  // One job: the slower low-energy lane wins the energy comparison: 5 vs 9.
  const std::vector<Process> one = {proc("A", 0, 5)};
  const auto fast = simulate_hybrid(one, Algorithm::FCFS, Profile::INTEL_6P_4E, Placement::FASTEST_AVAILABLE);
  const auto low = simulate_hybrid(one, Algorithm::FCFS, Profile::INTEL_6P_4E, Placement::ENERGY_FIRST);
  CHECK(low.schedule.makespan > fast.schedule.makespan);
  CHECK(low.energy_index < fast.energy_index);

  // Eleven jobs saturate ten cores. FCFS A starts P0 at0, Z waits until1;
  // SJF Z starts P0 at0 and A waits until1. A duration=ceil(100/2)=50.
  std::vector<Process> saturated = {proc("A", 0, 100)};
  for (int i = 0; i < 9; ++i) saturated.push_back(proc("M" + std::to_string(i), 0, 2));
  saturated.push_back(proc("Z", 0, 1));
  const auto f = simulate_hybrid(saturated, Algorithm::FCFS, Profile::INTEL_6P_4E, Placement::FASTEST_AVAILABLE);
  const auto s = simulate_hybrid(saturated, Algorithm::SJF_NON_PREEMPTIVE, Profile::INTEL_6P_4E, Placement::FASTEST_AVAILABLE);
  CHECK_EQ(f.schedule.results[0].completion, 50);
  CHECK_EQ(s.schedule.results[0].completion, 51);
  CHECK_EQ(f.schedule.results[10].waiting, 1);
  CHECK_EQ(s.schedule.results[10].waiting, 0);
}

template<class Error, class Run> void throws(Run run) {
  bool caught = false;
  try { run(); } catch (const Error&) { caught = true; }
  CHECK(caught);
}

void validation_and_overflow() {
  const auto run = [](const auto& input) {
    return simulate_hybrid(input, Algorithm::FCFS, Profile::INTEL_6P_4E, Placement::FIRST_AVAILABLE);
  };
  const auto max = std::numeric_limits<std::int64_t>::max();
  const std::vector<std::vector<Process>> bad = {
    {}, {proc("", 0, 1)}, {proc(" IDLE ", 0, 1)}, {proc("A", -1, 1)},
    {proc("A", 0, 0)}, {proc("A", 0, -1)}, {proc("A", 0, 1), proc(" A ", 0, 1)},
    {proc("A", max, 1)}, {proc("A", 0, max), proc("B", 0, 1)},
    std::vector<Process>(101, proc("A", 0, 1))};
  for (const auto& input : bad) throws<std::invalid_argument>([&] { run(input); });
  const std::vector<Process> good = {proc(" A ", 0, 1)};
  CHECK_EQ(run(good).schedule.results[0].id, "A");
  throws<std::invalid_argument>([&] { simulate_hybrid(good, static_cast<Algorithm>(99), Profile::SINGLE_CORE, Placement::FIRST_AVAILABLE); });
  throws<std::invalid_argument>([&] { simulate_hybrid(good, Algorithm::FCFS, static_cast<Profile>(99), Placement::FIRST_AVAILABLE); });
  throws<std::invalid_argument>([&] { simulate_hybrid(good, Algorithm::FCFS, Profile::SINGLE_CORE, static_cast<Placement>(99)); });
  throws<std::invalid_argument>([] { profile_cores(static_cast<Profile>(99)); });
  // ceil(MAX/2) is safe, but multiplying its duration by 3 must throw.
  throws<std::overflow_error>([&] { simulate_hybrid({proc("A", 0, max)}, Algorithm::FCFS, Profile::INTEL_6P_4E, Placement::FASTEST_AVAILABLE); });
  // Individual lane energy fits; summing two values beyond MAX must also throw.
  throws<std::overflow_error>([&] { simulate_hybrid({proc("A", 0, max / 2), proc("B", 0, max / 2)}, Algorithm::FCFS, Profile::INTEL_6P_4E, Placement::FASTEST_AVAILABLE); });
  CHECK_EQ(simulate_hybrid({proc("A", 0, max)}, Algorithm::FCFS, Profile::SINGLE_CORE, Placement::ENERGY_FIRST).energy_index, max);
}
}

int main() {
  hand_computed_profiles(); hand_computed_multiple_jobs(); generated_and_single_core_equivalence();
  simultaneous_events_and_ordering(); validation_and_overflow();
  return check::finish("test_hybrid");
}
