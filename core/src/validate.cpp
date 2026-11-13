// Input validation. Collects every problem instead of stopping at the first one so the
// UI and CLI can show them all at once.
#include <algorithm>
#include <cstdint>
#include <limits>
#include <string>
#include <unordered_map>
#include <vector>

#include "schedlab/scheduler.hpp"
#include "text_util.hpp"

namespace schedlab {
namespace {

constexpr std::int64_t kInt64Max = std::numeric_limits<std::int64_t>::max();

// Adds two non-negative values; returns false instead of overflowing.
bool checked_add(std::int64_t a, std::int64_t b, std::int64_t& sum) {
  if (a > kInt64Max - b) return false;
  sum = a + b;
  return true;
}

std::string quoted(const std::string& text) { return "\"" + text + "\""; }

void validate_count(const std::vector<Process>& processes, std::vector<ValidationError>& errors) {
  if (processes.empty()) {
    errors.push_back({kWholeInput, "processes", "at least one process is required"});
  } else if (processes.size() > kMaxProcesses) {
    errors.push_back({kWholeInput, "processes",
                      "at most " + std::to_string(kMaxProcesses) + " processes are allowed, got " +
                          std::to_string(processes.size())});
  }
}

// Checks one ID. `first_index_of_id` maps each trimmed ID seen so far to the index of the
// process that used it first, so a duplicate is reported on the later process.
void validate_id(std::size_t index, const Process& process,
                 std::unordered_map<std::string, std::size_t>& first_index_of_id,
                 std::vector<ValidationError>& errors) {
  const std::string id = trim_ascii(process.id);
  if (id.empty()) {
    errors.push_back({index, "id", "id must not be empty or whitespace-only"});
    return;
  }
  if (equals_ignoring_ascii_case(id, "IDLE")) {
    errors.push_back({index, "id", "id " + quoted(id) + " is reserved for idle time"});
    return;
  }
  const auto [entry, inserted] = first_index_of_id.emplace(id, index);
  if (!inserted) {
    errors.push_back({index, "id",
                      "duplicate id " + quoted(id) + " (already used by process " +
                          std::to_string(entry->second) + ")"});
  }
}

void validate_times(std::size_t index, const Process& process,
                    std::vector<ValidationError>& errors) {
  if (process.arrival < 0) {
    errors.push_back({index, "arrival",
                      "arrival must be >= 0, got " + std::to_string(process.arrival)});
  }
  if (process.burst <= 0) {
    errors.push_back({index, "burst", "burst must be > 0, got " + std::to_string(process.burst)});
  }
}

bool all_times_valid(const std::vector<Process>& processes) {
  for (const Process& process : processes) {
    if (process.arrival < 0 || process.burst <= 0) return false;
  }
  return true;
}

// The simulation never produces a time larger than max(arrival) + sum(burst), so if that
// total fits in int64 every later addition (start + burst, ...) is safe as well.
void validate_total_time(const std::vector<Process>& processes,
                         std::vector<ValidationError>& errors) {
  std::int64_t total = 0;
  for (const Process& process : processes) total = std::max(total, process.arrival);
  for (const Process& process : processes) {
    if (!checked_add(total, process.burst, total)) {
      errors.push_back({kWholeInput, "burst",
                        "largest arrival plus the sum of all bursts does not fit in a "
                        "64-bit integer"});
      return;
    }
  }
}

}  // namespace

std::vector<ValidationError> validate(const std::vector<Process>& processes) {
  std::vector<ValidationError> errors;
  validate_count(processes, errors);

  std::unordered_map<std::string, std::size_t> first_index_of_id;
  for (std::size_t i = 0; i < processes.size(); ++i) {
    validate_id(i, processes[i], first_index_of_id, errors);
    validate_times(i, processes[i], errors);
  }

  // Overflow is only meaningful when every arrival and burst is individually valid.
  if (all_times_valid(processes)) validate_total_time(processes, errors);

  return errors;
}

}  // namespace schedlab
