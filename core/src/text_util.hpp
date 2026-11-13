// Small ASCII string helpers shared by validation and simulation (internal header).
#pragma once

#include <cstddef>
#include <string>

namespace schedlab {

inline bool is_ascii_space(char c) {
  return c == ' ' || c == '\t' || c == '\n' || c == '\v' || c == '\f' || c == '\r';
}

// Removes leading and trailing ASCII whitespace. Non-ASCII bytes are left alone.
inline std::string trim_ascii(const std::string& text) {
  std::size_t first = 0;
  std::size_t last = text.size();
  while (first < last && is_ascii_space(text[first])) ++first;
  while (last > first && is_ascii_space(text[last - 1])) --last;
  return text.substr(first, last - first);
}

// Case-insensitive comparison for ASCII letters only, independent of the C locale.
inline bool equals_ignoring_ascii_case(const std::string& a, const std::string& b) {
  if (a.size() != b.size()) return false;
  for (std::size_t i = 0; i < a.size(); ++i) {
    const char lower_a = (a[i] >= 'A' && a[i] <= 'Z') ? static_cast<char>(a[i] - 'A' + 'a') : a[i];
    const char lower_b = (b[i] >= 'A' && b[i] <= 'Z') ? static_cast<char>(b[i] - 'A' + 'a') : b[i];
    if (lower_a != lower_b) return false;
  }
  return true;
}

}  // namespace schedlab
