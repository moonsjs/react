export interface NavigateOptions {
  /** Replace the current history entry instead of pushing a new one. */
  replace?: boolean;
}

import { normalizeHref } from "./url-policy";

type Navigator = (href: string, options?: NavigateOptions) => Promise<void> | void;
type Refresher = () => Promise<void> | void;

let registered: Navigator | null = null;
let registeredRefresh: Refresher | null = null;

/** Dipakai runtime client (`@moonsjs/react/client`) saat hydration aktif. */
export function registerNavigator(navigator: Navigator): void {
  registered = navigator;
}

/** Addendum A.3: revalidasi halaman saat ini tanpa reload penuh. */
export function registerRefresh(refresher: Refresher): void {
  registeredRefresh = refresher;
}

/**
 * Navigate to an internal URL without a full page reload when the client
 * runtime is active (Addendum O). `href` is a URL path — for typed route
 * patterns use `Link` instead.
 */
export function navigate(href: string, options: NavigateOptions = {}): void {
  if (href.startsWith("#")) {
    if (typeof window !== "undefined") {
      window.location.assign(href);
    }
    return;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href) || href.startsWith("//")) {
    if (typeof window !== "undefined") {
      window.location.assign(href);
    }
    return;
  }
  const normalized = normalizeHref(href);
  if (registered !== null) {
    void registered(normalized, options);
    return;
  }
  if (typeof window !== "undefined") {
    window.location.assign(normalized);
  }
}

/**
 * Addendum A.3: jalankan ulang jalur document-fetch untuk URL saat ini
 * (data loader & render segar dari server; tanpa cache/pending-state).
 */
export function refresh(): void {
  if (registeredRefresh !== null) {
    void registeredRefresh();
    return;
  }
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}
