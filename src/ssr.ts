import { renderToString } from "react-dom/server";
import { renderTree, type LoadedRoute } from "./internal";
import type { ClientRouteEntry } from "./shapes";

/** Render markup SSR. Dipakai runtime server (`@moonsjs/vite/server`). */
export function renderToMarkup(
  entry: ClientRouteEntry,
  modules: LoadedRoute,
  params: Record<string, string>,
  data: Record<string, unknown>,
  searchParams: Record<string, string> = {},
  error?: unknown,
): string {
  return renderToString(renderTree(entry, modules, params, data, searchParams, error));
}
