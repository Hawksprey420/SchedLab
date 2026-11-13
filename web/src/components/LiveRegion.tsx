/** The page's one polite live region; see useAnnouncer. Visually hidden, read by screen readers. */
export function LiveRegion({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" className="sr-only">
      {message}
    </div>
  );
}
