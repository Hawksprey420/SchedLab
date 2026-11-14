import type { Placement, Profile } from "../models/types";

interface Props {
  profile: Profile;
  heuristic: Placement;
  onProfile: (profile: Profile) => void;
  onHeuristic: (heuristic: Placement) => void;
}

export function TopologySelector({ profile, heuristic, onProfile, onHeuristic }: Props) {
  const hybrid = profile !== "SINGLE_CORE";
  return (
    <section aria-labelledby="topology-heading" className="mt-10 border-t border-rule pt-4">
      <h2 id="topology-heading" className="font-serif text-xl font-semibold">Optional architecture simulation</h2>
      <p id="topology-help" className="mt-1 text-sm text-ink-muted">Single core is the graded reference. Changing these settings recomputes a displayed result.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="topology" className="block text-sm font-medium">Topology</label>
          <select id="topology" name="topology" aria-describedby="topology-help" value={profile} onChange={e => onProfile(e.target.value as Profile)} className="mt-1 min-h-11 w-full rounded-control border border-ink-muted bg-paper px-2">
            <option value="SINGLE_CORE">Single core (graded)</option>
            <option value="INTEL_6P_4E">Intel-style: 6 P + 4 E physical cores</option>
            <option value="ARM_1_3_4">Arm-style: 1 Prime + 3 Big + 4 LITTLE</option>
          </select>
        </div>
        {hybrid && <div>
          <label htmlFor="placement" className="block text-sm font-medium">Placement heuristic</label>
          <select id="placement" name="placement" value={heuristic} onChange={e => onHeuristic(e.target.value as Placement)} className="mt-1 min-h-11 w-full rounded-control border border-ink-muted bg-paper px-2">
            <option value="FIRST_AVAILABLE">First available (core ID order)</option>
            <option value="FASTEST_AVAILABLE">Fastest available</option>
            <option value="ENERGY_FIRST">Energy first</option>
          </select>
        </div>}
      </div>
      {hybrid && <p className="mt-3 text-sm text-ink-muted">Burst is work units in this mode. Rates and energy units are fictional teaching values, not measurements of any CPU. Placement chooses an idle lane independently of FCFS or SJF. Energy first can finish later. Intel has 10 physical lanes; P-core SMT accounts for 16 logical processors on the example CPU without adding physical cores.</p>}
    </section>
  );
}
