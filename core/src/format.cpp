#include "schedlab/format.hpp"

#include <cstdio>
#include "schedlab/text_io.hpp"

namespace schedlab {
namespace {

// snprintf rather than <format> / iostream precision: it is available in every
// toolchain we target (including Emscripten) and always uses '.' in the "C" locale.
std::string four_decimals(double value) {
  char buffer[64];
  std::snprintf(buffer, sizeof buffer, "%.4f", value);
  return buffer;
}

std::string format_segment(const Segment& segment) {
  const std::string& who = segment.idle ? std::string("IDLE") : segment.process_id;
  return "SEGMENT " + segment.core_id + " " + who + " " + std::to_string(segment.begin) + " " +
         std::to_string(segment.end) + "\n";
}

std::string format_result(const ProcessResult& result) {
  return "RESULT " + result.id + " start=" + std::to_string(result.start) +
         " completion=" + std::to_string(result.completion) +
         " waiting=" + std::to_string(result.waiting) +
         " turnaround=" + std::to_string(result.turnaround) +
         " response=" + std::to_string(result.response) + "\n";
}

}  // namespace

std::string format_schedule(const Schedule& schedule) {
  std::string text;
  for (const Segment& segment : schedule.segments) text += format_segment(segment);
  for (const ProcessResult& result : schedule.results) text += format_result(result);
  text += "AVERAGE waiting=" + four_decimals(schedule.average_waiting) +
          " turnaround=" + four_decimals(schedule.average_turnaround) + "\n";
  text += "MAKESPAN " + std::to_string(schedule.makespan) + "\n";
  return text;
}

std::string format_errors(const std::vector<ValidationError>& errors) {
  std::string text;
  for (const ValidationError& error : errors) {
    const std::string index =
        error.process_index == kWholeInput ? "-" : std::to_string(error.process_index);
    text += "ERROR " + index + " " + error.field + " " + error.message + "\n";
  }
  return text;
}

std::string format_hybrid_schedule(const HybridSchedule& hybrid) {
  std::string text = "MODE SIMULATED\nPROFILE " + profile_name(hybrid.profile) +
    "\nALGORITHM " + (hybrid.algorithm == Algorithm::FCFS ? "FCFS" : "SJF_NON_PREEMPTIVE") +
    "\nHEURISTIC " + placement_name(hybrid.heuristic) + "\n" + format_schedule(hybrid.schedule);
  for (const auto& lane : hybrid.lanes) {
    text += "LANE " + lane.core.id + " rate=" + std::to_string(lane.core.rate) +
      " energyPerTick=" + std::to_string(lane.core.energy_per_tick) +
      " busyTicks=" + std::to_string(lane.busy_ticks) +
      " utilisation=" + four_decimals(lane.utilisation) + "\n";
  }
  return text + "TOTAL_WORK " + std::to_string(hybrid.total_work) +
    "\nENERGY_INDEX " + std::to_string(hybrid.energy_index) + "\n";
}

}  // namespace schedlab
