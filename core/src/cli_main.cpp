// schedlab-cli <fcfs|sjf> < input.txt
//
// Input: one process per line as "id arrival burst priority". Blank lines and lines
// starting with '#' are ignored. See docs/core-contract.md for the output format.
// All behaviour lives in schedlab::run_text; this file only moves bytes in and out.
#include <iostream>
#include <sstream>
#include <string>

#include "schedlab/text_io.hpp"

int main(int argc, char** argv) {
  const bool hybrid = argc == 5 && std::string(argv[1]) == "hybrid";
  if ((!hybrid && (argc != 2 || !schedlab::parse_algorithm_name(argv[1]))) ||
      (hybrid && (!schedlab::parse_algorithm_name(argv[2]) ||
                  !schedlab::parse_profile_name(argv[3]) || !schedlab::parse_placement_name(argv[4])))) {
    if (argc > 1 && std::string(argv[1]) == "hybrid") {
      std::cerr << "usage: schedlab-cli hybrid <fcfs|sjf> <SINGLE_CORE|INTEL_6P_4E|ARM_1_3_4> "
        "<FIRST_AVAILABLE|FASTEST_AVAILABLE|ENERGY_FIRST> < input.txt\n";
    } else {
      std::cerr << "usage: schedlab-cli <fcfs|sjf> < input.txt\n";
    }
    return schedlab::kExitUsage;
  }

  std::ostringstream input;
  input << std::cin.rdbuf();

  const schedlab::TextRun run = hybrid
    ? schedlab::run_hybrid_text(argv[2], argv[3], argv[4], input.str())
    : schedlab::run_text(argv[1], input.str());
  std::cout << run.stdout_text;
  return run.exit_code;
}
