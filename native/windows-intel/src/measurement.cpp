#include "windows_native.hpp"
#include <exception>
#include <map>
#include <stdexcept>
#include <thread>
namespace schedlab::native {
namespace {
LONGLONG counter() {
  LARGE_INTEGER value{};
  if (!QueryPerformanceCounter(&value)) throw std::runtime_error(windows_error("QueryPerformanceCounter", GetLastError()));
  return value.QuadPart;
}
}

std::vector<Measurement> measure(const std::vector<CpuSet>& topology, const std::vector<CpuSet>& selected, int repeats, const std::atomic_bool& stop) {
  if (selected.empty() || repeats < 1 || repeats > 20) throw std::invalid_argument("Invalid benchmark selection or repeat count");
  check_run_limits(0, 0, stop.load());
  LARGE_INTEGER frequency{};
  if (!QueryPerformanceFrequency(&frequency)) throw std::runtime_error(windows_error("QueryPerformanceFrequency", GetLastError()));
  if (frequency.QuadPart <= 0) throw std::runtime_error("QueryPerformanceFrequency returned a nonpositive frequency");
  const auto milliseconds = [frequency](LONGLONG delta) { return 1000.0 * static_cast<double>(delta) / static_cast<double>(frequency.QuadPart); };
  const auto total_begin = counter();
  std::vector<Measurement> measurements;
  std::exception_ptr failure;
  std::thread worker([&] {
    try {
      check_run_limits(0, milliseconds(counter() - total_begin), stop.load());
      std::string affinity_error;
      const bool requested = request_cpu_sets(selected, affinity_error);
      std::vector<std::uint32_t> ids;
      for (const auto& set : selected) {
        ids.push_back(set.id);
      }
      std::uint64_t warmup_checksum = 0;
      for (int run = 0; run <= repeats; ++run) {
        std::map<std::pair<WORD, BYTE>, std::uint64_t> observations;
        std::uint64_t total_samples = 0;
        const auto begin = counter();
        const auto work = compute_work(workload_iterations, [&] {
          const auto now = counter();
          check_run_limits(milliseconds(now - begin), milliseconds(now - total_begin), stop.load());
          PROCESSOR_NUMBER processor{};
          GetCurrentProcessorNumberEx(&processor);
          const auto cpu = std::make_pair(processor.Group, processor.Number);
          ++observations[cpu];
          ++total_samples;
          return true;
        });
        const auto end = counter();
        check_run_limits(milliseconds(end - begin), milliseconds(end - total_begin), stop.load());
        if (!work.completed) throw std::runtime_error("Incomplete benchmark workload; no trace written");
        if (run == 0) { warmup_checksum = work.checksum; continue; }
        if (work.checksum != warmup_checksum) throw std::runtime_error("Measured checksum differs from warmup; no trace written");
        Measurement measurement{run, milliseconds(end - begin), ids, {}, requested, affinity_error,
          0, total_samples, work.checksum};
        for (const auto& [cpu, samples] : observations)
          measurement.observed_logical_cpus.push_back({cpu.first, cpu.second, samples});
        measurement.requested_class_samples = class_sample_count(measurement.observed_logical_cpus, topology, selected.front().efficiency_class);
        measurements.push_back(std::move(measurement));
      }
    } catch (...) { failure = std::current_exception(); }
  });
  worker.join();
  if (failure) std::rethrow_exception(failure);
  return measurements;
}
}
