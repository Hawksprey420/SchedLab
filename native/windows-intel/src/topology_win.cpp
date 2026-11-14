#include "windows_native.hpp"
#include <cstring>
#include <iomanip>
#include <limits>
#include <memory>
#include <powrprof.h>
#include <sstream>
#include <stdexcept>
namespace schedlab::native {
std::string utf8(const std::wstring& value) {
  if (value.empty()) return {};
  if (value.size() > static_cast<std::size_t>(std::numeric_limits<int>::max()))
    throw std::runtime_error("Windows string is too large to convert to UTF-8");
  const int length = static_cast<int>(value.size());
  const int bytes = WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, value.data(), length, nullptr, 0, nullptr, nullptr);
  if (bytes == 0) throw std::runtime_error("WideCharToMultiByte failed: " + std::to_string(GetLastError()));
  std::string result(static_cast<std::size_t>(bytes), '\0');
  if (WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, value.data(), length, result.data(), bytes, nullptr, nullptr) == 0)
    throw std::runtime_error("WideCharToMultiByte failed: " + std::to_string(GetLastError()));
  return result;
}

std::string windows_error(const std::string& operation, DWORD error) {
  wchar_t* raw = nullptr;
  const DWORD count = FormatMessageW(FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS,
    nullptr, error, 0, reinterpret_cast<LPWSTR>(&raw), 0, nullptr);
  const std::unique_ptr<wchar_t, decltype(&LocalFree)> message(raw, LocalFree);
  return operation + " failed (Win32 " + std::to_string(error) + ")" + (count ? ": " + utf8(std::wstring(raw, count)) : "");
}

std::vector<CpuSet> parse_cpu_set_records(std::span<const unsigned char> bytes) {
  std::vector<CpuSet> sets;
  constexpr std::size_t header_size = sizeof(DWORD) + sizeof(CPU_SET_INFORMATION_TYPE);
  while (!bytes.empty()) {
    if (bytes.size() < header_size) throw std::invalid_argument("Truncated CPU Set record header");
    SYSTEM_CPU_SET_INFORMATION info{};
    std::memcpy(&info, bytes.data(), header_size);
    if (info.Size < header_size || info.Size > bytes.size())
      throw std::invalid_argument("Invalid CPU Set record size");
    if (info.Type == CpuSetInformation) {
      if (info.Size < sizeof(info)) throw std::invalid_argument("Truncated CPU Set record");
      std::memcpy(&info, bytes.data(), sizeof(info));
      const auto& set = info.CpuSet;
      sets.push_back({set.Id, set.Group, set.LogicalProcessorIndex, set.CoreIndex, set.EfficiencyClass,
        set.Parked != 0, set.Allocated != 0, set.AllocatedToTargetProcess != 0});
    }
    bytes = bytes.subspan(info.Size);
  }
  return sets;
}

std::vector<CpuSet> enumerate_cpu_sets() {
  std::vector<unsigned char> buffer;
  for (int attempt = 0; attempt < 8; ++attempt) {
    ULONG bytes = 0;
    const BOOL success = GetSystemCpuSetInformation(buffer.empty() ? nullptr : reinterpret_cast<PSYSTEM_CPU_SET_INFORMATION>(buffer.data()),
      static_cast<ULONG>(buffer.size()), &bytes, GetCurrentProcess(), 0);
    if (success) {
      if (bytes > buffer.size()) throw std::runtime_error("CPU Set enumeration returned an invalid byte count");
      buffer.resize(bytes);
      return parse_cpu_set_records(buffer);
    }
    const DWORD error = GetLastError();
    if (error != ERROR_INSUFFICIENT_BUFFER) throw std::runtime_error(windows_error("GetSystemCpuSetInformation", error));
    if (bytes == 0 || bytes > 32 * 1024 * 1024) throw std::runtime_error("CPU Set enumeration returned an invalid buffer requirement");
    buffer.resize(bytes);
  }
  throw std::runtime_error("CPU Set topology kept changing during 8 enumeration attempts");
}

std::string read_cpu_name() {
  DWORD bytes = 0;
  constexpr auto key = L"HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0";
  LSTATUS status = RegGetValueW(HKEY_LOCAL_MACHINE, key, L"ProcessorNameString", RRF_RT_REG_SZ, nullptr, nullptr, &bytes);
  if (status != ERROR_SUCCESS) throw std::runtime_error(windows_error("RegGetValueW CPU name", status));
  for (int attempt = 0; attempt < 8; ++attempt) {
    if (bytes < sizeof(wchar_t) || bytes > 65536 || bytes % sizeof(wchar_t) != 0)
      throw std::runtime_error("CPU registry name has an invalid size");
    std::vector<wchar_t> buffer(bytes / sizeof(wchar_t));
    status = RegGetValueW(HKEY_LOCAL_MACHINE, key, L"ProcessorNameString", RRF_RT_REG_SZ, nullptr, buffer.data(), &bytes);
    if (status == ERROR_SUCCESS) return utf8(buffer.data());
    if (status != ERROR_MORE_DATA) throw std::runtime_error(windows_error("RegGetValueW CPU name", status));
  }
  throw std::runtime_error("CPU registry name kept changing during 8 read attempts");
}

std::string read_power_scheme() {
  GUID* raw = nullptr;
  const DWORD active = PowerGetActiveScheme(nullptr, &raw);
  const std::unique_ptr<GUID, decltype(&LocalFree)> scheme(raw, LocalFree);
  if (active != ERROR_SUCCESS) throw std::runtime_error(windows_error("PowerGetActiveScheme", active));
  if (!scheme) throw std::runtime_error("PowerGetActiveScheme returned no GUID");
  DWORD bytes = 0;
  DWORD status = PowerReadFriendlyName(nullptr, scheme.get(), nullptr, nullptr, nullptr, &bytes);
  if (status != ERROR_SUCCESS && status != ERROR_MORE_DATA)
    throw std::runtime_error(windows_error("PowerReadFriendlyName", status));
  for (int attempt = 0; attempt < 8; ++attempt) {
    if (bytes < sizeof(wchar_t) || bytes > 65536 || bytes % sizeof(wchar_t) != 0)
      throw std::runtime_error("Power plan name has an invalid size");
    std::vector<wchar_t> buffer(bytes / sizeof(wchar_t));
    status = PowerReadFriendlyName(nullptr, scheme.get(), nullptr, nullptr, reinterpret_cast<PUCHAR>(buffer.data()), &bytes);
    if (status == ERROR_SUCCESS) {
      if (buffer.back() != L'\0') throw std::runtime_error("Power plan name is not terminated");
      return utf8(buffer.data());
    }
    if (status != ERROR_MORE_DATA) throw std::runtime_error(windows_error("PowerReadFriendlyName", status));
  }
  throw std::runtime_error("Power plan name kept changing during 8 read attempts");
}

std::string utc_timestamp() {
  SYSTEMTIME now{};
  GetSystemTime(&now);
  std::ostringstream out;
  out.imbue(std::locale::classic());
  out << std::setfill('0') << std::setw(4) << now.wYear << '-' << std::setw(2) << now.wMonth
      << '-' << std::setw(2) << now.wDay << 'T' << std::setw(2) << now.wHour << ':'
      << std::setw(2) << now.wMinute << ':' << std::setw(2) << now.wSecond << 'Z';
  return out.str();
}
}
