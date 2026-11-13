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

# The binding catches whatever the core or JavaScript throws, which needs wasm exceptions.
# Set before any target exists so the library and the module are compiled the same way.
if(EMSCRIPTEN)
  add_compile_options(-fwasm-exceptions)
  add_link_options(-fwasm-exceptions)
endif()

add_library(schedlab_core STATIC
  src/validate.cpp
  src/fcfs.cpp
  src/sjf.cpp
  src/metrics.cpp
  src/format.cpp
  src/scheduler.cpp
  src/text_io.cpp
  src/input_check.cpp
)
target_include_directories(schedlab_core PUBLIC include)
schedlab_enable_warnings(schedlab_core)

# Browser build: one ES module with the wasm embedded (see scripts/build-wasm.ps1).
if(EMSCRIPTEN)
  add_executable(schedlab_wasm src/wasm_bindings.cpp)
  target_link_libraries(schedlab_wasm PRIVATE schedlab_core embind)
  schedlab_enable_warnings(schedlab_wasm)
  set_target_properties(schedlab_wasm PROPERTIES OUTPUT_NAME schedlab SUFFIX .mjs)
  target_link_options(schedlab_wasm PRIVATE
    -O2
    -sMODULARIZE=1 -sEXPORT_ES6=1 -sSINGLE_FILE=1 -sENVIRONMENT=web,node
    -sEXPORT_NAME=createSchedLabModule
    -sFILESYSTEM=0 -sERROR_ON_UNDEFINED_SYMBOLS=1)
  return()  # tests and the CLI are native-only
endif()

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
schedlab_add_test(test_text_io)
schedlab_add_test(test_input_check)

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
