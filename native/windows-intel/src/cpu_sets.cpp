#include "windows_native.hpp"
#include <limits>
#include <stdexcept>
namespace schedlab::native {
bool request_cpu_sets(const std::vector<CpuSet>& sets, std::string& error) {
  if (sets.empty() || sets.size() > std::numeric_limits<ULONG>::max())
    throw std::invalid_argument("A nonempty bounded CPU Set selection is required");
  std::vector<ULONG> ids;
  for (const auto& set : sets) ids.push_back(set.id);
  if (!SetThreadSelectedCpuSets(GetCurrentThread(), ids.data(), static_cast<ULONG>(ids.size()))) {
    error = windows_error("SetThreadSelectedCpuSets", GetLastError());
    return false;
  }
  error.clear();
  return true;
}
}
