#include "native.hpp"
#include <map>
#include <set>
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
std::uint64_t class_sample_count(const std::vector<Observation>& observations, const std::vector<CpuSet>& topology, std::uint8_t efficiency_class) {
  std::set<std::pair<std::uint16_t, std::uint8_t>> class_cpus;
  for (const auto& set : topology)
    if (set.efficiency_class == efficiency_class) class_cpus.emplace(set.group, set.logical_processor_index);
  std::uint64_t samples = 0;
  for (const auto& observed : observations)
    if (class_cpus.contains({observed.group, observed.logical_processor_index})) samples += observed.samples;
  return samples;
}
}
