import { useCallback, useEffect, useState } from "react";

/**
 * Moves focus to an element by id after the next render, so the element has its final
 * attributes (for example aria-invalid and the error description) when focus arrives.
 */
export function useFocusRequest(): (elementId: string) => void {
  const [request, setRequest] = useState<{ id: string; count: number } | null>(null);

  useEffect(() => {
    if (request) document.getElementById(request.id)?.focus();
  }, [request]);

  return useCallback((id: string) => setRequest((previous) => ({ id, count: (previous?.count ?? 0) + 1 })), []);
}
