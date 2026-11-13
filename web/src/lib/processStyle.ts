// Colour and hatch pattern of a process, decided by its position in the input list so FCFS
// and SJF draw the same process the same way (DESIGN.md, "Process colours").
import tokensCss from "../styles/tokens.css?raw";
import { pickLabelTone } from "./contrast";
import { plainToken, readHexTokens } from "./tokens";

export const PROCESS_COLOR_COUNT = 7;

export const HATCH_PATTERNS = ["solid", "diagonal", "reverse-diagonal", "cross", "dots", "horizontal", "vertical"] as const;
export type HatchPattern = (typeof HATCH_PATTERNS)[number];

export type LabelTone = "dark" | "light";

export interface ProcessStyle {
  colorIndex: number;
  pattern: HatchPattern;
  /** Unique per colour and pattern pair; used for the SVG pattern id. */
  patternId: string;
  /** CSS reference to the token, e.g. `var(--process-3)`. */
  fill: string;
  fillHex: string;
  labelTone: LabelTone;
}

const tokens = readHexTokens(tokensCss);
const darkLabel = plainToken(tokens, "label-on-light-fill");
const lightLabel = plainToken(tokens, "label-on-dark-fill");

export function labelHex(tone: LabelTone): string {
  return tone === "dark" ? darkLabel : lightLabel;
}

/** The same colour as a CSS reference, for drawing. */
export function labelColor(tone: LabelTone): string {
  return tone === "dark" ? "var(--label-on-light-fill)" : "var(--label-on-dark-fill)";
}

const styles = Array.from({ length: PROCESS_COLOR_COUNT }, (_, colorIndex) => {
  const fillHex = plainToken(tokens, `process-${colorIndex}`);
  return { fillHex, labelTone: pickLabelTone(fillHex, darkLabel, lightLabel) };
});

/**
 * Colour cycles every 7 processes. The pattern advances by one step more on each lap, so the
 * pair repeats only after 49 processes, and neighbours differ in both channels. (Two cycles
 * of the same length 7 would repeat the pair every 7.)
 */
export function processStyle(position: number): ProcessStyle {
  if (!Number.isInteger(position) || position < 0) throw new Error(`position must be a non-negative integer, got ${position}`);
  const colorIndex = position % PROCESS_COLOR_COUNT;
  const lap = Math.floor(position / PROCESS_COLOR_COUNT);
  const patternIndex = (position + lap) % HATCH_PATTERNS.length;
  const pattern = HATCH_PATTERNS[patternIndex] ?? "solid";
  const base = styles[colorIndex];
  if (!base) throw new Error(`no colour for index ${colorIndex}`);
  return {
    colorIndex,
    pattern,
    patternId: `${colorIndex}-${patternIndex}`,
    fill: `var(--process-${colorIndex})`,
    fillHex: base.fillHex,
    labelTone: base.labelTone,
  };
}
