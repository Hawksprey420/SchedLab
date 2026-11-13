# Runs schedlab-cli on an input file and compares stdout and the exit code exactly.
# Inputs (-D): CLI, ALGORITHM, INPUT, EXPECTED, EXPECTED_EXIT.
# Done in CMake so the test needs no shell and behaves the same on Windows.
execute_process(
  COMMAND "${CLI}" "${ALGORITHM}"
  INPUT_FILE "${INPUT}"
  OUTPUT_VARIABLE actual
  RESULT_VARIABLE exit_code)

file(READ "${EXPECTED}" expected)

# Git may check files out with CRLF and Windows consoles may emit it; compare LF only.
string(REPLACE "\r" "" actual "${actual}")
string(REPLACE "\r" "" expected "${expected}")

if(NOT exit_code EQUAL EXPECTED_EXIT)
  message(FATAL_ERROR "exit code ${exit_code}, expected ${EXPECTED_EXIT}\n${actual}")
endif()
if(NOT actual STREQUAL expected)
  message(FATAL_ERROR "stdout differs\n--- actual ---\n${actual}\n--- expected ---\n${expected}")
endif()