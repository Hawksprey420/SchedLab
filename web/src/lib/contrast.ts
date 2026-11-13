// WCAG 2.x contrast, used to pick text colours by measurement instead of by eye.

function channels(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`expected a #rrggbb colour, got "${hex}"`);
  return [parseInt(match[1] ?? "", 16), parseInt(match[2] ?? "", 16), parseInt(match[3] ?? "", 16)];
}

function linearise(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex);
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/** Contrast ratio from 1 (identical) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

/** Which of two candidate label colours reads better on `fill`. */
export function pickLabelTone(fill: string, darkLabel: string, lightLabel: string): "dark" | "light" {
  return contrastRatio(darkLabel, fill) >= contrastRatio(lightLabel, fill) ? "dark" : "light";
}
