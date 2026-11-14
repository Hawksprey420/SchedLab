#include "windows_native.hpp"
#include <filesystem>
#include <iostream>
#include <stdexcept>

using namespace schedlab::native;

namespace {
std::atomic_bool stop_requested{false};
BOOL WINAPI interrupt(DWORD event) {
  if (event != CTRL_C_EVENT && event != CTRL_BREAK_EVENT) return FALSE;
  stop_requested.store(true);
  return TRUE;
}
class InterruptHandler {
 public:
  InterruptHandler() {
    if (!SetConsoleCtrlHandler(interrupt, TRUE)) throw std::runtime_error(windows_error("SetConsoleCtrlHandler", GetLastError()));
  }
  ~InterruptHandler() { SetConsoleCtrlHandler(interrupt, FALSE); }
};

void save_trace(const std::string& output, const std::string& json) {
  const auto path = std::filesystem::path(std::u8string(output.begin(), output.end()));
  const auto temporary = path.wstring() + L".tmp-" + std::to_wstring(GetCurrentProcessId());
  HANDLE file = CreateFileW(temporary.c_str(), GENERIC_WRITE, 0, nullptr, CREATE_NEW, FILE_ATTRIBUTE_NORMAL, nullptr);
  if (file == INVALID_HANDLE_VALUE) throw std::runtime_error(windows_error("CreateFileW output", GetLastError()));
  try {
    DWORD written = 0;
    if (json.size() > MAXDWORD) throw std::runtime_error("Trace is too large to write");
    if (!WriteFile(file, json.data(), static_cast<DWORD>(json.size()), &written, nullptr))
      throw std::runtime_error(windows_error("WriteFile output", GetLastError()));
    if (written != json.size()) throw std::runtime_error("Incomplete trace write");
    if (!FlushFileBuffers(file)) throw std::runtime_error(windows_error("FlushFileBuffers output", GetLastError()));
    if (!CloseHandle(file)) { file = INVALID_HANDLE_VALUE; throw std::runtime_error(windows_error("CloseHandle output", GetLastError())); }
    file = INVALID_HANDLE_VALUE;
    if (!MoveFileExW(temporary.c_str(), path.c_str(), MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH))
      throw std::runtime_error(windows_error("MoveFileExW output", GetLastError()));
  } catch (...) {
    if (file != INVALID_HANDLE_VALUE) CloseHandle(file);
    DeleteFileW(temporary.c_str());
    throw;
  }
}
}

int wmain(int argc, wchar_t* argv[]) {
  try {
    std::vector<std::string> args;
    for (int i = 1; i < argc; ++i) args.push_back(utf8(argv[i]));
    const Arguments options = parse_arguments(args);
    if (options.command == "help") {
      std::cout << "SchedLab Windows CPU Sets experiment (no elevation required)\n"
        "  --help\n  detect --output <file>\n"
        "  bench --class performance|efficient --repeats N --output <file>\n"
        "N: 1..20. One worker, one warmup, 400000000 iterations/run.\n"
        "Each run <=5 seconds; total benchmark <=30 seconds; Ctrl+C stops cooperatively.\n"
        "detect does not run a workload. CPU Sets constrain scheduling, not hardware isolation.\n";
      return 0;
    }
    Trace trace{utc_timestamp(), read_cpu_name(), "Windows (native CPU Sets)", read_power_scheme(), enumerate_cpu_sets(), options, {}, {}};
    trace.notes = {
      "Previously collected on " + trace.cpu_name + " at " + trace.collected_at + "; sample timings are not a portable guarantee.",
      "Ambient temperature, thermals, power limits, and background activity are uncontrolled and affect timings.",
      "Power scheme: " + trace.power_scheme + "; it was read without changing system power settings.",
      "Logical processors include SMT siblings; a logical CPU is not necessarily a separate physical core.",
      "CPU Sets are scheduling constraints, not hardware isolation; OS policy, core parking, and other workloads can interfere.",
      "EfficiencyClass is reported by Windows; performance/efficient mean the highest/lowest eligible runtime class, not universal hardware labels.",
      "No Intel Thread Director data is read or reimplemented. These are not FCFS/SJF results and cannot be converted to simulated ticks."};
    if (options.command == "bench") {
      const auto selected = select_class(trace.cpu_sets, options.requested_class);
      if (selected.empty()) {
        std::cerr << "Skipped: fewer than two eligible CPU Set efficiency classes; no workload run or measurements written.\n";
        return 3;
      }
      const InterruptHandler handler;
      trace.measurements = measure(trace.cpu_sets, selected, options.repeats, stop_requested);
      trace.notes.push_back("One worker thread requested CPU Sets. One unreported warmup preceded identical fixed-work measured runs.");
      bool affinity_succeeded = true;
      for (const auto& measurement : trace.measurements) {
        if (!measurement.affinity_request_succeeded) {
          affinity_succeeded = false;
          std::cerr << measurement.affinity_error << '\n';
          break;
        }
      }
      save_trace(options.output, write_trace(trace));
      std::cout << "Saved " << options.output << '\n';
      return affinity_succeeded ? 0 : 2;
    }
    trace.notes.push_back("Topology detection only: no worker thread, warmup, or compute workload ran.");
    save_trace(options.output, write_trace(trace));
    std::cout << "Saved " << options.output << '\n';
    return 0;
  } catch (const std::exception& error) {
    std::cerr << "Error: " << error.what() << '\n';
    return 1;
  }
}
