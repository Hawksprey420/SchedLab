import { useState } from "react";
import type { ExampleWorkload } from "../lib/examples";

interface ExampleLoaderProps {
  examples: readonly ExampleWorkload[];
  onLoad: (example: ExampleWorkload) => void;
}

/**
 * Picking an option does nothing by itself: a closed select fires change on every arrow key,
 * which would replace the table while the reader is only browsing the list.
 */
export function ExampleLoader({ examples, onLoad }: ExampleLoaderProps) {
  const [selectedId, setSelectedId] = useState(examples[0]?.id ?? "");
  const selected = examples.find((example) => example.id === selectedId);

  return (
    <div>
      <label htmlFor="example-select" className="block text-sm font-medium">
        Example workload
      </label>
      <div className="mt-1 flex gap-2">
        <select
          id="example-select"
          name="example"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-control border border-ink-muted bg-paper px-2"
        >
          {examples.map((example) => (
            <option key={example.id} value={example.id}>
              {example.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => selected && onLoad(selected)}
          className="min-h-11 shrink-0 rounded-control border border-ink px-3 text-sm font-medium hover:bg-surface"
        >
          Load example
        </button>
      </div>
      <p className="mt-1 text-xs text-ink-muted">Loading an example replaces the table.</p>
    </div>
  );
}
