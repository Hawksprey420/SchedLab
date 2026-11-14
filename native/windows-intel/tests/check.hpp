#pragma once
#include <iostream>
#include <stdexcept>
#include <string>

inline int failures = 0;
#define CHECK(expression) do { if (!(expression)) { std::cerr << __LINE__ << ": " #expression "\n"; ++failures; } } while (false)

template <typename F> void rejects(F action) {
  try { action(); CHECK(false); }
  catch (const std::invalid_argument& error) { CHECK(std::string(error.what()).size() > 0); }
}
