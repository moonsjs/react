import { renderToString } from "react-dom/server";
import { renderTree, type LoadedRoute } from "./internal";
import type { ClientRouteEntry } from "./shapes";
import { setTrailingSlashPolicy } from "./url-policy";

/** Render markup SSR. Dipakai runtime server (`@moonsjs/vite/server`). */
export function renderToMarkup(
  entry: ClientRouteEntry,
  modules: LoadedRoute,
  params: Record<string, string>,
  data: Record<string, unknown>,
  searchParams: Record<string, string> = {},
  error?: unknown,
  urlPolicy?: "never" | "always",
): string {
  setTrailingSlashPolicy(urlPolicy);
  try {
    return renderToString(renderTree(entry, modules, params, data, searchParams, error));
  } finally {
    setTrailingSlashPolicy(undefined);
  }
}
