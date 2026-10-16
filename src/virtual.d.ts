declare module "virtual:moons/client-entry" {
  import type { ClientRouteEntry, RouteModuleShape } from "./shapes";

  export const clientManifest: Record<string, ClientRouteEntry>;
  export const loadRoute: Record<string, () => Promise<RouteModuleShape>>;
}
