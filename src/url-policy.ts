import { applyTrailingSlash } from "@moonsjs/core/url-policy";

type TrailingSlashPolicy = "never" | "always";

let policy: TrailingSlashPolicy | undefined;

/** Set the app's URL policy (SSR render or client hydration). */
export function setTrailingSlashPolicy(next: TrailingSlashPolicy | undefined): void {
  policy = next;
}

export function getTrailingSlashPolicy(): TrailingSlashPolicy | undefined {
  return policy;
}

/** Normalize a pathname (no query/hash) with the active policy. */
export function normalizePath(pathname: string): string {
  return policy === undefined ? pathname : applyTrailingSlash(pathname, policy);
}

/**
 * Normalize the pathname of an internal href while preserving query + hash.
 * External URLs and bare fragments are returned unchanged.
 */
export function normalizeHref(href: string): string {
  if (href.length === 0 || href.startsWith("#") || href.startsWith("?") || policy === undefined) {
    return href;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href) || href.startsWith("//")) {
    return href;
  }
  const url = new URL(href, "http://moons.local");
  url.pathname = applyTrailingSlash(url.pathname, policy);
  return `${url.pathname}${url.search}${url.hash}`;
}
