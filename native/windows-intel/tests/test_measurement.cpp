#include "windows_native.hpp"
#include "check.hpp"
#include <chrono>
#include <thread>
using namespace schedlab::native;

int main() {
  std::atomic_bool stop{true};
  const std::vector<CpuSet> selected{{123, 0, 0, 0, 1}};
  rejects([&] { measure(selected, {}, 1, stop); });
  rejects([&] { measure(selected, selected, 0, stop); });
  rejects([&] { measure(selected, selected, 21, stop); });
  bool interrupted = false;
  try { measure(selected, selected, 1, stop); }
  catch (const std::runtime_error& error) { interrupted = std::string(error.what()).find("interrupted") != std::string::npos; }
  CHECK(interrupted);
  std::string error;
  rejects([&] { request_cpu_sets({}, error); });
  CHECK(windows_error("TestOperation", ERROR_ACCESS_DENIED).find("TestOperation failed (Win32 5)") != std::string::npos);
  CHECK(utf8(L"\u00f1") == "\xc3\xb1");
  bool request_succeeded = true;
  std::thread invalid_request([&] { request_succeeded = request_cpu_sets({{UINT32_MAX, 0, 0, 0, 0}}, error); });
  invalid_request.join();
  CHECK(!request_succeeded && error.find("SetThreadSelectedCpuSets failed (Win32 ") != std::string::npos);

  const auto topology = enumerate_cpu_sets();
  if (!topology.empty()) {
    stop.store(false);
    std::jthread cancel([&] { std::this_thread::sleep_for(std::chrono::milliseconds(20)); stop.store(true); });
    interrupted = false;
    try { measure(topology, {topology.front()}, 20, stop); }
    catch (const std::runtime_error& exception) { interrupted = std::string(exception.what()).find("interrupted") != std::string::npos; }
    CHECK(interrupted);
  }
  return failures == 0 ? 0 : 1;
}
