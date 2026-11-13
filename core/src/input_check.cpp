#include "schedlab/input_check.hpp"

#include <algorithm>
#include <cmath>
#include <sstream>

namespace schedlab {
namespace {

// 17 significant digits round-trip any double, so the message shows exactly what arrived.
std::string describe(double value) {
  std::ostringstream text;
  text.precision(17);
  text << value;
  return text.str();
}

}  // namespace

IntegerCheck check_integer_field(double value, const std::string& field, std::int64_t min,
                                 std::int64_t max) {
  const std::int64_t low = std::max(min, -kMaxExactInteger);
  const std::int64_t high = std::min(max, kMaxExactInteger);
  const bool is_integer = std::isfinite(value) && value == std::trunc(value);
  // low and high are at most 2^53 - 1, so converting them to double is exact.
  if (is_integer && value >= static_cast<double>(low) && value <= static_cast<double>(high)) {
    return {true, static_cast<std::int64_t>(value), ""};
  }
  return {false, 0,
          field + " must be an integer between " + std::to_string(low) + " and " +
              std::to_string(high) + ", got " + describe(value)};
}

std::string not_a_number_message(const std::string& field) {
  return field + " must be a number";
}

}  // namespace schedlab
