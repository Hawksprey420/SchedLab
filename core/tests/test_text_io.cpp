// Text front end shared by schedlab-cli and the WebAssembly runText call.
#include <string>
#include <vector>

#include "check.hpp"
#include "schedlab/text_io.hpp"

using schedlab::Process;
using schedlab::TextRun;
using schedlab::ValidationError;

namespace {

const std::string kT1 = "P1 0 8 1\nP2 0 4 1\nP3 0 2 1\n";

void parses_data_lines_and_skips_comments_and_blanks() {
  std::vector<ValidationError> errors;
  const std::vector<Process> processes =
      schedlab::parse_processes("# header\n\nP1 0 8 1\n  P2\t1 4 -3  \n", errors);
  CHECK(errors.empty());
  CHECK_EQ(processes.size(), 2U);
  if (processes.size() != 2) return;
  CHECK_EQ(processes[1].id, "P2");
  CHECK_EQ(processes[1].arrival, 1);
  CHECK_EQ(processes[1].burst, 4);
  CHECK_EQ(processes[1].priority, -3);
}

void utf8_byte_order_mark_is_not_part_of_the_first_id() {
  std::vector<ValidationError> errors;
  const std::vector<Process> processes = schedlab::parse_processes("\xEF\xBB\xBFP1 0 8 1\n", errors);
  CHECK(errors.empty());
  CHECK_EQ(processes.size(), 1U);
  if (!processes.empty()) CHECK_EQ(processes[0].id, "P1");
}

void crlf_line_endings_are_accepted() {
  std::vector<ValidationError> errors;
  const std::vector<Process> processes = schedlab::parse_processes("P1 0 8 1\r\nP2 1 4 1\r\n", errors);
  CHECK(errors.empty());
  CHECK_EQ(processes.size(), 2U);
}

void malformed_lines_are_reported_with_data_line_index() {
  std::vector<ValidationError> errors;
  schedlab::parse_processes("P1 0 5 1\nP2 1.5 5 1\nP3 0 5\n", errors);
  CHECK_EQ(errors.size(), 2U);
  if (errors.size() != 2) return;
  CHECK_EQ(errors[0].process_index, 1U);
  CHECK_EQ(errors[0].field, "arrival");
  CHECK_EQ(errors[1].process_index, 2U);
  CHECK_EQ(errors[1].field, "line");
}

void valid_input_runs_with_exit_code_zero() {
  const TextRun run = schedlab::run_text("fcfs", kT1);
  CHECK_EQ(run.exit_code, 0);
  CHECK(run.stdout_text.rfind("SEGMENT CPU0 P1 0 8\n", 0) == 0);
  CHECK(run.stdout_text.find("MAKESPAN 14\n") != std::string::npos);
}

void algorithm_name_selects_the_algorithm() {
  const TextRun sjf = schedlab::run_text("sjf", kT1);
  CHECK_EQ(sjf.exit_code, 0);
  CHECK(sjf.stdout_text.rfind("SEGMENT CPU0 P3 0 2\n", 0) == 0);
}

void unknown_algorithm_is_a_usage_error_with_no_output() {
  for (const char* name : {"", "FCFS", "rr", "sjf "}) {
    const TextRun run = schedlab::run_text(name, kT1);
    CHECK_EQ(run.exit_code, schedlab::kExitUsage);
    CHECK(run.stdout_text.empty());
  }
}

void invalid_input_reports_errors_and_exit_code_one() {
  const TextRun run = schedlab::run_text("fcfs", "P1 0 0 1\n");
  CHECK_EQ(run.exit_code, schedlab::kExitInvalidInput);
  CHECK_EQ(run.stdout_text, "ERROR 0 burst burst must be > 0, got 0\n");
}

void empty_input_is_a_whole_input_error() {
  const TextRun run = schedlab::run_text("sjf", "# nothing\n");
  CHECK_EQ(run.exit_code, schedlab::kExitInvalidInput);
  CHECK_EQ(run.stdout_text, "ERROR - processes at least one process is required\n");
}

void line_errors_are_reported_without_validation_errors() {
  const TextRun run = schedlab::run_text("fcfs", "P1 0 x 1\nP1 0 0 1\n");
  CHECK_EQ(run.exit_code, schedlab::kExitInvalidInput);
  CHECK(run.stdout_text.find("ERROR 0 burst line 1") == 0);
  CHECK(run.stdout_text.find("duplicate") == std::string::npos);
}

}  // namespace

int main() {
  parses_data_lines_and_skips_comments_and_blanks();
  utf8_byte_order_mark_is_not_part_of_the_first_id();
  crlf_line_endings_are_accepted();
  malformed_lines_are_reported_with_data_line_index();
  valid_input_runs_with_exit_code_zero();
  algorithm_name_selects_the_algorithm();
  unknown_algorithm_is_a_usage_error_with_no_output();
  invalid_input_reports_errors_and_exit_code_one();
  empty_input_is_a_whole_input_error();
  line_errors_are_reported_without_validation_errors();
  return check::finish("test_text_io");
}
