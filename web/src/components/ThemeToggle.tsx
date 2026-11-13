import { useColorScheme } from "../state/useColorScheme";

/** Follows the system preference until the reader overrides it; the override is remembered. */
export function ThemeToggle() {
  const { resolved, toggle } = useColorScheme();
  const dark = resolved === "dark";

  return (
    <button
      type="button"
      aria-pressed={dark}
      onClick={toggle}
      className="min-h-11 rounded-control border border-ink-muted px-3 text-sm hover:bg-surface"
    >
      Dark theme: <span className="font-semibold">{dark ? "on" : "off"}</span>
    </button>
  );
}
