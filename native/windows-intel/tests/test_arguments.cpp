#include "native.hpp"
#include "check.hpp"

using schedlab::native::parse_arguments;

int main() {
  try {
    CHECK(parse_arguments({"--help"}).command == "help");
    const auto detect = parse_arguments({"detect", "--output", "file name.json"});
    CHECK(detect.command == "detect" && detect.output == "file name.json");
    CHECK(detect.repeats == 0 && detect.requested_class == "none");
    for (const std::string choice : {"performance", "efficient"}) {
      const auto bench = parse_arguments({"bench", "--output", "trace.json", "--repeats", "20", "--class", choice});
      CHECK(bench.repeats == 20 && bench.requested_class == choice);
    }
    for (const std::vector<std::string>& bad : std::vector<std::vector<std::string>>{
      {}, {"help"}, {"--help", "--output", "x"}, {"detect"}, {"detect", "--output"},
      {"detect", "--output", ""}, {"detect", "--output", "--class"},
      {"detect", "--output", "a", "--output", "b"}, {"detect", "--output", "a", "--repeats", "1"},
      {"detect", "--unknown", "x"}, {"bench", "--output", "a"},
      {"bench", "--output", "a", "--class", "fast", "--repeats", "1"},
      {"bench", "--output", "a", "--class", "efficient", "--class", "efficient", "--repeats", "1"}}) {
      rejects([&] { parse_arguments(bad); });
    }
    for (const std::string number : {"0", "21", "-1", "+1", "1.5", "1x", " 1", "9999999999999999999999999"}) {
      rejects([&] { parse_arguments({"bench", "--class", "efficient", "--repeats", number, "--output", "a"}); });
    }
    CHECK(parse_arguments({"bench", "--class", "performance", "--repeats", "1", "--output", "a"}).repeats == 1);
  } catch (const std::exception& error) { std::cerr << error.what() << '\n'; return 1; }
  return failures == 0 ? 0 : 1;
}
