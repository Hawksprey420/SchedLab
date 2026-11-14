#pragma once
#include "native.hpp"
#include <windows.h>
#include <atomic>
#include <span>

namespace schedlab::native {
std::vector<CpuSet> parse_cpu_set_records(std::span<const unsigned char> bytes);
std::vector<CpuSet> enumerate_cpu_sets();
std::string utf8(const std::wstring& value);
std::string windows_error(const std::string& operation, DWORD error);
std::string read_cpu_name();
std::string read_power_scheme();
std::string utc_timestamp();
bool request_cpu_sets(const std::vector<CpuSet>& sets, std::string& error);
std::vector<Measurement> measure(const std::vector<CpuSet>& topology, const std::vector<CpuSet>& selected, int repeats, const std::atomic_bool& stop);
}
