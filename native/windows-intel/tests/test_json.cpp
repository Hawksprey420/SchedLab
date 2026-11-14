#include "native.hpp"
#include "check.hpp"
#include <locale>
using namespace schedlab::native;
struct Comma : std::numpunct<char> { char do_decimal_point() const override { return ','; } };
int main() {
  CHECK(json_string("quote\" slash/ backslash\\\n\r\t\b\f") == "\"quote\\\" slash\\/ backslash\\\\\\u000a\\u000d\\u0009\\u0008\\u000c\"");
  CHECK(json_string("UTF8: \xc3\xb1") == "\"UTF8: \xc3\xb1\"");
  for (int code = 0; code < 32; ++code) {
    const auto escaped = json_string(std::string(1, static_cast<char>(code)));
    CHECK(escaped.size() == 8 && escaped.starts_with("\"\\u00"));
  }
  Trace trace{"2026-11-14T00:00:00Z", "CPU\"\\\n", "Windows", "plan", {{7, 2, 3, 1, 9}},
    {"detect"}, {}, {"note"}};
  const auto detect = write_trace(trace);
  CHECK(detect.find("\"mode\":\"NATIVE_MEASURED\"") != std::string::npos);
  CHECK(detect.find("\"cpuName\":\"CPU\\\"\\\\\\u000a\"") != std::string::npos);
  CHECK(detect.find("\"workload\":\"detect\"") != std::string::npos);
  CHECK(detect.find("\"repeats\":0,\"iterations\":0,\"warmupRuns\":0") != std::string::npos);
  CHECK(detect.find("\"measurements\":[],\"summary\":null") != std::string::npos);
  trace.scenario = {"bench", "efficient", 1};
  trace.measurements = {{1, 12.5, {7}, {{2, 3, 2}}, true, "", 2, 2, UINT64_MAX}};
  std::locale::global(std::locale(std::locale::classic(), new Comma));
  const auto bench = write_trace(trace);
  CHECK(bench.find("\"elapsedMs\":12.5") != std::string::npos);
  CHECK(bench.find("\"checksum\":\"18446744073709551615\"") != std::string::npos);
  CHECK(bench.find("\"summary\":{\"medianMs\":12.5,\"minMs\":12.5,\"maxMs\":12.5}") != std::string::npos);
  CHECK(bench.find("\"observedLogicalCpus\":[{\"group\":2,\"logicalProcessorIndex\":3,\"samples\":2}]") != std::string::npos);
  trace.measurements[0].elapsed_ms = 0;
  rejects([&] { write_trace(trace); });
  return failures == 0 ? 0 : 1;
}
