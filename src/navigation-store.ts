import { useSyncExternalStore } from "react";

/**
 * Store navigasi client (PRD Addendum D.4): `pending` + url target, dan
 * registrasi prefetcher untuk `Link`.
 */
export interface NavigationState {
  pending: boolean;
  url: string | null;
}

const INITIAL: NavigationState = { pending: false, url: null };
let state: NavigationState = INITIAL;
const listeners = new Set<() => void>();

type Prefetcher = (href: string) => void;
let prefetcher: Prefetcher | null = null;

export function subscribeNavigation(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNavigationState(): NavigationState {
  return state;
}

export function setNavigationPending(pending: boolean, url: string | null): void {
  if (state.pending === pending && state.url === url) {
    return;
  }
  state = { pending, url };
  for (const listener of listeners) {
    listener();
  }
}

/** Dipakai runtime client (`hydrate`) untuk memasang prefetcher dokumen. */
export function registerPrefetcher(fn: Prefetcher): void {
  prefetcher = fn;
}

export function prefetchRoute(href: string): void {
  if (prefetcher !== null) {
    prefetcher(href);
  }
}

/**
 * Addendum D.4: status navigasi untuk UI — `{ pending, url }`.
 * SSR memakai snapshot awal (deterministik: pending=false).
 */
export function useNavigation(): NavigationState {
  return useSyncExternalStore(subscribeNavigation, getNavigationState, getNavigationState);
}
