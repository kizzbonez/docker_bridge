const FALLBACK = '/';
const QUERY_KEY = '?next=';
// Destinations that would bounce straight back to the portal, or are not pages.
const PORTAL_PATHS = ['/login', '/setup', '/portal', '/auth'];

const hasControlOrBackslash = (text: string): boolean => [...text].some((char) => char < ' ' || char === '\\');

/**
 * Where to send someone after sign-in. Only a same-origin absolute path
 * survives; anything else (a full URL, "//host", backslash tricks) becomes "/",
 * so the `next` parameter can never be used as an open redirect.
 */
export function safeNext(search: string, origin: string): string {
  const raw = search.startsWith(QUERY_KEY) ? search.slice(QUERY_KEY.length) : '';
  if (!raw.startsWith('/') || raw.startsWith('//') || hasControlOrBackslash(raw)) return FALLBACK;
  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin) return FALLBACK;
    const loops = PORTAL_PATHS.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`));
    return loops ? FALLBACK : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return FALLBACK;
  }
}

/** Full-page navigation, isolated here so tests can replace it. */
export function navigate(url: string): void {
  window.location.assign(url);
}

export function nextDestination(): string {
  return safeNext(window.location.search, window.location.origin);
}
