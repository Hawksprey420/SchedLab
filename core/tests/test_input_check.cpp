// Number checks applied to values that arrive from JavaScript as doubles.
#include <cmath>
#include <cstdint>
#include <limits>

#include "check.hpp"
#include "schedlab/input_check.hpp"

using schedlab::check_integer_field;
using schedlab::kMaxExactInteger;

namespace {

constexpr double kNaN = std::numeric_limits<double>::quiet_NaN();
constexpr double kInf = std::numeric_limits<double>::infinity();

void accepts_integers_inside_the_range_including_both_ends() {
  const auto low = check_integer_field(0.0, "arrival", 0, 10);
  CHECK(low.ok);
  CHECK_EQ(low.value, 0);
  const auto high = check_integer_field(10.0, "arrival", 0, 10);
  CHECK(high.ok);
  CHECK_EQ(high.value, 10);
  CHECK(check_integer_field(-0.0, "arrival", 0, 10).ok);
}

void rejects_values_outside_the_range() {
  CHECK(!check_integer_field(-1.0, "arrival", 0, 10).ok);
  CHECK(!check_integer_field(11.0, "arrival", 0, 10).ok);
}

void rejects_fractions() {
  CHECK(!check_integer_field(1.5, "burst", 0, 10).ok);
  CHECK(!check_integer_field(0.1, "burst", 0, 10).ok);
}

void rejects_non_finite_values() {
  CHECK(!check_integer_field(kNaN, "burst", -10, 10).ok);
  CHECK(!check_integer_field(kInf, "burst", -10, 10).ok);
  CHECK(!check_integer_field(-kInf, "burst", -10, 10).ok);
}

void rejects_values_a_double_cannot_hold_exactly() {
  const double limit = static_cast<double>(kMaxExactInteger);
  CHECK(check_integer_field(limit, "arrival", 0, kMaxExactInteger).ok);
  CHECK(!check_integer_field(limit + 1.0, "arrival", 0, kMaxExactInteger).ok);
  CHECK(!check_integer_field(1e300, "arrival", 0, kMaxExactInteger).ok);
}

void clamps_the_caller_range_to_exact_integers() {
  // A caller passing the full int64 range still cannot get an inexact value through.
  const auto huge = check_integer_field(1e18, "arrival", 0, std::numeric_limits<std::int64_t>::max());
  CHECK(!huge.ok);
}

void message_names_the_field_and_the_offending_value() {
  const auto bad = check_integer_field(1.5, "burst", 1, 10);
  CHECK(bad.message.find("burst") != std::string::npos);
  CHECK(bad.message.find("1.5") != std::string::npos);
  CHECK(schedlab::not_a_number_message("priority").find("priority") != std::string::npos);
}

}  // namespace

int main() {
  accepts_integers_inside_the_range_including_both_ends();
  rejects_values_outside_the_range();
  rejects_fractions();
  rejects_non_finite_values();
  rejects_values_a_double_cannot_hold_exactly();
  clamps_the_caller_range_to_exact_integers();
  message_names_the_field_and_the_offending_value();
  return check::finish("test_input_check");
}
