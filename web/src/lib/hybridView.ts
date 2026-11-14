import type { HybridSchedule, Schedule } from "../models/types";

export function isHybridSchedule(schedule: Schedule): schedule is HybridSchedule {
  return "mode" in schedule && schedule.mode === "SIMULATED";
}
