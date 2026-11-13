// Field parsing: the UI checks presence, base-10 integer syntax and the numeric limits only.
// ID rules and the process count belong to the core (docs/web-contract.md).
import { describe, expect, test } from "vitest";
import { FIELD_LIMITS, parseCount, parseNumericField } from "../src/lib/parseField";

function valueOf(result: ReturnType<typeof parseNumericField>): number {
  if (!result.ok) throw new Error(`expected a value, got: ${result.message}`);
  return result.value;
}

function messageOf(result: ReturnType<typeof parseNumericField>): string {
  if (result.ok) throw new Error(`expected an error, got ${result.value}`);
  return result.message;
}

describe("parseNumericField: accepted input", () => {
  test("plain integers", () => {
    expect(valueOf(parseNumericField("arrival", "0"))).toBe(0);
    expect(valueOf(parseNumericField("burst", "8"))).toBe(8);
    expect(valueOf(parseNumericField("priority", "-3"))).toBe(-3);
  });

  test("surrounding spaces are trimmed", () => {
    expect(valueOf(parseNumericField("burst", "  12  "))).toBe(12);
  });

  test("leading zeros are read as base 10", () => {
    expect(valueOf(parseNumericField("burst", "007"))).toBe(7);
  });

  test("negative zero becomes zero", () => {
    expect(Object.is(valueOf(parseNumericField("arrival", "-0")), 0)).toBe(true);
  });
});

describe("parseNumericField: presence and syntax", () => {
  test("empty text is reported as missing, not as zero", () => {
    expect(messageOf(parseNumericField("burst", ""))).toMatch(/burst is empty/i);
  });

  test("spaces only counts as empty", () => {
    expect(messageOf(parseNumericField("arrival", "   "))).toMatch(/arrival is empty/i);
  });

  test.each(["1.5", "1e3", "abc", "+5", "1 2", "0x10", "--1", "1,000", "٣"])("rejects %j as not a whole number", (text) => {
    const message = messageOf(parseNumericField("burst", text));
    expect(message).toMatch(/not a whole number/i);
    expect(message).toContain(`"${text}"`);
  });

  test("each message says how to fix the value", () => {
    expect(messageOf(parseNumericField("arrival", "x"))).toMatch(/enter a whole number from 0 to 1,000,000/i);
  });
});

describe("parseNumericField: limits", () => {
  test("states the limits the contract fixes", () => {
    expect(FIELD_LIMITS).toEqual({
      arrival: { min: 0, max: 1_000_000 },
      burst: { min: 1, max: 1_000_000 },
      priority: { min: -1000, max: 1000 },
    });
  });

  test.each([
    ["arrival", "0", 0],
    ["arrival", "1000000", 1_000_000],
    ["burst", "1", 1],
    ["burst", "1000000", 1_000_000],
    ["priority", "-1000", -1000],
    ["priority", "1000", 1000],
  ] as const)("accepts %s %s (at the limit)", (field, text, expected) => {
    expect(valueOf(parseNumericField(field, text))).toBe(expected);
  });

  test.each([
    ["arrival", "-1"],
    ["arrival", "1000001"],
    ["burst", "0"],
    ["burst", "1000001"],
    ["priority", "-1001"],
    ["priority", "1001"],
  ] as const)("rejects %s %s (beyond the limit)", (field, text) => {
    const message = messageOf(parseNumericField(field, text));
    expect(message).toContain(`"${text}"`);
    expect(message).toMatch(/below|above/);
  });

  test("a negative arrival says it is below zero", () => {
    expect(messageOf(parseNumericField("arrival", "-1"))).toMatch(/below 0/);
  });

  test("a very long digit string is out of range, never rounded into range", () => {
    const huge = "9".repeat(400);
    expect(messageOf(parseNumericField("burst", huge))).toMatch(/above 1,000,000/);
    expect(messageOf(parseNumericField("priority", `-${huge}`))).toMatch(/below -1,000/);
  });

  test("a long string of leading zeros is still its small value", () => {
    expect(valueOf(parseNumericField("burst", `${"0".repeat(300)}5`))).toBe(5);
  });

  test("a long value is shortened in the message so the layout survives", () => {
    const message = messageOf(parseNumericField("burst", "9".repeat(400)));
    expect(message.length).toBeLessThan(160);
    expect(message).toContain("…");
  });
});

describe("parseCount", () => {
  test("accepts zero up to the row ceiling", () => {
    expect(parseCount("0")).toEqual({ ok: true, value: 0 });
    expect(parseCount("101")).toEqual({ ok: true, value: 101 });
  });

  test("rejects empty and non-integer text", () => {
    expect(parseCount("").ok).toBe(false);
    expect(parseCount("2.5").ok).toBe(false);
    expect(parseCount("-1").ok).toBe(false);
  });

  test("rejects a count that would build an unusable page", () => {
    const result = parseCount("100000");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/at most/i);
  });
});
