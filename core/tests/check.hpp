// Minimal test helpers: no framework, just counted failures and a nonzero exit code.
#pragma once

#include <cmath>
#include <iostream>
#include <sstream>
#include <string>

namespace check {

inline int& failure_count() {
  static int count = 0;
  return count;
}

inline void report_failure(const char* file, int line, const std::string& what) {
  std::cerr << file << ':' << line << ": FAILED " << what << '\n';
  ++failure_count();
}

template <typename Actual, typename Expected>
void expect_equal(const Actual& actual, const Expected& expected, const char* actual_text,
                  const char* expected_text, const char* file, int line) {
  if (actual == expected) return;
  std::ostringstream what;
  what << "CHECK_EQ(" << actual_text << ", " << expected_text << "): actual " << actual
       << ", expected " << expected;
  report_failure(file, line, what.str());
}

inline void expect_near(double actual, double expected, double tolerance, const char* actual_text,
                        const char* file, int line) {
  if (std::fabs(actual - expected) <= tolerance) return;
  std::ostringstream what;
  what << "CHECK_NEAR(" << actual_text << "): actual " << actual << ", expected " << expected;
  report_failure(file, line, what.str());
}

// Call at the end of main: prints a summary and returns the process exit code.
inline int finish(const char* suite) {
  if (failure_count() == 0) {
    std::cout << suite << ": all checks passed\n";
    return 0;
  }
  std::cerr << suite << ": " << failure_count() << " check(s) failed\n";
  return 1;
}

}  // namespace check

#define CHECK(condition) \
  do { \
    if (!(condition)) check::report_failure(__FILE__, __LINE__, "CHECK(" #condition ")"); \
  } while (false)

#define CHECK_EQ(actual, expected) \
  check::expect_equal((actual), (expected), #actual, #expected, __FILE__, __LINE__)

// Averages are compared with a fixed tolerance of 1e-9.
#define CHECK_NEAR(actual, expected) \
  check::expect_near((actual), (expected), 1e-9, #actual, __FILE__, __LINE__)
