import { createElement, type ComponentType, type ReactElement, type ReactNode } from "react";
import { LoaderDataProvider, ParamsProvider, RouteErrorProvider, SearchParamsProvider } from "./context";
import type { ClientRouteEntry, RouteModuleShape } from "./shapes";

export { LoaderDataProvider, ParamsProvider, RouteErrorProvider, SearchParamsProvider } from "./context";
export type { ClientRouteEntry, RouteModuleShape } from "./shapes";

export interface LoadedRoute {
  page: RouteModuleShape;
  layouts: RouteModuleShape[];
}

/**
 * Pohon React yang identik antara server dan client (PRD §8.2):
 * provider params → layout (root→leaf) → page, masing-masing dibungkus
 * provider data loader-nya sendiri. `error` (halaman `_error`) dibungkus
 * `RouteErrorProvider` agar `useRouteError()` bekerja.
 */
export function renderTree(
  entry: ClientRouteEntry,
  modules: LoadedRoute,
  params: Record<string, string>,
  data: Record<string, unknown>,
  searchParams: Record<string, string> = {},
  error?: unknown,
): ReactElement {
  let node = wrapModule(entry.page, modules.page, data, undefined);

  for (let index = entry.layouts.length - 1; index >= 0; index -= 1) {
    const file = entry.layouts[index] as string;
    const layout = modules.layouts[index];
    if (layout === undefined) {
      throw new Error(`[moons] layout module \`${file}\` not loaded`);
    }
    node = wrapModule(file, layout, data, node);
  }

  let tree: ReactElement = createElement(ParamsProvider, { params }, node);
  tree = createElement(SearchParamsProvider, { searchParams }, tree);
  if (error === undefined) {
    return tree;
  }
  return createElement(RouteErrorProvider, { error }, tree);
}

function wrapModule(
  file: string,
  module: RouteModuleShape,
  data: Record<string, unknown>,
  children: ReactNode,
): ReactElement {
  const Component = module.default as ComponentType<{ children?: ReactNode }> | undefined;
  if (Component === undefined) {
    throw new Error(`[moons] route module \`${file}\` has no default export`);
  }
  return createElement(
    LoaderDataProvider,
    { key: file, value: data[file] },
    createElement(Component, children === undefined ? null : { children }),
  );
}
