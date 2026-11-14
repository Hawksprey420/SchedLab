#include "native.hpp"
#include <map>
#include <stdexcept>
namespace schedlab::native {
std::vector<CpuSet> select_class(const std::vector<CpuSet>& sets, const std::string& requested_class) {
  if (requested_class != "performance" && requested_class != "efficient")
    throw std::invalid_argument("Unknown requested CPU class");
  std::map<std::uint8_t, std::vector<CpuSet>> classes;
  for (const auto& set : sets) {
    if (!set.allocated || set.allocated_to_target_process)
      classes[set.efficiency_class].push_back(set);
  }
  if (classes.size() < 2) return {};
  return requested_class == "performance" ? classes.rbegin()->second : classes.begin()->second;
}
}
