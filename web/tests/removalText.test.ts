import { describe, expect, test } from "vitest";
import { describeRemoval } from "../src/lib/removalText";
import type { RemovedRow } from "../src/models/workload";

const removed = (index: number, id: string): RemovedRow => ({
  index,
  row: { key: index + 1, id, arrival: "", burst: "", priority: "" },
});

describe("describeRemoval", () => {
  test("names a single removed row", () => {
    expect(describeRemoval([removed(2, "P3")])).toBe("Removed P3.");
  });

  test("falls back to the row number when the PID is empty", () => {
    expect(describeRemoval([removed(2, "  ")])).toBe("Removed row 3.");
  });

  test("counts several rows and names the first few", () => {
    expect(describeRemoval([removed(1, "P2"), removed(2, "P3")])).toBe("Removed 2 rows (P2, P3).");
    expect(describeRemoval([1, 2, 3, 4, 5].map((i) => removed(i, `P${i + 1}`)))).toBe("Removed 5 rows (P2, P3, P4 and 2 more).");
  });
});
