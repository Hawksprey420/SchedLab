// T7: every validation rule in docs/core-contract.md.
#include <cstdint>
#include <limits>
#include <string>
#include <vector>

#include "check.hpp"
#include "schedlab/scheduler.hpp"

using schedlab::kMaxProcesses;
using schedlab::kWholeInput;
using schedlab::Process;
using schedlab::ValidationError;

namespace {

constexpr std::int64_t kInt64Max = std::numeric_limits<std::int64_t>::max();

Process proc(std::string id, std::int64_t arrival, std::int64_t burst) {
  return Process{std::move(id), arrival, burst, 0};
}

// Asserts that exactly one error was reported, for the given process and field.
void check_single_error(const std::vector<Process>& input, std::size_t index,
                        const std::string& field) {
  const std::vector<ValidationError> errors = schedlab::validate(input);
  CHECK_EQ(errors.size(), 1U);
  if (errors.size() != 1) return;
  CHECK_EQ(errors[0].process_index, index);
  CHECK_EQ(errors[0].field, field);
  CHECK(!errors[0].message.empty());
}

void valid_input_has_no_errors() {
  CHECK(schedlab::validate({proc("P1", 0, 8), proc("P2", 1, 4)}).empty());
  CHECK(schedlab::validate({proc("P1", 0, 1)}).empty());
}

void empty_input_is_rejected() {
  check_single_error({}, kWholeInput, "processes");
}

void process_count_is_capped() {
  std::vector<Process> input;
  for (std::size_t i = 0; i < kMaxProcesses; ++i) input.push_back(proc("P" + std::to_string(i), 0, 1));
  CHECK(schedlab::validate(input).empty());  // exactly 100 is allowed

  input.push_back(proc("P100", 0, 1));  // 101st
  check_single_error(input, kWholeInput, "processes");
}

void id_must_not_be_blank() {
  check_single_error({proc("", 0, 1)}, 0, "id");
  check_single_error({proc("   \t ", 0, 1)}, 0, "id");
}

void idle_id_is_reserved_in_any_case() {
  check_single_error({proc("IDLE", 0, 1)}, 0, "id");
  check_single_error({proc("idle", 0, 1)}, 0, "id");
  check_single_error({proc(" idle ", 0, 1)}, 0, "id");
  CHECK(schedlab::validate({proc("IDLE2", 0, 1)}).empty());  // only the exact word is reserved
}

void duplicate_ids_are_reported_on_the_later_process() {
  check_single_error({proc("P1", 0, 1), proc("P1", 0, 1)}, 1, "id");
  // Surrounding whitespace does not make an ID distinct.
  check_single_error({proc("P1", 0, 1), proc("  P1 ", 0, 1)}, 1, "id");
  check_single_error({proc(" P1", 0, 1), proc("P2", 0, 1), proc("P1 ", 0, 1)}, 2, "id");
  // Uniqueness is case-sensitive.
  CHECK(schedlab::validate({proc("p1", 0, 1), proc("P1", 0, 1)}).empty());
}

void negative_arrival_is_rejected() {
  check_single_error({proc("P1", -1, 1)}, 0, "arrival");
  CHECK(schedlab::validate({proc("P1", 0, 1)}).empty());  // zero is fine
}

void burst_must_be_positive() {
  check_single_error({proc("P1", 0, 0)}, 0, "burst");
  check_single_error({proc("P1", 0, -5)}, 0, "burst");
}

void message_names_the_offending_value() {
  const auto errors = schedlab::validate({proc("P1", -7, 1)});
  CHECK_EQ(errors.size(), 1U);
  if (!errors.empty()) CHECK(errors[0].message.find("-7") != std::string::npos);
}

void total_time_overflow_is_reported_without_overflowing() {
  // max(arrival) + sum(burst) must fit in int64; each case below does not.
  check_single_error({proc("P1", kInt64Max, 1)}, kWholeInput, "burst");
  check_single_error({proc("P1", kInt64Max - 5, 10)}, kWholeInput, "burst");
  check_single_error({proc("P1", 0, kInt64Max), proc("P2", 0, 1)}, kWholeInput, "burst");
  check_single_error({proc("P1", 0, kInt64Max), proc("P2", 0, kInt64Max)}, kWholeInput, "burst");

  // Exactly INT64_MAX is representable and therefore allowed.
  CHECK(schedlab::validate({proc("P1", kInt64Max - 10, 10)}).empty());
  CHECK(schedlab::validate({proc("P1", 0, kInt64Max)}).empty());
}

void overflow_is_only_checked_when_each_value_is_valid() {
  // The negative arrival is the only reported problem; the huge burst is not summed.
  check_single_error({proc("P1", -1, 5), proc("P2", 0, kInt64Max)}, 0, "arrival");
}

void all_errors_are_returned_in_order() {
  const std::vector<Process> input = {
      proc(" ", -1, 0),  // id, arrival, burst
      proc("A", 0, 1),
      proc("A", 0, 1),  // duplicate id
  };
  const auto errors = schedlab::validate(input);
  CHECK_EQ(errors.size(), 4U);
  if (errors.size() != 4) return;
  CHECK_EQ(errors[0].process_index, 0U);
  CHECK_EQ(errors[0].field, "id");
  CHECK_EQ(errors[1].process_index, 0U);
  CHECK_EQ(errors[1].field, "arrival");
  CHECK_EQ(errors[2].process_index, 0U);
  CHECK_EQ(errors[2].field, "burst");
  CHECK_EQ(errors[3].process_index, 2U);
  CHECK_EQ(errors[3].field, "id");
}

}  // namespace

int main() {
  valid_input_has_no_errors();
  empty_input_is_rejected();
  process_count_is_capped();
  id_must_not_be_blank();
  idle_id_is_reserved_in_any_case();
  duplicate_ids_are_reported_on_the_later_process();
  negative_arrival_is_rejected();
  burst_must_be_positive();
  message_names_the_offending_value();
  total_time_overflow_is_reported_without_overflowing();
  overflow_is_only_checked_when_each_value_is_valid();
  all_errors_are_returned_in_order();
  return check::finish("test_validation");
}
