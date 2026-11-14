#include "native.hpp"
#include <stdexcept>
namespace schedlab::native {
WorkResult compute_work(std::uint64_t iterations, const std::function<bool()>& checkpoint) {
  std::uint64_t x = 88172645463325252ull, sum = 0;
  for (std::uint64_t i = 0; i < iterations; ++i) {
    if (i % sample_interval == 0 && !checkpoint()) return {sum, i, false};
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    sum += x & 0xff;
  }
  return {sum, iterations, true};
}
void check_run_limits(double run_ms, double total_ms, bool stop_requested) {
  if (stop_requested) throw std::runtime_error("Benchmark interrupted; no trace written");
  if (run_ms >= 5000) throw std::runtime_error("Benchmark exceeded the 5 second run limit; no trace written");
  if (total_ms >= 30000) throw std::runtime_error("Benchmark exceeded the 30 second total limit; no trace written");
}
}
