import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-ink pb-5 pt-6">
      <div className="min-w-0 max-w-2xl">
        <h1 translate="no" className="font-serif text-3xl font-semibold leading-tight">
          SchedLab
        </h1>
        <p className="mt-1 font-serif text-ink-muted">
          Simulates first-come, first-served and non-preemptive shortest job first on one CPU core, and draws the result as a Gantt chart.
        </p>
      </div>
      <ThemeToggle />
    </header>
  );
}
