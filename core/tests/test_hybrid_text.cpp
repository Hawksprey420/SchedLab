#include "check.hpp"
#include "schedlab/text_io.hpp"

int main() {
  // CPU0: idle 0..3, five work at rate 1 => end 8, energy 5*1=5.
  const auto run = schedlab::run_hybrid_text("fcfs", "SINGLE_CORE", "ENERGY_FIRST", "A 3 5 0\n");
  CHECK_EQ(run.exit_code, 0);
  CHECK_EQ(run.stdout_text,
    "MODE SIMULATED\nPROFILE SINGLE_CORE\nALGORITHM FCFS\nHEURISTIC ENERGY_FIRST\n"
    "SEGMENT CPU0 IDLE 0 3\nSEGMENT CPU0 A 3 8\n"
    "RESULT A start=3 completion=8 waiting=0 turnaround=5 response=0\n"
    "AVERAGE waiting=0.0000 turnaround=5.0000\nMAKESPAN 8\n"
    "LANE CPU0 rate=1 energyPerTick=1 busyTicks=5 utilisation=0.6250\n"
    "TOTAL_WORK 5\nENERGY_INDEX 5\n");
  CHECK_EQ(schedlab::run_hybrid_text("rr", "SINGLE_CORE", "ENERGY_FIRST", "").exit_code, 2);
  CHECK_EQ(schedlab::run_hybrid_text("fcfs", "bogus", "ENERGY_FIRST", "").exit_code, 2);
  CHECK_EQ(schedlab::run_hybrid_text("fcfs", "SINGLE_CORE", "bogus", "").exit_code, 2);
  for (const std::string input : {"", "A 0 x 1\n", "A 0 0 1\n", "A 0 1 1\nA 0 1 1\n"}) {
    const auto a = schedlab::run_hybrid_text("sjf", "ARM_1_3_4", "FIRST_AVAILABLE", input);
    const auto b = schedlab::run_text("sjf", input);
    CHECK_EQ(a.exit_code, b.exit_code);
    CHECK_EQ(a.stdout_text, b.stdout_text);
  }
  const auto overflow = schedlab::run_hybrid_text("fcfs", "INTEL_6P_4E", "FASTEST_AVAILABLE",
                                                "A 0 9223372036854775807 1\n");
  CHECK_EQ(overflow.exit_code, 1);
  CHECK(overflow.stdout_text.rfind("ERROR - processes ", 0) == 0);
  return check::finish("test_hybrid_text");
}
