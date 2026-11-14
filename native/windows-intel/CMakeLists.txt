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
