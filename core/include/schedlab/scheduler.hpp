// Public entry points: input validation and single-core simulation.
#pragma once

#include <vector>

#include "schedlab/types.hpp"

namespace schedlab {

// Returns every problem found, in input order (whole-input problems that depend
// on the count come first, the overflow check comes last). Empty means valid.
std::vector<ValidationError> validate(const std::vector<Process>& processes);

// Validates, trims process IDs, then runs the chosen algorithm on one core.
// Throws std::invalid_argument (message = first validation error) on invalid input.
Schedule simulate_single_core(const std::vector<Process>& processes, Algorithm algorithm);

HybridSchedule simulate_hybrid(const std::vector<Process>& processes, Algorithm algorithm,
                               Profile profile, Placement heuristic);

}  // namespace schedlab
