// embind surface of the core: simulate (structured, used by the UI) and runText (text,
// used by the parity test). See docs/web-contract.md.
//
// This file only converts between JavaScript values and core types. Number checks live in
// input_check.hpp, parsing and the text run in text_io.hpp, everything else in the core.
// No C++ exception crosses into JavaScript: failures become an { ok: false, errors } outcome.
#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <cstdint>
#include <exception>
#include <limits>
#include <string>
#include <utility>
#include <vector>

#include "schedlab/input_check.hpp"
#include "schedlab/scheduler.hpp"
#include "schedlab/text_io.hpp"

namespace {

using emscripten::val;
using schedlab::Process;
using schedlab::ValidationError;

// Ranges from docs/web-contract.md: JavaScript numbers are checked against what the core
// types can hold. The UI applies its own, tighter limits.
constexpr std::int64_t kInt64Min = std::numeric_limits<std::int64_t>::min();
constexpr std::int64_t kInt64Max = std::numeric_limits<std::int64_t>::max();
constexpr std::int64_t kIntMin = std::numeric_limits<int>::min();
constexpr std::int64_t kIntMax = std::numeric_limits<int>::max();

ValidationError whole_input_error(const char* field, std::string message) {
  return {schedlab::kWholeInput, field, std::move(message)};
}

// ---- JavaScript value -> core ---------------------------------------------------------

// Reads one numeric property, appending a field error when it is missing, not a number,
// or not an acceptable integer. Returns false in that case.
bool read_integer(const val& item, const char* field, std::size_t index, std::int64_t min,
                  std::int64_t max, std::int64_t& out, std::vector<ValidationError>& errors) {
  const val value = item[field];
  if (!value.isNumber()) {
    errors.push_back({index, field, schedlab::not_a_number_message(field)});
    return false;
  }
  const schedlab::IntegerCheck check =
      schedlab::check_integer_field(value.as<double>(), field, min, max);
  if (!check.ok) {
    errors.push_back({index, field, check.message});
    return false;
  }
  out = check.value;
  return true;
}

// typeof null is "object" in JavaScript, so null needs its own check.
bool is_object(const val& value) {
  return !value.isNull() && value.typeOf().as<std::string>() == "object";
}

// Reads one { id, arrival, burst, priority } object. Every bad field is reported, not
// just the first, so the UI can mark all of them at once.
bool read_process(const val& item, std::size_t index, Process& out,
                  std::vector<ValidationError>& errors) {
  if (!is_object(item)) {
    errors.push_back({index, "id", "process must be an object"});
    return false;
  }
  bool ok = true;
  const val id = item["id"];
  if (id.isString()) {
    out.id = id.as<std::string>();
  } else {
    errors.push_back({index, "id", "id must be a string"});
    ok = false;
  }
  std::int64_t priority = 0;
  // Sign checks are left to schedlab::validate so its messages stay the single source.
  ok &= read_integer(item, "arrival", index, kInt64Min, kInt64Max, out.arrival, errors);
  ok &= read_integer(item, "burst", index, kInt64Min, kInt64Max, out.burst, errors);
  ok &= read_integer(item, "priority", index, kIntMin, kIntMax, priority, errors);
  out.priority = static_cast<int>(priority);
  return ok;
}

// `processes` must be an array; element problems are collected into `errors`.
std::vector<Process> read_processes(const val& processes, std::vector<ValidationError>& errors) {
  std::vector<Process> result;
  if (!val::global("Array").call<bool>("isArray", processes)) {
    errors.push_back(whole_input_error("processes", "processes must be an array"));
    return result;
  }
  const std::size_t count = processes["length"].as<std::size_t>();
  for (std::size_t i = 0; i < count; ++i) {
    Process process{};
    if (read_process(processes[i], i, process, errors)) result.push_back(std::move(process));
  }
  return result;
}

bool parse_algorithm_id(const std::string& id, schedlab::Algorithm& out) {
  if (id == "FCFS") out = schedlab::Algorithm::FCFS;
  else if (id == "SJF_NON_PREEMPTIVE") out = schedlab::Algorithm::SJF_NON_PREEMPTIVE;
  else return false;
  return true;
}

// ---- core -> JavaScript value ---------------------------------------------------------

val to_js(const ValidationError& error) {
  val js = val::object();
  js.set("processIndex",
         error.process_index == schedlab::kWholeInput ? val::null() : val(static_cast<double>(error.process_index)));
  js.set("field", error.field);
  js.set("message", error.message);
  return js;
}

val failure(const std::vector<ValidationError>& errors) {
  val list = val::array();
  for (const ValidationError& error : errors) list.call<void>("push", to_js(error));
  val outcome = val::object();
  outcome.set("ok", false);
  outcome.set("errors", list);
  return outcome;
}

val to_js(const schedlab::Segment& segment) {
  val js = val::object();
  js.set("coreId", segment.core_id);
  js.set("processId", segment.process_id);
  js.set("idle", segment.idle);
  js.set("begin", static_cast<double>(segment.begin));
  js.set("end", static_cast<double>(segment.end));
  return js;
}

val to_js(const schedlab::ProcessResult& result) {
  val js = val::object();
  js.set("id", result.id);
  js.set("arrival", static_cast<double>(result.arrival));
  js.set("burst", static_cast<double>(result.burst));
  js.set("priority", result.priority);
  js.set("start", static_cast<double>(result.start));
  js.set("completion", static_cast<double>(result.completion));
  js.set("waiting", static_cast<double>(result.waiting));
  js.set("turnaround", static_cast<double>(result.turnaround));
  js.set("response", static_cast<double>(result.response));
  return js;
}

template <typename Item>
val to_js_array(const std::vector<Item>& items) {
  val list = val::array();
  for (const Item& item : items) list.call<void>("push", to_js(item));
  return list;
}

val success(const schedlab::Schedule& schedule) {
  val js = val::object();
  js.set("segments", to_js_array(schedule.segments));
  js.set("results", to_js_array(schedule.results));
  js.set("averageWaiting", schedule.average_waiting);
  js.set("averageTurnaround", schedule.average_turnaround);
  js.set("makespan", static_cast<double>(schedule.makespan));
  val outcome = val::object();
  outcome.set("ok", true);
  outcome.set("schedule", js);
  return outcome;
}

// ---- exported functions ---------------------------------------------------------------

// Every schedule value is at most the makespan, so checking it alone proves that the
// double conversions in success() are exact.
bool is_exactly_representable(const schedlab::Schedule& schedule) {
  return schedule.makespan <= schedlab::kMaxExactInteger;
}

val run_simulation(const val& processes, const std::string& algorithm_id) {
  std::vector<ValidationError> errors;
  schedlab::Algorithm algorithm{};
  if (!parse_algorithm_id(algorithm_id, algorithm)) {
    errors.push_back(whole_input_error("algorithm", "unknown algorithm \"" + algorithm_id + "\""));
  }
  const std::vector<Process> parsed = read_processes(processes, errors);
  if (errors.empty()) errors = schedlab::validate(parsed);
  if (!errors.empty()) return failure(errors);

  const schedlab::Schedule schedule = schedlab::simulate_single_core(parsed, algorithm);
  if (!is_exactly_representable(schedule)) {
    return failure({whole_input_error(
        "processes", "total schedule length exceeds the largest exactly representable number")});
  }
  return success(schedule);
}

val simulate(const val& processes, const std::string& algorithm_id) {
  try {
    return run_simulation(processes, algorithm_id);
  } catch (const std::exception& error) {
    return failure({whole_input_error("processes", std::string("internal error: ") + error.what())});
  } catch (...) {
    // C++ exceptions only: an exception thrown by a JavaScript getter on the input object
    // is not catchable here and propagates to the caller, who owns that object.
    return failure({whole_input_error("processes", "internal error while reading the input")});
  }
}

val run_text(const std::string& algorithm_name, const std::string& input) {
  val js = val::object();
  try {
    const schedlab::TextRun run = schedlab::run_text(algorithm_name, input);
    js.set("exitCode", run.exit_code);
    js.set("stdout", run.stdout_text);
  } catch (...) {
    js.set("exitCode", 70);  // EX_SOFTWARE: the run itself failed, not the input
    js.set("stdout", std::string());
  }
  return js;
}

}  // namespace

EMSCRIPTEN_BINDINGS(schedlab) {
  emscripten::function("simulate", &simulate);
  emscripten::function("runText", &run_text);
}
