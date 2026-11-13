import { useCallback, useEffect, useState } from "react";

type Override = "light" | "dark" | null;

const STORAGE_KEY = "color-scheme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readOverride(): Override {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

function writeOverride(value: Override): void {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Blocked storage only costs persistence; the theme still applies to this page.
  }
}

/**
 * Two-state theme control. With no override the page follows the system preference; the
 * toggle stores an explicit scheme only when it differs from the system's, so choosing the
 * system's own scheme again returns to "follow the system" instead of pinning it.
 */
export function useColorScheme() {
  const [override, setOverride] = useState<Override>(readOverride);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(DARK_QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY);
    const onChange = () => setSystemDark(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    // Another tab may change the override.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) setOverride(readOverride());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    // The meta tag is what the CSS reads (see tokens.css); "light dark" means follow the system.
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute("content", override ?? "light dark");
  }, [override]);

  const resolved: "light" | "dark" = override ?? (systemDark ? "dark" : "light");

  const toggle = useCallback(() => {
    const target = resolved === "dark" ? "light" : "dark";
    const next: Override = target === (systemDark ? "dark" : "light") ? null : target;
    writeOverride(next);
    setOverride(next);
  }, [resolved, systemDark]);

  return { resolved, toggle };
}
