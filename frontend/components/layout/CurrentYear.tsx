"use client";

/**
 * Renders the current year.
 * With `cacheComponents` enabled, Next.js refuses to freeze `new Date()` into
 * the prerendered shell. The parent wraps this in `<Suspense>` so the year is
 * computed at request time instead of build time.
 */
export default function CurrentYear() {
  return <span suppressHydrationWarning>{new Date().getFullYear()}</span>;
}
