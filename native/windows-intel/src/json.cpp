#include "native.hpp"
#include <iomanip>
#include <locale>
#include <sstream>
namespace schedlab::native {
std::string json_string(const std::string& value) {
  constexpr char hex[] = "0123456789abcdef";
  std::string result = "\"";
  for (unsigned char c : value) {
    if (c == '"' || c == '\\' || c == '/') { result += '\\'; result += static_cast<char>(c); }
    else if (c < 0x20) { result += "\\u00"; result += hex[c >> 4]; result += hex[c & 15]; }
    else result += static_cast<char>(c);
  }
  return result + '"';
}
std::string write_trace(const Trace& trace) {
  std::vector<double> durations;
  for (const auto& m : trace.measurements) durations.push_back(m.elapsed_ms);
  const bool bench = trace.scenario.command == "bench";
  const Summary summary = bench ? statistics(durations) : Summary{};
  std::ostringstream out;
  out.imbue(std::locale::classic());
  out << std::setprecision(17) << std::boolalpha;
  out << "{\"schemaVersion\":1,\"mode\":\"NATIVE_MEASURED\",\"collectedAt\":" << json_string(trace.collected_at)
      << ",\"machine\":{\"cpuName\":" << json_string(trace.cpu_name) << ",\"os\":" << json_string(trace.os)
      << ",\"topologyDetected\":" << !trace.cpu_sets.empty() << "},\"powerScheme\":" << json_string(trace.power_scheme)
      << ",\"cpuSets\":[";
  bool first = true;
  for (const auto& set : trace.cpu_sets) {
    if (!first) out << ',';
    first = false;
    out << "{\"id\":" << set.id << ",\"group\":" << set.group
        << ",\"logicalProcessorIndex\":" << static_cast<unsigned>(set.logical_processor_index)
        << ",\"coreIndex\":" << static_cast<unsigned>(set.core_index)
        << ",\"efficiencyClass\":" << static_cast<unsigned>(set.efficiency_class)
        << ",\"parked\":" << set.parked << ",\"allocated\":" << set.allocated
        << ",\"allocatedToTargetProcess\":" << set.allocated_to_target_process << '}';
  }
  out << "],\"scenario\":{\"workload\":" << json_string(bench ? "bounded_compute" : "detect")
      << ",\"requestedClass\":" << json_string(trace.scenario.requested_class)
      << ",\"repeats\":" << trace.scenario.repeats << ",\"iterations\":" << (bench ? 400000000 : 0)
      << ",\"warmupRuns\":" << (bench ? 1 : 0) << "},\"measurements\":[";
  first = true;
  for (const auto& m : trace.measurements) {
    if (!first) out << ',';
    first = false;
    out << "{\"run\":" << m.run << ",\"elapsedMs\":" << m.elapsed_ms << ",\"selectedCpuSetIds\":[";
    for (std::size_t i = 0; i < m.selected_cpu_set_ids.size(); ++i) {
      if (i != 0) out << ',';
      out << m.selected_cpu_set_ids[i];
    }
    out << "],\"observedLogicalCpus\":[";
    for (std::size_t i = 0; i < m.observed_logical_cpus.size(); ++i) {
      if (i != 0) out << ',';
      const auto& observed = m.observed_logical_cpus[i];
      out << "{\"group\":" << observed.group << ",\"logicalProcessorIndex\":" << static_cast<unsigned>(observed.logical_processor_index)
          << ",\"samples\":" << observed.samples << '}';
    }
    out << "],\"affinityRequestSucceeded\":" << m.affinity_request_succeeded
        << ",\"affinityError\":" << json_string(m.affinity_error)
        << ",\"requestedClassSamples\":" << m.requested_class_samples << ",\"totalSamples\":" << m.total_samples
        << ",\"checksum\":" << json_string(std::to_string(m.checksum)) << '}';
  }
  out << "],\"summary\":";
  if (bench) out << "{\"medianMs\":" << summary.median_ms << ",\"minMs\":" << summary.min_ms << ",\"maxMs\":" << summary.max_ms << '}';
  else out << "null";
  out << ",\"notes\":[";
  for (std::size_t i = 0; i < trace.notes.size(); ++i) {
    if (i != 0) out << ',';
    out << json_string(trace.notes[i]);
  }
  out << "]}\n";
  return out.str();
}
}
