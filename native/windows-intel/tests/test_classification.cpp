#include "native.hpp"
#include "check.hpp"
using namespace schedlab::native;
int main() {
  const std::vector<CpuSet> sets = {
    {9, 1, 0, 0, 10}, {8, 0, 0, 0, 2}, {7, 0, 1, 1, 7},
    {6, 0, 2, 2, 99, false, true, false},
    {5, 1, 1, 1, 10, true, true, true},
    {4, 2, 0, 0, 0, false, true, false}};
  const auto performance = select_class(sets, "performance");
  CHECK(performance.size() == 2);
  if (performance.size() == 2) CHECK(performance[0].id == 9 && performance[1].id == 5);
  const auto efficient = select_class(sets, "efficient");
  CHECK(efficient.size() == 1);
  if (!efficient.empty()) CHECK(efficient[0].id == 8);
  CHECK(select_class({}, "performance").empty());
  CHECK(select_class({sets[0], sets[4]}, "performance").empty());
  CHECK(select_class({sets[0], sets[3]}, "efficient").empty());
  rejects([&] { select_class(sets, "unknown"); });
  const std::vector<CpuSet> sampling_topology{
    {1, 0, 0, 0, 10}, {2, 1, 0, 0, 2}, {3, 0, 1, 1, 10, false, true, false}};
  CHECK(class_sample_count({{0, 0, 4}, {1, 0, 9}, {0, 1, 6}, {2, 0, 7}}, sampling_topology, 10) == 10);
  CHECK(class_sample_count({{0, 0, 4}, {1, 0, 9}}, sampling_topology, 2) == 9);
  return failures == 0 ? 0 : 1;
}
