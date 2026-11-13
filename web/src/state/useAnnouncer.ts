import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Text for the page's single polite live region. Clearing first lets the same sentence be
 * announced twice; the delay keeps a message from talking over the field that just took focus.
 */
export function useAnnouncer() {
  const [message, setMessage] = useState("");
  const timer = useRef<number | undefined>(undefined);

  const announce = useCallback((text: string, delayMs = 60) => {
    window.clearTimeout(timer.current);
    setMessage("");
    timer.current = window.setTimeout(() => setMessage(text), delayMs);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { message, announce };
}
