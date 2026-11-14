cmake_minimum_required(VERSION 3.20)
project(SchedLabIntel LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
enable_testing()

if(NOT WIN32)
  message(FATAL_ERROR "The native CPU Sets experiment requires Windows 10 or newer")
endif()

function(native_warnings target)
  if(MSVC)
    target_compile_options(${target} PRIVATE /W4 /permissive- /utf-8)
  else()
    target_compile_options(${target} PRIVATE -Wall -Wextra -Wpedantic)
  endif()
endfunction()

add_library(native_helpers STATIC src/arguments.cpp src/classification.cpp src/statistics.cpp src/json.cpp src/workload.cpp)
target_include_directories(native_helpers PUBLIC include)
native_warnings(native_helpers)

add_executable(test_arguments tests/test_arguments.cpp)
target_link_libraries(test_arguments PRIVATE native_helpers)
native_warnings(test_arguments)
add_test(NAME native_arguments COMMAND test_arguments)

add_executable(test_classification tests/test_classification.cpp)
target_link_libraries(test_classification PRIVATE native_helpers)
native_warnings(test_classification)
add_test(NAME native_classification COMMAND test_classification)

add_executable(test_statistics tests/test_statistics.cpp)
target_link_libraries(test_statistics PRIVATE native_helpers)
native_warnings(test_statistics)
add_test(NAME native_statistics COMMAND test_statistics)

add_executable(test_json tests/test_json.cpp)
target_link_libraries(test_json PRIVATE native_helpers)
native_warnings(test_json)
add_test(NAME native_json COMMAND test_json)

add_executable(test_workload tests/test_workload.cpp)
target_link_libraries(test_workload PRIVATE native_helpers)
native_warnings(test_workload)
add_test(NAME native_workload COMMAND test_workload)

add_library(native_windows STATIC src/topology_win.cpp src/cpu_sets.cpp src/measurement.cpp)
target_compile_definitions(native_windows PUBLIC _WIN32_WINNT=0x0A00 WIN32_LEAN_AND_MEAN NOMINMAX)
target_link_libraries(native_windows PUBLIC native_helpers PowrProf Advapi32)
native_warnings(native_windows)

add_executable(test_topology tests/test_topology.cpp)
target_link_libraries(test_topology PRIVATE native_windows)
native_warnings(test_topology)
add_test(NAME native_topology_records COMMAND test_topology)

add_executable(schedlab-intel src/main.cpp)
target_link_libraries(schedlab-intel PRIVATE native_windows)
native_warnings(schedlab-intel)
find_program(POWERSHELL pwsh REQUIRED)
add_test(NAME native_detect COMMAND ${POWERSHELL} -NoProfile -File
  ${CMAKE_CURRENT_SOURCE_DIR}/tests/test_detect.ps1
  -Executable $<TARGET_FILE:schedlab-intel> -Output ${CMAKE_CURRENT_BINARY_DIR}/test-detect.json)
set_tests_properties(native_detect PROPERTIES TIMEOUT 20)

add_executable(test_measurement tests/test_measurement.cpp)
target_link_libraries(test_measurement PRIVATE native_windows)
native_warnings(test_measurement)
add_test(NAME native_measurement_boundaries COMMAND test_measurement)

add_test(NAME native_saved_samples COMMAND ${POWERSHELL} -NoProfile -File
  ${CMAKE_CURRENT_SOURCE_DIR}/tests/test_samples.ps1 -Examples ${CMAKE_CURRENT_SOURCE_DIR}/../../examples)
