type Navigator = (href: string) => Promise<void> | void;
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
 * Navigasi client-side (§8.3): tanpa reload bila runtime client aktif,
 * fallback ke navigasi browser biasa.
 */
export function navigate(href: string): void {
  if (registered !== null) {
    void registered(href);
    return;
  }
  if (typeof window !== "undefined") {
    window.location.assign(href);
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
