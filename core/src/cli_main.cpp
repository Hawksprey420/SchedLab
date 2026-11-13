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
  if (argc != 2 || !schedlab::parse_algorithm_name(argv[1])) {
    std::cerr << "usage: schedlab-cli <fcfs|sjf> < input.txt\n";
    return schedlab::kExitUsage;
  }

  std::ostringstream input;
  input << std::cin.rdbuf();

  const schedlab::TextRun run = schedlab::run_text(argv[1], input.str());
  std::cout << run.stdout_text;
  return run.exit_code;
}
