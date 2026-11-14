#include "native.hpp"
#include <algorithm>
#include <cmath>
#include <stdexcept>
namespace schedlab::native {
Summary statistics(std::vector<double> values) {
  if (values.empty()) throw std::invalid_argument("Statistics require measured runs");
  for (double value : values)
    if (!std::isfinite(value) || value <= 0 || value > 5000)
      throw std::invalid_argument("Run duration must be finite and in (0, 5000] ms");
  std::sort(values.begin(), values.end());
  const auto middle = values.size() / 2;
  const double median = values.size() % 2 == 0 ? (values[middle - 1] + values[middle]) / 2 : values[middle];
  return {median, values.front(), values.back()};
}
}
