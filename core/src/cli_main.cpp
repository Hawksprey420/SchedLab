// schedlab-cli <fcfs|sjf> < input.txt
//
// Input: one process per line as "id arrival burst priority". Blank lines and lines
// starting with '#' are ignored. See docs/core-contract.md for the output format.
#include <charconv>
#include <cstdint>
#include <iostream>
#include <optional>
#include <sstream>
#include <string>
#include <system_error>
#include <vector>

#include "schedlab/format.hpp"
#include "schedlab/scheduler.hpp"

namespace {

using schedlab::Process;
using schedlab::ValidationError;

constexpr int kExitOk = 0;
constexpr int kExitInvalidInput = 1;
constexpr int kExitUsage = 2;

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

// Parses one data line. `index` counts data lines from 0 and is used in error reports.
// Appends to `errors` and returns nothing when the line is malformed.
template <typename T>
std::optional<T> parse_field(const std::string& token, const char* field, std::size_t index,
                             std::size_t line_number, std::vector<ValidationError>& errors) {
  const std::optional<T> value = parse_integer<T>(token);
  if (!value) {
    errors.push_back({index, field,
                      "line " + std::to_string(line_number) + ": " + field +
                          " is not a base-10 integer that fits in 64 bits: \"" + token + "\""});
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

// Reads every data line. Malformed lines are reported in `errors`; the rest are returned.
std::vector<Process> read_processes(std::istream& input, std::vector<ValidationError>& errors) {
  std::vector<Process> processes;
  std::size_t data_lines = 0;
  std::size_t line_number = 0;
  for (std::string line; std::getline(input, line);) {
    ++line_number;
    if (is_ignorable(line)) continue;
    if (auto process = parse_process_line(line, data_lines, line_number, errors)) {
      processes.push_back(*process);
    }
    ++data_lines;
  }
  return processes;
}

std::optional<schedlab::Algorithm> parse_algorithm(const std::string& name) {
  if (name == "fcfs") return schedlab::Algorithm::FCFS;
  if (name == "sjf") return schedlab::Algorithm::SJF_NON_PREEMPTIVE;
  return std::nullopt;
}

}  // namespace

int main(int argc, char** argv) {
  const std::optional<schedlab::Algorithm> algorithm =
      argc == 2 ? parse_algorithm(argv[1]) : std::nullopt;
  if (!algorithm) {
    std::cerr << "usage: schedlab-cli <fcfs|sjf> < input.txt\n";
    return kExitUsage;
  }

  std::vector<ValidationError> errors;
  const std::vector<Process> processes = read_processes(std::cin, errors);

  // Line-level problems are reported alone: the process list is incomplete, so the
  // validation result (and its indices) would be misleading.
  if (errors.empty()) errors = schedlab::validate(processes);
  if (!errors.empty()) {
    std::cout << schedlab::format_errors(errors);
    return kExitInvalidInput;
  }

  std::cout << schedlab::format_schedule(schedlab::simulate_single_core(processes, *algorithm));
  return kExitOk;
}
