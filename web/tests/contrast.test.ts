// WCAG contrast maths, and the measured ratios of the design tokens in tokens.css.
// The tokens are read from the same file the page loads, so the numbers cannot drift.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { contrastRatio, pickLabelTone, relativeLuminance } from "../src/lib/contrast";
import { readHexTokens, themeToken, type Theme } from "../src/lib/tokens";

const tokens = readHexTokens(readFileSync(join(import.meta.dirname, "../src/styles/tokens.css"), "utf8"));
const THEMES: Theme[] = ["light", "dark"];

describe("contrastRatio", () => {
  test("black on white is 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  test("is symmetric", () => {
    expect(contrastRatio("#0072b2", "#fffff8")).toBeCloseTo(contrastRatio("#fffff8", "#0072b2"), 10);
  });

  test("identical colours are 1:1", () => {
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 10);
  });

  test("matches the reference values of the antislop-human table", () => {
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
    expect(contrastRatio("#ffffff", "#666666")).toBeCloseTo(5.74, 2);
    expect(contrastRatio("#ffffff", "#999999")).toBeCloseTo(2.85, 2);
    expect(contrastRatio("#555555", "#000000")).toBeCloseTo(2.82, 2);
  });

  test("accepts upper case hex digits", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
  });

  test("rejects a malformed colour instead of guessing", () => {
    expect(() => contrastRatio("red", "#ffffff")).toThrow();
    expect(() => contrastRatio("#fff", "#ffffff")).toThrow();
  });
});

describe("relativeLuminance", () => {
  test("is 0 for black and 1 for white", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 10);
  });
});

describe("pickLabelTone", () => {
  test("chooses the colour with the higher contrast", () => {
    expect(pickLabelTone("#ffffff", "#111111", "#fffff8")).toBe("dark");
    expect(pickLabelTone("#000000", "#111111", "#fffff8")).toBe("light");
  });
});

describe("design tokens (tokens.css)", () => {
  test("every text token and its background exist for both themes", () => {
    for (const theme of THEMES) {
      for (const name of ["paper", "surface", "ink", "ink-muted", "accent", "danger", "on-accent"]) {
        expect(themeToken(tokens, name, theme)).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  const TEXT_TOKENS = ["ink", "ink-muted", "accent", "danger"];
  const BACKGROUNDS = ["paper", "surface"];

  for (const theme of THEMES) {
    for (const text of TEXT_TOKENS) {
      for (const background of BACKGROUNDS) {
        test(`${text} on ${background} reaches 4.5:1 in the ${theme} theme`, () => {
          const ratio = contrastRatio(themeToken(tokens, text, theme), themeToken(tokens, background, theme));
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        });
      }
    }

    test(`the label on a primary button reaches 4.5:1 in the ${theme} theme`, () => {
      const ratio = contrastRatio(themeToken(tokens, "on-accent", theme), themeToken(tokens, "accent", theme));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  }

  test("prints the measured ratios for the report", () => {
    const rows = THEMES.flatMap((theme) =>
      TEXT_TOKENS.flatMap((text) =>
        BACKGROUNDS.map((background) => {
          const ratio = contrastRatio(themeToken(tokens, text, theme), themeToken(tokens, background, theme));
          return `${theme} ${text} on ${background}: ${ratio.toFixed(2)}`;
        }),
      ),
    );
    expect(rows).toHaveLength(16);
  });
});
