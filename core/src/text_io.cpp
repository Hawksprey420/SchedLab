#include "schedlab/text_io.hpp"

#include <charconv>
#include <cstdint>
#include <sstream>
#include <system_error>
#include <stdexcept>

#include "schedlab/format.hpp"
#include "schedlab/scheduler.hpp"

namespace schedlab {
namespace {

// Parses the whole token as a base-10 integer of type T; rejects "12x", "1.5", "" and
// out-of-range values instead of silently truncating.
template <typename T>
std::optional<T> parse_integer(const std::string& token) {
  T value{};
  const char* end = token.data() + token.size();
  const auto [stop, error] = std::from_chars(token.data(), end, value);
  if (error != std::errc{} || stop != end) return std::nullopt;
  return value;
}

std::vector<std::string> split_fields(const std::string& line) {
  std::istringstream stream(line);
  std::vector<std::string> fields;
  for (std::string field; stream >> field;) fields.push_back(field);
  return fields;
}

bool is_ignorable(const std::string& line) {
  const std::vector<std::string> fields = split_fields(line);
  return fields.empty() || fields.front().front() == '#';
}

// Parses one numeric field. `index` counts data lines from 0 and is used in error reports.
// Appends to `errors` and returns nothing when the token is not a valid integer.
template <typename T>
std::optional<T> parse_field(const std::string& token, const char* field, std::size_t index,
                             std::size_t line_number, std::vector<ValidationError>& errors) {
  const std::optional<T> value = parse_integer<T>(token);
  if (!value) {
    errors.push_back({index, field,
                      "line " + std::to_string(line_number) + ": " + field +
                          " is not a base-10 integer in the supported range: \"" + token + "\""});
  }
  return value;
}

std::optional<Process> parse_process_line(const std::string& line, std::size_t index,
                                          std::size_t line_number,
                                          std::vector<ValidationError>& errors) {
  const std::vector<std::string> fields = split_fields(line);
  if (fields.size() != 4) {
    errors.push_back({index, "line",
                      "line " + std::to_string(line_number) +
                          ": expected 4 fields (id arrival burst priority), got " +
                          std::to_string(fields.size())});
    return std::nullopt;
  }
  const auto arrival = parse_field<std::int64_t>(fields[1], "arrival", index, line_number, errors);
  const auto burst = parse_field<std::int64_t>(fields[2], "burst", index, line_number, errors);
  const auto priority = parse_field<int>(fields[3], "priority", index, line_number, errors);
  if (!arrival || !burst || !priority) return std::nullopt;
  return Process{fields[0], *arrival, *burst, *priority};
}

}  // namespace

std::optional<Algorithm> parse_algorithm_name(const std::string& name) {
  if (name == "fcfs") return Algorithm::FCFS;
  if (name == "sjf") return Algorithm::SJF_NON_PREEMPTIVE;
  return std::nullopt;
}

std::optional<Profile> parse_profile_name(const std::string& name) {
  if (name == "SINGLE_CORE") return Profile::SINGLE_CORE;
  if (name == "INTEL_6P_4E") return Profile::INTEL_6P_4E;
  if (name == "ARM_1_3_4") return Profile::ARM_1_3_4;
  return std::nullopt;
}

std::optional<Placement> parse_placement_name(const std::string& name) {
  if (name == "FIRST_AVAILABLE") return Placement::FIRST_AVAILABLE;
  if (name == "FASTEST_AVAILABLE") return Placement::FASTEST_AVAILABLE;
  if (name == "ENERGY_FIRST") return Placement::ENERGY_FIRST;
  return std::nullopt;
}

std::string profile_name(Profile profile) {
  switch (profile) {
    case Profile::SINGLE_CORE: return "SINGLE_CORE";
    case Profile::INTEL_6P_4E: return "INTEL_6P_4E";
    case Profile::ARM_1_3_4: return "ARM_1_3_4";
  }
  throw std::invalid_argument("unknown profile");
}

std::string placement_name(Placement placement) {
  switch (placement) {
    case Placement::FIRST_AVAILABLE: return "FIRST_AVAILABLE";
    case Placement::FASTEST_AVAILABLE: return "FASTEST_AVAILABLE";
    case Placement::ENERGY_FIRST: return "ENERGY_FIRST";
  }
  throw std::invalid_argument("unknown heuristic");
}

std::vector<Process> parse_processes(const std::string& text, std::vector<ValidationError>& errors) {
  std::istringstream input(text);
  std::vector<Process> processes;
  std::size_t data_lines = 0;
  std::size_t line_number = 0;
  for (std::string line; std::getline(input, line);) {
    ++line_number;
    // Windows editors often save text files with a UTF-8 byte-order mark; without this
    // it would become part of the first process ID.
    if (line_number == 1 && line.rfind("\xEF\xBB\xBF", 0) == 0) line.erase(0, 3);
    if (is_ignorable(line)) continue;
    if (auto process = parse_process_line(line, data_lines, line_number, errors)) {
      processes.push_back(*process);
    }
    ++data_lines;
  }
  return processes;
}

TextRun run_text(const std::string& algorithm_name, const std::string& input) {
  const std::optional<Algorithm> algorithm = parse_algorithm_name(algorithm_name);
  if (!algorithm) return {kExitUsage, ""};

  std::vector<ValidationError> errors;
  const std::vector<Process> processes = parse_processes(input, errors);

  // Line-level problems are reported alone: the process list is incomplete, so the
  // validation result (and its indices) would be misleading.
  if (errors.empty()) errors = validate(processes);
  if (!errors.empty()) return {kExitInvalidInput, format_errors(errors)};

  return {kExitOk, format_schedule(simulate_single_core(processes, *algorithm))};
}

TextRun run_hybrid_text(const std::string& algorithm_name, const std::string& profile,
                        const std::string& heuristic, const std::string& input) {
  const auto algorithm = parse_algorithm_name(algorithm_name);
  const auto topology = parse_profile_name(profile);
  const auto placement = parse_placement_name(heuristic);
  if (!algorithm || !topology || !placement) return {kExitUsage, ""};
  std::vector<ValidationError> errors;
  const auto processes = parse_processes(input, errors);
  if (errors.empty()) errors = validate(processes);
  if (!errors.empty()) return {kExitInvalidInput, format_errors(errors)};
  try {
    return {kExitOk, format_hybrid_schedule(simulate_hybrid(processes, *algorithm, *topology, *placement))};
  } catch (const std::overflow_error& error) {
    return {kExitInvalidInput, format_errors({{kWholeInput, "processes", error.what()}})};
  }
}

}  // namespace schedlab
