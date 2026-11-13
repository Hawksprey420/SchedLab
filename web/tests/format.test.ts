// Display formatting only: no value is computed here, the core's numbers are rounded for print.
import { describe, expect, test } from "vitest";
import { capitalize, formatAverage, formatTicks } from "../src/lib/format";

describe("formatAverage", () => {
  test("shows two decimal places", () => {
    expect(formatAverage(20 / 3)).toBe("6.67");
    expect(formatAverage(34 / 3)).toBe("11.33");
    expect(formatAverage(8 / 3)).toBe("2.67");
    expect(formatAverage(5)).toBe("5.00");
    expect(formatAverage(0)).toBe("0.00");
  });

  test("groups thousands for readability", () => {
    expect(formatAverage(1234567.891)).toBe("1,234,567.89");
  });
});

describe("formatTicks", () => {
  test("groups thousands", () => {
    expect(formatTicks(14)).toBe("14");
    expect(formatTicks(1000)).toBe("1,000");
    expect(formatTicks(100_000_000)).toBe("100,000,000");
  });
});

describe("capitalize", () => {
  test("raises only the first letter", () => {
    expect(capitalize('duplicate id "P1"')).toBe('Duplicate id "P1"');
    expect(capitalize("")).toBe("");
    expect(capitalize("ID must be unique")).toBe("ID must be unique");
  });
});