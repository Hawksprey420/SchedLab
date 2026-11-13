// Time to pixel mapping and the label-fit rule. Pure geometry: nothing here measures the DOM.
import { describe, expect, test } from "vitest";
import { fitLabel } from "../src/lib/barLabel";
import { chartWidth, createScale, MAX_CHART_WIDTH, MIN_BAR_WIDTH, MIN_CHART_WIDTH } from "../src/lib/scale";

describe("chartWidth", () => {
  test("is bounded at both ends for any makespan", () => {
    for (const makespan of [1, 5, 14, 97, 1_000, 100_000_000]) {
      const width = chartWidth(makespan);
      expect(width).toBeGreaterThanOrEqual(MIN_CHART_WIDTH);
      expect(width).toBeLessThanOrEqual(MAX_CHART_WIDTH);
    }
  });

  test("grows with the makespan until the cap", () => {
    expect(chartWidth(14)).toBeLessThanOrEqual(chartWidth(40));
    expect(chartWidth(1_000)).toBe(MAX_CHART_WIDTH);
    expect(chartWidth(100_000_000)).toBe(MAX_CHART_WIDTH);
  });
});

describe("createScale", () => {
  const scale = createScale({ makespan: 14, width: 800, padding: 40 });

  test("maps 0 and the makespan to the ends of the plot area", () => {
    expect(scale.x(0)).toBe(40);
    expect(scale.x(14)).toBe(760);
  });

  test("is linear", () => {
    expect(scale.x(7)).toBeCloseTo(400, 10);
    expect(scale.x(8) - scale.x(0)).toBeCloseTo((8 / 14) * 720, 10);
  });

  test("places a bar from its [begin, end) interval", () => {
    const rect = scale.bar(8, 12);
    expect(rect.x).toBeCloseTo(40 + (8 / 14) * 720, 10);
    expect(rect.width).toBeCloseTo((4 / 14) * 720, 10);
  });

  test("adjacent bars touch exactly", () => {
    const first = scale.bar(0, 8);
    const second = scale.bar(8, 12);
    expect(first.x + first.width).toBeCloseTo(second.x, 10);
  });

  test("a bar too thin to see is widened to the minimum and kept inside the plot", () => {
    const wide = createScale({ makespan: 100_000_000, width: 3_200, padding: 40 });
    const first = wide.bar(0, 1);
    expect(first.width).toBe(MIN_BAR_WIDTH);
    const last = wide.bar(99_999_999, 100_000_000);
    expect(last.width).toBe(MIN_BAR_WIDTH);
    expect(last.x + last.width).toBeLessThanOrEqual(3_200 - 40 + 1e-9);
  });

  test("a bar that is wide enough is never altered by the minimum", () => {
    expect(scale.bar(0, 8).width).toBeGreaterThan(MIN_BAR_WIDTH);
  });
});

describe("fitLabel", () => {
  test("prints the whole PID when it fits", () => {
    expect(fitLabel("P1", 60)).toBe("P1");
  });

  test("truncates a long PID with an ellipsis when only part fits", () => {
    const label = fitLabel("a-very-long-process-id", 80);
    expect(label).not.toBeNull();
    expect(label?.endsWith("…")).toBe(true);
    expect(label?.length).toBeLessThan("a-very-long-process-id".length);
  });

  test("drops the label when even a short stem does not fit", () => {
    expect(fitLabel("P100", 10)).toBeNull();
    expect(fitLabel("P1", 0)).toBeNull();
  });

  test("keeps whole code points when truncating", () => {
    const label = fitLabel("😀😀😀😀😀😀😀😀😀😀", 60);
    expect(label === null || !/[\uD800-\uDBFF]$/.test(label.replace(/…$/, ""))).toBe(true);
  });

  test("a wider bar never prints fewer characters than a narrower one", () => {
    const lengths = [30, 50, 70, 90, 120, 200].map((w) => Array.from(fitLabel("abcdefghijklmnopqrst", w) ?? "").length);
    expect([...lengths].sort((a, b) => a - b)).toEqual(lengths);
  });
});
