import type { Algorithm } from "../models/types";
import { SectionHeading } from "./SectionHeading";

interface AlgorithmOption {
  value: Algorithm;
  label: string;
  rule: string;
}

const OPTIONS: AlgorithmOption[] = [
  {
    value: "FCFS",
    label: "First-come, first-served (FCFS)",
    rule: "Runs processes in the order they arrive. If two arrive at the same tick, the one listed first in the table runs first.",
  },
  {
    value: "SJF_NON_PREEMPTIVE",
    label: "Shortest job first, non-preemptive (SJF)",
    rule: "Whenever the CPU is free, runs the arrived process with the shortest burst, and never interrupts it. Ties go to the earlier arrival, then to the process listed first.",
  },
];

interface AlgorithmSelectorProps {
  value: Algorithm;
  onChange: (algorithm: Algorithm) => void;
}

export function AlgorithmSelector({ value, onChange }: AlgorithmSelectorProps) {
  return (
    <section aria-labelledby="algorithm-heading">
      <SectionHeading number={2} id="algorithm-heading">
        Algorithm
      </SectionHeading>
      <fieldset>
        <legend className="sr-only">Scheduling algorithm</legend>
        <div className="space-y-3">
          {OPTIONS.map((option) => (
            <label key={option.value} className="flex items-start gap-3">
              <input
                type="radio"
                name="algorithm"
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                // The label wraps the rule for a large hit area; the name is only the title.
                aria-labelledby={`${option.value}-title`}
                aria-describedby={`${option.value}-rule`}
                className="mt-1.5 size-5 shrink-0 accent-accent"
              />
              <span className="min-w-0">
                <span
                  id={`${option.value}-title`}
                  className={["block", value === option.value ? "font-semibold text-accent" : "font-medium"].join(" ")}
                >
                  {option.label}
                </span>
                <span id={`${option.value}-rule`} className="block text-sm text-ink-muted">
                  {option.rule}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
