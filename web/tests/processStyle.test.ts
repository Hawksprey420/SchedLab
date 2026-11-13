// Process colour and hatch pattern: assigned by input position, the same in FCFS and SJF.
import { describe, expect, test } from "vitest";
import { contrastRatio } from "../src/lib/contrast";
import { PROCESS_COLOR_COUNT, labelHex, processStyle } from "../src/lib/processStyle";

describe("processStyle", () => {
  test("is stable: the same position always gets the same style", () => {
    expect(processStyle(3)).toEqual(processStyle(3));
    expect(processStyle(0).fillHex).toBe("#0072b2");
  });

  test("the first 49 processes get 49 distinct colour and pattern pairs", () => {
    const pairs = new Set(Array.from({ length: 49 }, (_, i) => processStyle(i).patternId));
    expect(pairs.size).toBe(49);
  });

  test("neighbouring processes always differ in both colour and pattern", () => {
    for (let i = 0; i < 99; i += 1) {
      expect(processStyle(i).colorIndex).not.toBe(processStyle(i + 1).colorIndex);
      expect(processStyle(i).pattern).not.toBe(processStyle(i + 1).pattern);
    }
  });

  test("the first seven processes use all seven colours and all seven patterns", () => {
    const first = Array.from({ length: PROCESS_COLOR_COUNT }, (_, i) => processStyle(i));
    expect(new Set(first.map((s) => s.colorIndex)).size).toBe(7);
    expect(new Set(first.map((s) => s.pattern)).size).toBe(7);
    expect(first[0]?.pattern).toBe("solid");
  });

  test("cycles after 49 processes instead of failing", () => {
    expect(processStyle(49).patternId).toBe(processStyle(0).patternId);
    expect(processStyle(100).fillHex).toBe(processStyle(100 % 49).fillHex);
  });

  test("every colour gets a label colour that measures at least 4.5:1 against its fill", () => {
    for (let i = 0; i < PROCESS_COLOR_COUNT; i += 1) {
      const style = processStyle(i);
      expect(contrastRatio(labelHex(style.labelTone), style.fillHex)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("the label colour is the better of the two, not just a passing one", () => {
    for (let i = 0; i < PROCESS_COLOR_COUNT; i += 1) {
      const style = processStyle(i);
      const other = style.labelTone === "dark" ? "light" : "dark";
      expect(contrastRatio(labelHex(style.labelTone), style.fillHex)).toBeGreaterThanOrEqual(
        contrastRatio(labelHex(other), style.fillHex),
      );
    }
  });

  test("rejects a negative or fractional position", () => {
    expect(() => processStyle(-1)).toThrow();
    expect(() => processStyle(1.5)).toThrow();
  });
});
