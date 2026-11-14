#include "native.hpp"
#include "check.hpp"
#include <limits>
using namespace schedlab::native;
int main() {
  const auto odd = statistics({9, 1, 3});
  CHECK(odd.median_ms == 3 && odd.min_ms == 1 && odd.max_ms == 9);
  CHECK(statistics({2, 8, 4, 6}).median_ms == 5);
  CHECK(statistics({5000}).median_ms == 5000);
  for (const auto& invalid : std::vector<std::vector<double>>{{}, {0}, {-1}, {5000.1},
      {std::numeric_limits<double>::infinity()}, {std::numeric_limits<double>::quiet_NaN()}})
    rejects([&] { statistics(invalid); });
  return failures == 0 ? 0 : 1;
}
