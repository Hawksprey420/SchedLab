#pragma once

#include <string>
#include <cstdint>
#include <functional>
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

struct Observation {
  std::uint16_t group;
  std::uint8_t logical_processor_index;
  std::uint64_t samples;
};
std::uint64_t class_sample_count(const std::vector<Observation>& observations, const std::vector<CpuSet>& topology, std::uint8_t efficiency_class);
struct Measurement {
  int run;
  double elapsed_ms;
  std::vector<std::uint32_t> selected_cpu_set_ids;
  std::vector<Observation> observed_logical_cpus;
  bool affinity_request_succeeded;
  std::string affinity_error;
  std::uint64_t requested_class_samples;
  std::uint64_t total_samples;
  std::uint64_t checksum;
};
struct Trace {
  std::string collected_at;
  std::string cpu_name;
  std::string os;
  std::string power_scheme;
  std::vector<CpuSet> cpu_sets;
  Arguments scenario;
  std::vector<Measurement> measurements;
  std::vector<std::string> notes;
};
std::string json_string(const std::string& value);
std::string write_trace(const Trace& trace);

inline constexpr std::uint64_t workload_iterations = 400000000;
inline constexpr std::uint64_t sample_interval = 1048576;
struct WorkResult { std::uint64_t checksum; std::uint64_t iterations_completed; bool completed; };
WorkResult compute_work(std::uint64_t iterations, const std::function<bool()>& checkpoint);

void check_run_limits(double run_ms, double total_ms, bool stop_requested);

}
