// Text rendering shared by the CLI and the WebAssembly parity test, so both produce the
// same bytes.
#pragma once

#include <string>
#include <vector>

#include "schedlab/types.hpp"

namespace schedlab {

// SEGMENT / RESULT / AVERAGE / MAKESPAN lines, each ending in '\n'. Averages have exactly
// four decimal places. Idle segments print the process id as IDLE.
std::string format_schedule(const Schedule& schedule);
std::string format_hybrid_schedule(const HybridSchedule& schedule);

// One "ERROR <index|-> <field> <message>" line per error, each ending in '\n'.
std::string format_errors(const std::vector<ValidationError>& errors);

}  // namespace schedlab
