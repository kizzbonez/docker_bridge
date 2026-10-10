/** First focusable element on every page: jumps past the navigation. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-carbon-800 focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:text-cyan-300"
    >
      Skip to content
    </a>
  );
}
