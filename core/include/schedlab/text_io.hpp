// Text front end: the "id arrival burst priority" input format and the whole
// "algorithm name + text -> exit code + stdout" run. schedlab-cli and the WebAssembly
// runText call both go through this, so they cannot drift apart.
#pragma once

#include <optional>
#include <string>
#include <vector>

#include "schedlab/types.hpp"

namespace schedlab {

inline constexpr int kExitOk = 0;
inline constexpr int kExitInvalidInput = 1;
inline constexpr int kExitUsage = 2;

struct TextRun {
  int exit_code;
  std::string stdout_text;
};

// "fcfs" or "sjf" (lowercase, exact); anything else is nullopt.
std::optional<Algorithm> parse_algorithm_name(const std::string& name);
std::optional<Profile> parse_profile_name(const std::string& name);
std::optional<Placement> parse_placement_name(const std::string& name);
std::string profile_name(Profile profile);
std::string placement_name(Placement placement);

// One process per line as "id arrival burst priority". Blank lines and lines starting
// with '#' are ignored, and a leading UTF-8 byte-order mark is dropped. Malformed lines
// are appended to `errors` (indexed by data line, from 0) and skipped.
std::vector<Process> parse_processes(const std::string& text, std::vector<ValidationError>& errors);

// Parses, validates and simulates. Output is exactly what schedlab-cli prints to stdout:
// the formatted schedule (kExitOk), the formatted errors (kExitInvalidInput), or nothing
// for an unknown algorithm name (kExitUsage).
TextRun run_text(const std::string& algorithm_name, const std::string& input);
TextRun run_hybrid_text(const std::string& algorithm_name, const std::string& profile,
                        const std::string& heuristic, const std::string& input);

}  // namespace schedlab
