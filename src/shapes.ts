/** Bentuk data yang dipertukarkan dengan virtual module `virtual:moons/client-entry`. */

export interface ClientRouteEntry {
  /** Key file route (routeKeyFromFile): mis. "index", "users/[id]". */
  page: string;
  /** Key file layout dari root ke leaf. */
  layouts: string[];
}

export interface RouteModuleShape {
  default?: unknown;
}
