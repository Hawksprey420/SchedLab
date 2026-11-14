#include "schedlab/scheduler.hpp"

#include <algorithm>
#include <limits>
#include <stdexcept>
#include <tuple>

#include "schedlab/metrics.hpp"
#include "text_util.hpp"

namespace schedlab {
namespace {
std::int64_t add(std::int64_t a, std::int64_t b) {
  if (a > std::numeric_limits<std::int64_t>::max() - b)
    throw std::overflow_error("hybrid integer addition overflow");
  return a + b;
}

std::int64_t multiply(std::int64_t a, std::int64_t b) {
  if (a > std::numeric_limits<std::int64_t>::max() / b)
    throw std::overflow_error("hybrid energy multiplication overflow");
  return a * b;
}

std::size_t choose_job(const std::vector<Process>& input, const std::vector<bool>& dispatched,
                       std::int64_t now, Algorithm algorithm) {
  std::size_t job = input.size();
  for (std::size_t i = 0; i < input.size(); ++i) {
    if (dispatched[i] || input[i].arrival > now) continue;
    if (job == input.size() ||
        (algorithm == Algorithm::FCFS
          ? std::tie(input[i].arrival, i) < std::tie(input[job].arrival, job)
          : std::tie(input[i].burst, input[i].arrival, i) <
            std::tie(input[job].burst, input[job].arrival, job))) job = i;
  }
  return job;
}

std::size_t choose_lane(const std::vector<Lane>& lanes, const std::vector<std::int64_t>& available,
                        std::int64_t now, Placement heuristic) {
  std::size_t lane = lanes.size();
  for (std::size_t i = 0; i < lanes.size(); ++i) {
    if (available[i] > now) continue;
    const auto& a = lanes[i].core;
    if (lane == lanes.size()) { lane = i; continue; }
    const auto& b = lanes[lane].core;
    const bool preferred = heuristic == Placement::FASTEST_AVAILABLE
      ? (a.rate > b.rate || (a.rate == b.rate && a.id < b.id))
      : heuristic == Placement::ENERGY_FIRST
        ? std::tie(a.energy_per_tick, a.id) < std::tie(b.energy_per_tick, b.id)
        : a.id < b.id;
    if (preferred) lane = i;
  }
  return lane;
}
}

const std::vector<Core>& profile_cores(Profile profile) {
  static const std::vector<Core> single = {{"CPU0", 1, 1}};
  static const std::vector<Core> intel = {{"P0", 2, 3}, {"P1", 2, 3}, {"P2", 2, 3},
    {"P3", 2, 3}, {"P4", 2, 3}, {"P5", 2, 3}, {"E0", 1, 1}, {"E1", 1, 1},
    {"E2", 1, 1}, {"E3", 1, 1}};
  static const std::vector<Core> arm = {{"Prime0", 3, 5}, {"Big0", 2, 3}, {"Big1", 2, 3},
    {"Big2", 2, 3}, {"LITTLE0", 1, 1}, {"LITTLE1", 1, 1}, {"LITTLE2", 1, 1}, {"LITTLE3", 1, 1}};
  switch (profile) {
    case Profile::SINGLE_CORE: return single;
    case Profile::INTEL_6P_4E: return intel;
    case Profile::ARM_1_3_4: return arm;
  }
  throw std::invalid_argument("unknown profile");
}

HybridSchedule simulate_hybrid(const std::vector<Process>& processes, Algorithm algorithm,
                               Profile profile, Placement heuristic) {
  const auto errors = validate(processes);
  if (!errors.empty()) throw std::invalid_argument(errors.front().message);
  if (algorithm != Algorithm::FCFS && algorithm != Algorithm::SJF_NON_PREEMPTIVE)
    throw std::invalid_argument("unknown algorithm");
  if (heuristic != Placement::FIRST_AVAILABLE && heuristic != Placement::FASTEST_AVAILABLE &&
      heuristic != Placement::ENERGY_FIRST) throw std::invalid_argument("unknown heuristic");
  HybridSchedule output{{}, profile, algorithm, heuristic, {}, 0, 0};
  for (const auto& core : profile_cores(profile)) output.lanes.push_back({core, 0, 0});
  auto input = processes;
  for (auto& p : input) {
    p.id = trim_ascii(p.id);
    output.total_work = add(output.total_work, p.burst);
  }
  std::vector<std::int64_t> available(output.lanes.size(), 0);
  std::vector<bool> dispatched(input.size(), false);
  std::vector<Segment> segments;
  std::int64_t now = 0;
  std::size_t remaining = input.size();
  while (remaining != 0) {
    const auto job = choose_job(input, dispatched, now, algorithm);
    const auto lane = choose_lane(output.lanes, available, now, heuristic);
    if (job != input.size() && lane != output.lanes.size()) {
      auto& target = output.lanes[lane];
      if (available[lane] < now)
        segments.push_back({target.core.id, "", true, available[lane], now});
      const auto duration = add(input[job].burst / target.core.rate,
                                input[job].burst % target.core.rate != 0 ? 1 : 0);
      const auto end = add(now, duration);
      segments.push_back({target.core.id, input[job].id, false, now, end});
      available[lane] = end;
      target.busy_ticks = add(target.busy_ticks, duration);
      dispatched[job] = true;
      --remaining;
      continue;
    }
    // Only future arrivals and completions advance virtual time; no tick-by-tick loop.
    auto next = std::numeric_limits<std::int64_t>::max();
    for (std::size_t i = 0; i < input.size(); ++i)
      if (!dispatched[i] && input[i].arrival > now) next = std::min(next, input[i].arrival);
    for (const auto end : available) if (end > now) next = std::min(next, end);
    now = next;
  }
  const auto makespan = *std::max_element(available.begin(), available.end());
  for (std::size_t i = 0; i < output.lanes.size(); ++i) {
    auto& lane = output.lanes[i];
    if (available[i] < makespan)
      segments.push_back({lane.core.id, "", true, available[i], makespan});
    lane.utilisation = static_cast<double>(lane.busy_ticks) / static_cast<double>(makespan);
    output.energy_index = add(output.energy_index, multiply(lane.busy_ticks, lane.core.energy_per_tick));
  }
  std::sort(segments.begin(), segments.end(), [](const auto& a, const auto& b) {
    return std::tie(a.begin, a.core_id) < std::tie(b.begin, b.core_id);
  });
  output.schedule = compute_schedule_metrics(input, std::move(segments));
  return output;
}
}  // namespace schedlab
