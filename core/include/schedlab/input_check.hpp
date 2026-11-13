// Checks for numbers that reach the core as IEEE doubles (JavaScript has no integer type).
// Kept free of any Emscripten types so it can be unit-tested natively.
#pragma once

#include <cstdint>
#include <string>

namespace schedlab {

// Largest magnitude where every integer is exactly representable as a double (2^53 - 1).
inline constexpr std::int64_t kMaxExactInteger = 9007199254740991;

struct IntegerCheck {
  bool ok;
  std::int64_t value;    // meaningful only when ok
  std::string message;   // names the field and the offending value; empty when ok
};

// Accepts `value` only if it is finite, has no fraction and lies in [min, max]. The range
// is also limited to +-kMaxExactInteger, so a double that merely rounds to an integer
// (1e300, 2^53 + 1) is never mistaken for the number the user typed.
IntegerCheck check_integer_field(double value, const std::string& field, std::int64_t min,
                                 std::int64_t max);

// Message for a field that is missing or is not a JavaScript number.
std::string not_a_number_message(const std::string& field);

}  // namespace schedlab
