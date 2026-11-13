import type { ReactNode } from "react";

interface SectionHeadingProps {
  /** Position in the reading order of the page, printed in the margin like a textbook section. */
  number: number;
  id: string;
  children: ReactNode;
}

export function SectionHeading({ number, id, children }: SectionHeadingProps) {
  return (
    <h2 id={id} tabIndex={-1} className="mb-3 font-serif text-xl font-semibold leading-snug text-ink outline-offset-4">
      <span aria-hidden="true" className="mr-2 font-normal text-ink-muted">
        {number}
      </span>
      {children}
    </h2>
  );
}
