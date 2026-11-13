cmake_minimum_required(VERSION 3.20)
project(SchedLabCore LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

enable_testing()

# Warnings are on for every target so portability problems show up early.
function(schedlab_enable_warnings target)
  if(MSVC)
    target_compile_options(${target} PRIVATE /W4 /permissive-)
  else()
    target_compile_options(${target} PRIVATE -Wall -Wextra -Wpedantic)
  endif()
endfunction()

add_library(schedlab_core STATIC
  src/validate.cpp
  src/fcfs.cpp
  src/sjf.cpp
  src/metrics.cpp
  src/format.cpp
  src/scheduler.cpp
)
target_include_directories(schedlab_core PUBLIC include)
schedlab_enable_warnings(schedlab_core)

# Each test is a plain executable that returns nonzero when a check fails.
function(schedlab_add_test name)
  add_executable(${name} tests/${name}.cpp)
  target_link_libraries(${name} PRIVATE schedlab_core)
  schedlab_enable_warnings(${name})
  add_test(NAME ${name} COMMAND ${name})
endfunction()

schedlab_add_test(test_validation)
schedlab_add_test(test_fcfs)
schedlab_add_test(test_sjf)
schedlab_add_test(test_metrics)

# Command-line front end, also used as the byte-for-byte reference for the WASM build.
add_executable(schedlab-cli src/cli_main.cpp)
target_link_libraries(schedlab-cli PRIVATE schedlab_core)
schedlab_enable_warnings(schedlab-cli)

# Feeds an input file to the CLI and compares stdout and the exit code exactly.
function(schedlab_add_cli_test name algorithm input expected exit_code)
  add_test(NAME ${name} COMMAND ${CMAKE_COMMAND}
    -DCLI=$<TARGET_FILE:schedlab-cli>
    -DALGORITHM=${algorithm}
    -DINPUT=${CMAKE_CURRENT_SOURCE_DIR}/tests/cli/${input}
    -DEXPECTED=${CMAKE_CURRENT_SOURCE_DIR}/tests/cli/${expected}
    -DEXPECTED_EXIT=${exit_code}
    -P ${CMAKE_CURRENT_SOURCE_DIR}/tests/cli/run_cli_case.cmake)
endfunction()

schedlab_add_cli_test(cli_t1_fcfs fcfs t1.txt t1_fcfs.expected 0)
schedlab_add_cli_test(cli_t1_sjf sjf t1.txt t1_sjf.expected 0)
# Same workload saved with a UTF-8 byte-order mark, as Windows editors do.
schedlab_add_cli_test(cli_t1_bom fcfs t1_bom.txt t1_fcfs.expected 0)
schedlab_add_cli_test(cli_t2_fcfs fcfs t2.txt t2_fcfs.expected 0)
schedlab_add_cli_test(cli_t2_sjf sjf t2.txt t2_sjf.expected 0)
schedlab_add_cli_test(cli_invalid fcfs invalid.txt invalid.expected 1)
schedlab_add_cli_test(cli_malformed sjf malformed.txt malformed.expected 1)
