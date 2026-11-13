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
