#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace schedlab {
enum class Profile { SINGLE_CORE, INTEL_6P_4E, ARM_1_3_4 };
enum class Placement { FIRST_AVAILABLE, FASTEST_AVAILABLE, ENERGY_FIRST };

struct Core {
  std::string id;
  std::int64_t rate;
  std::int64_t energy_per_tick;
};

struct Lane {
  Core core;
  std::int64_t busy_ticks;
  double utilisation;
};

const std::vector<Core>& profile_cores(Profile profile);
}  // namespace schedlab
