"use client";

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  /** Retained for API compatibility; magnetism was removed as over-design. */
  strength?: number;
}

/**
 * Formerly a cursor-following "magnetic" wrapper. Now a plain passthrough so
 * CTAs behave predictably. Kept as a component so the ~16 call sites don't
 * need touching; button hover/press feedback lives in the button classes.
 */
export function MagneticButton({ children, className }: MagneticButtonProps) {
  return <div className={className}>{children}</div>;
}
