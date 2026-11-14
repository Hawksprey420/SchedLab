#pragma once

#include <string>
#include <cstdint>
#include <vector>

namespace schedlab::native {

struct Arguments {
  std::string command;
  std::string requested_class = "none";
  int repeats = 0;
  std::string output;
};

Arguments parse_arguments(const std::vector<std::string>& args);

struct CpuSet {
  std::uint32_t id;
  std::uint16_t group;
  std::uint8_t logical_processor_index;
  std::uint8_t core_index;
  std::uint8_t efficiency_class;
  bool parked = false;
  bool allocated = false;
  bool allocated_to_target_process = false;
};

std::vector<CpuSet> select_class(const std::vector<CpuSet>& sets, const std::string& requested_class);

struct Summary { double median_ms; double min_ms; double max_ms; };
Summary statistics(std::vector<double> values);

}
