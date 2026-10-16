/// <reference path="./virtual.d.ts" />
import { decodeSsrPayload, reviveError, type SerializedError } from "@moonsjs/core/serialize";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderTree } from "./internal";
import { registerNavigator, registerRefresh } from "./navigation";
import { registerPrefetcher, setNavigationPending } from "./navigation-store";
import type { ClientRouteEntry, RouteModuleShape } from "./shapes";

let root: Root | null = null;

type ScrollMode = "top" | "keep" | "restore";

interface NavigateOptions {
  push: boolean;
  scroll: ScrollMode;
}

/** Addendum D.4: prefetch dokumen (best effort) — TTL cache kecil. */
const PREFETCH_TTL_MS = 10_000;
const prefetchCache = new Map<string, { html: string; url: string; at: number }>();

/**
 * Boot hydration sisi client (PRD §8.2). Dipanggil dari `src/client/main.tsx`.
 */
export async function hydrate(): Promise<void> {
  const container = document.getElementById("root");
  if (container === null) {
    throw new Error("[moons] #root element not found");
  }
  const script = document.getElementById("__moons_data");
  if (script === null) {
    throw new Error("[moons] #__moons_data script not found");
  }

  // Addendum B.3: scroll restoration dikelola manual (konten di-swap async).
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  await hydratePayload(script.textContent ?? "", container);

  registerNavigator(async (href) => {
    saveCurrentScroll();
    await documentNavigate(href, { push: true, scroll: "top" });
  });
  registerRefresh(async () => {
    invalidatePrefetch(window.location.href);
    await documentNavigate(window.location.href, { push: false, scroll: "keep" });
  });
  registerPrefetcher((href) => {
    void prefetchDocument(href);
  });
  window.addEventListener("popstate", () => {
    void documentNavigate(window.location.href, { push: false, scroll: "restore" });
  });
}

function invalidatePrefetch(href: string): void {
  prefetchCache.delete(href);
}

async function prefetchDocument(href: string): Promise<void> {
  const existing = prefetchCache.get(href);
  if (existing !== undefined && Date.now() - existing.at < PREFETCH_TTL_MS) {
    return; // sudah segar — jangan fetch dobel (hover berulang)
  }
  try {
    const response = await fetch(href, { headers: { accept: "text/html" } });
    if (!response.ok) {
      return;
    }
    const html = await response.text();
    const finalUrl = response.url.length > 0 ? response.url : href;
    const entry = { html, url: finalUrl, at: Date.now() };
    prefetchCache.set(href, entry);
    if (finalUrl !== href) {
      prefetchCache.set(finalUrl, entry);
    }
  } catch {
    // prefetch = best effort; kegagalan diabaikan
  }
}

function takeFreshPrefetch(href: string): { html: string; url: string } | null {
  const entry = prefetchCache.get(href);
  if (entry === undefined) {
    return null;
  }
  prefetchCache.delete(href);
  if (entry.url !== href) {
    prefetchCache.delete(entry.url);
  }
  if (Date.now() - entry.at >= PREFETCH_TTL_MS) {
    return null;
  }
  return { html: entry.html, url: entry.url };
}

/** Simpan posisi scroll entri saat ini sebelum meninggalkannya (Addendum B.3). */
function saveCurrentScroll(): void {
  const state = (history.state ?? {}) as Record<string, unknown>;
  history.replaceState({ ...state, moonsScrollY: window.scrollY }, "");
}

function restoreScroll(mode: ScrollMode, href: string): void {
  if (mode === "keep") {
    return;
  }
  if (mode === "restore") {
    const state = history.state as { moonsScrollY?: unknown } | null;
    const saved = state?.moonsScrollY;
    window.scrollTo(0, typeof saved === "number" ? saved : 0);
    return;
  }
  // mode "top": hormati #anchor bila ada.
  const hashIndex = href.indexOf("#");
  const id = hashIndex === -1 ? "" : href.slice(hashIndex + 1);
  if (id.length > 0) {
    const target = document.getElementById(id);
    if (target !== null) {
      target.scrollIntoView();
      return;
    }
  }
  window.scrollTo(0, 0);
}

/** Terapkan meta route ke <head> (Addendum B.1) — title + description + og. */
function applyMeta(meta: Record<string, unknown> | undefined): void {
  if (meta === undefined) {
    return;
  }
  if (typeof meta.title === "string") {
    document.title = meta.title;
  }
  upsertMeta("name", "description", meta.description);
  upsertMeta("property", "og:title", meta.title);
  upsertMeta("property", "og:description", meta.description);
}

function upsertMeta(attr: "name" | "property", key: string, value: unknown): void {
  if (typeof value !== "string") {
    return;
  }
  let element = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (element === null) {
    element = document.createElement("meta");
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", value);
}

async function hydratePayload(text: string, container: HTMLElement): Promise<void> {
  const payload = decodeSsrPayload(text);
  applyMeta(payload.meta);
  const { clientManifest, loadRoute } = await import("virtual:moons/client-entry");

  const entry = clientManifest[payload.key];
  if (entry === undefined) {
    // Markup statis (mis. halaman 404 bawaan): tidak ada yang di-hydrate.
    return;
  }

  const modules = await loadModules(entry, loadRoute);
  root?.unmount();
  const error =
    payload.error === undefined ? undefined : reviveError(payload.error as SerializedError);
  root = hydrateRoot(
    container,
    renderTree(
      entry,
      modules,
      payload.params,
      payload.data,
      payload.searchParams ?? {},
      error,
    ),
  );
}

async function loadModules(
  entry: ClientRouteEntry,
  loadRoute: Record<string, () => Promise<RouteModuleShape>>,
): Promise<{ page: RouteModuleShape; layouts: RouteModuleShape[] }> {
  const page = loadOne(loadRoute, entry.page);
  const layouts = entry.layouts.map((file) => loadOne(loadRoute, file));
  const [pageModule, ...layoutModules] = await Promise.all([page, ...layouts]);
  return { page: pageModule, layouts: layoutModules };
}

function loadOne(
  loadRoute: Record<string, () => Promise<RouteModuleShape>>,
  file: string,
): Promise<RouteModuleShape> {
  const load = loadRoute[file];
  if (load === undefined) {
    return Promise.reject(
      new Error(`[moons] route module \`${file}\` is missing from the client manifest`),
    );
  }
  return load();
}

async function documentNavigate(href: string, options: NavigateOptions): Promise<void> {
  // Addendum D.4: status pending untuk `useNavigation()`.
  setNavigationPending(true, href);
  try {
    const cached = takeFreshPrefetch(href);
    let html: string;
    let finalUrl = href;

    if (cached !== null) {
      html = cached.html;
      finalUrl = cached.url;
    } else {
      const response = await fetch(href, { headers: { accept: "text/html" } });
      if (!response.ok) {
        // 404/500 (atau redirect yang berakhir non-ok): fallback full document load.
        window.location.assign(href);
        return;
      }
      finalUrl = response.url.length > 0 ? response.url : href;
      html = await response.text();
    }

    const doc = new DOMParser().parseFromString(html, "text/html");
    const newRoot = doc.getElementById("root");
    const dataScript = doc.getElementById("__moons_data");
    const container = document.getElementById("root");
    if (newRoot === null || dataScript === null || container === null) {
      window.location.assign(href);
      return;
    }

    if (options.push) {
      // Addendum B.2: redirect HTTP diikuti fetch — entri history memakai URL final.
      history.pushState({ moonsScrollY: 0 }, "", finalUrl);
    }

    root?.unmount();
    root = null;
    container.innerHTML = newRoot.innerHTML;
    await hydratePayload(dataScript.textContent ?? "", container);
    restoreScroll(options.scroll, finalUrl);
  } catch {
    window.location.assign(href);
  } finally {
    setNavigationPending(false, null);
  }
}
