// Axis ticks: 1-2-5 steps, a bounded count, never one value per tick of a long schedule.
import { describe, expect, test } from "vitest";
import { axisTicks, niceStep } from "../src/lib/ticks";

const MAKESPANS = [1, 14, 97, 1_000, 100_000_000];
const WIDTHS = [280, 640, 1_200, 3_200];

function isOneTwoFive(step: number): boolean {
  const mantissa = step / 10 ** Math.floor(Math.log10(step));
  return [1, 2, 5].some((m) => Math.abs(mantissa - m) < 1e-9);
}

describe("niceStep", () => {
  test("uses the smallest 1-2-5 step that fits the tick budget", () => {
    expect(niceStep(14, 20)).toBe(1);
    expect(niceStep(14, 12)).toBe(2);
    expect(niceStep(97, 12)).toBe(10);
    expect(niceStep(1_000, 12)).toBe(100);
    expect(niceStep(100_000_000, 12)).toBe(10_000_000);
  });

  test("never returns a step below 1 tick: ticks are whole numbers", () => {
    expect(niceStep(1, 50)).toBe(1);
  });

  test("always returns a 1-2-5 step", () => {
    for (const max of MAKESPANS) for (const budget of [2, 3, 7, 12, 33]) expect(isOneTwoFive(niceStep(max, budget))).toBe(true);
  });
});

describe("axisTicks", () => {
  test("makespan 1 gives 0 and 1", () => {
    expect(axisTicks(1, 640)).toEqual([0, 1]);
  });

  test("makespan 14 on a 640 px axis is labelled at every tick", () => {
    expect(axisTicks(14, 640)).toEqual(Array.from({ length: 15 }, (_, i) => i));
  });

  test("makespan 14 on a 280 px axis thins to every 2 ticks", () => {
    expect(axisTicks(14, 280)).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
  });

  test("starts at 0, rises strictly and stays inside the schedule", () => {
    for (const max of MAKESPANS) {
      for (const width of WIDTHS) {
        const ticks = axisTicks(max, width);
        expect(ticks[0]).toBe(0);
        for (let i = 1; i < ticks.length; i += 1) expect(ticks[i]).toBeGreaterThan(ticks[i - 1] ?? 0);
        expect(ticks.at(-1)).toBeLessThanOrEqual(max);
      }
    }
  });

  test("the tick count is bounded by the width, not by the makespan", () => {
    for (const max of MAKESPANS) {
      for (const width of WIDTHS) {
        const labelGap = String(max).length * 7.2 + 16;
        expect(axisTicks(max, width).length).toBeLessThanOrEqual(Math.floor(width / labelGap) + 1);
      }
    }
    expect(axisTicks(100_000_000, 3_200).length).toBeLessThanOrEqual(40);
  });

  test("labels never crowd: neighbouring ticks stay at least a label apart", () => {
    for (const max of MAKESPANS) {
      for (const width of WIDTHS) {
        const ticks = axisTicks(max, width);
        const labelPx = String(max).length * 7;
        for (let i = 1; i < ticks.length; i += 1) {
          const gapPx = (((ticks[i] ?? 0) - (ticks[i - 1] ?? 0)) / max) * width;
          expect(gapPx).toBeGreaterThanOrEqual(labelPx);
        }
      }
    }
  });

  test("ends on the makespan when there is room, so the schedule's end can be read", () => {
    expect(axisTicks(97, 3_200).at(-1)).toBe(97);
    expect(axisTicks(100_000_000, 3_200).at(-1)).toBe(100_000_000);
  });

  test("all steps between the 1-2-5 grid ticks are equal", () => {
    const ticks = axisTicks(1_000, 640);
    const step = (ticks[1] ?? 0) - (ticks[0] ?? 0);
    expect(isOneTwoFive(step)).toBe(true);
    expect(ticks.slice(0, 4).map((t, i) => t - i * step)).toEqual([0, 0, 0, 0]);
  });

  test("a degenerate makespan still yields a usable axis", () => {
    expect(axisTicks(0, 640)).toEqual([0]);
  });
});
