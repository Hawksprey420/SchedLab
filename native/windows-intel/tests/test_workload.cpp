#include "native.hpp"
#include "check.hpp"
using namespace schedlab::native;

template <typename F> void stops(F action) {
  try { action(); CHECK(false); } catch (const std::runtime_error& error) { CHECK(std::string(error.what()).size() > 0); }
}
int main() {
  int samples = 0;
  const auto tiny = compute_work(4, [&] { ++samples; return true; });
  CHECK(tiny.completed && tiny.iterations_completed == 4 && tiny.checksum == 768);
  CHECK(samples == 1);
  samples = 0;
  const auto sampled = compute_work(sample_interval + 1, [&] { ++samples; return true; });
  CHECK(sampled.completed && samples == 2);
  samples = 0;
  const auto interrupted = compute_work(sample_interval * 3, [&] { return ++samples < 2; });
  CHECK(!interrupted.completed && interrupted.iterations_completed == sample_interval);
  CHECK(samples == 2);
  check_run_limits(4999, 29999, false);
  stops([] { check_run_limits(5000, 0, false); });
  stops([] { check_run_limits(0, 30000, false); });
  stops([] { check_run_limits(0, 0, true); });
  return failures == 0 ? 0 : 1;
}
