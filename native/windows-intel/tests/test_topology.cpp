#include "windows_native.hpp"
#include "check.hpp"
#include <cstring>
using namespace schedlab::native;

std::vector<unsigned char> record(DWORD size, CPU_SET_INFORMATION_TYPE type) {
  SYSTEM_CPU_SET_INFORMATION info{};
  info.Size = size;
  info.Type = type;
  info.CpuSet.Id = 11;
  info.CpuSet.Group = 2;
  info.CpuSet.LogicalProcessorIndex = 3;
  info.CpuSet.CoreIndex = 1;
  info.CpuSet.EfficiencyClass = 9;
  info.CpuSet.Parked = 1;
  info.CpuSet.Allocated = 1;
  info.CpuSet.AllocatedToTargetProcess = 1;
  std::vector<unsigned char> bytes(sizeof(info));
  std::memcpy(bytes.data(), &info, sizeof(info));
  return bytes;
}

int main() {
  auto known = record(sizeof(SYSTEM_CPU_SET_INFORMATION), CpuSetInformation);
  const auto sets = parse_cpu_set_records(known);
  CHECK(sets.size() == 1);
  if (!sets.empty()) {
    const auto& set = sets[0];
    CHECK(set.id == 11 && set.group == 2 && set.logical_processor_index == 3 && set.core_index == 1);
    CHECK(set.efficiency_class == 9 && set.parked && set.allocated && set.allocated_to_target_process);
  }
  CHECK(parse_cpu_set_records({}).empty());
  auto future = record(sizeof(SYSTEM_CPU_SET_INFORMATION) + 5, CpuSetInformation);
  future.resize(future.size() + 5);
  CHECK(parse_cpu_set_records(future).size() == 1);
  auto unknown = record(sizeof(SYSTEM_CPU_SET_INFORMATION), static_cast<CPU_SET_INFORMATION_TYPE>(99));
  unknown.insert(unknown.end(), known.begin(), known.end());
  CHECK(parse_cpu_set_records(unknown).size() == 1);
  for (DWORD size : {0UL, 4UL, 9UL, 9999UL}) {
    auto invalid = record(size, CpuSetInformation);
    rejects([&] { parse_cpu_set_records(invalid); });
  }
  known.pop_back();
  rejects([&] { parse_cpu_set_records(known); });
  known.resize(3);
  rejects([&] { parse_cpu_set_records(known); });
  return failures == 0 ? 0 : 1;
}
