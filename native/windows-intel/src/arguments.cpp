#include "native.hpp"
#include <charconv>
#include <map>
#include <stdexcept>

namespace schedlab::native {
Arguments parse_arguments(const std::vector<std::string>& args) {
  if (args == std::vector<std::string>{"--help"}) return {"help"};
  if (args.empty() || (args[0] != "detect" && args[0] != "bench"))
    throw std::invalid_argument("Use --help, detect, or bench");
  Arguments result;
  result.command = args[0];
  std::map<std::string, std::string> flags;
  for (std::size_t i = 1; i < args.size(); i += 2) {
    const auto& key = args[i];
    if (key != "--output" && !(result.command == "bench" && (key == "--class" || key == "--repeats")))
      throw std::invalid_argument("Unknown flag: " + key);
    if (i + 1 == args.size() || args[i + 1].empty() || args[i + 1].starts_with("--"))
      throw std::invalid_argument("Missing value for " + key);
    if (!flags.emplace(key, args[i + 1]).second)
      throw std::invalid_argument("Duplicate flag: " + key);
  }
  if (!flags.contains("--output")) throw std::invalid_argument("Missing --output");
  result.output = flags.at("--output");
  if (result.command == "bench") {
    if (!flags.contains("--class") || !flags.contains("--repeats"))
      throw std::invalid_argument("bench requires --class and --repeats");
    result.requested_class = flags.at("--class");
    if (result.requested_class != "performance" && result.requested_class != "efficient")
      throw std::invalid_argument("--class must be performance or efficient");
    const auto& number = flags.at("--repeats");
    const auto parsed = std::from_chars(number.data(), number.data() + number.size(), result.repeats);
    if (parsed.ec != std::errc{} || parsed.ptr != number.data() + number.size() || result.repeats < 1 || result.repeats > 20)
      throw std::invalid_argument("--repeats must be an integer from 1 to 20");
  }
  return result;
}
}
