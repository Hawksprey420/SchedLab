// Reads the hex values declared in tokens.css, the single source of the design colours.
// The page and the contrast test both go through here, so they cannot disagree.

export type Theme = "light" | "dark";

/** Every `--name: #rrggbb;` declaration in the stylesheet text, keyed by custom property name. */
export function readHexTokens(css: string): Record<string, string> {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const tokens: Record<string, string> = {};
  for (const [, name, value] of withoutComments.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    if (name && value) tokens[name] = value.toLowerCase();
  }
  return tokens;
}

/** The raw value of a semantic token for one theme, e.g. `ink` in `dark` reads `--ink-dark`. */
export function themeToken(tokens: Record<string, string>, name: string, theme: Theme): string {
  const value = tokens[`--${name}-${theme}`];
  if (!value) throw new Error(`tokens.css declares no --${name}-${theme}`);
  return value;
}

export function plainToken(tokens: Record<string, string>, name: string): string {
  const value = tokens[`--${name}`];
  if (!value) throw new Error(`tokens.css declares no --${name}`);
  return value;
}
