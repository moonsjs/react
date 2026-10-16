import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { ParamsFor } from "./types";

const ParamsContext = createContext<Record<string, string> | null>(null);
const SearchParamsContext = createContext<Record<string, string> | null>(null);
const LoaderDataContext = createContext<{ value: unknown } | null>(null);
const RouteErrorContext = createContext<{ error: unknown } | null>(null);

export function ParamsProvider(props: { params: Record<string, string>; children?: ReactNode }) {
  return <ParamsContext.Provider value={props.params}>{props.children}</ParamsContext.Provider>;
}

/** Addendum A.3: query string request, identik server & client. */
export function SearchParamsProvider(props: {
  searchParams: Record<string, string>;
  children?: ReactNode;
}) {
  return (
    <SearchParamsContext.Provider value={props.searchParams}>
      {props.children}
    </SearchParamsContext.Provider>
  );
}

export function LoaderDataProvider(props: { value: unknown; children?: ReactNode }) {
  return (
    <LoaderDataContext.Provider value={{ value: props.value }}>
      {props.children}
    </LoaderDataContext.Provider>
  );
}

export function RouteErrorProvider(props: { error: unknown; children?: ReactNode }) {
  return (
    <RouteErrorContext.Provider value={{ error: props.error }}>
      {props.children}
    </RouteErrorContext.Provider>
  );
}

/** PRD §8.1 + Addendum A.3. */
export function useParams<P extends string = string>(): ParamsFor<P> {
  const params = useContext(ParamsContext);
  if (params === null) {
    throw new Error("[moons] `useParams` called outside a route render");
  }
  return params as ParamsFor<P>;
}

/** Addendum A.3: query string request (`?a=1&b=2`). */
export function useSearchParams(): Record<string, string> {
  const searchParams = useContext(SearchParamsContext);
  if (searchParams === null) {
    throw new Error("[moons] `useSearchParams` called outside a route render");
  }
  return searchParams;
}

/** PRD §8.1. */
export function useLoaderData<T extends (...args: any) => any>(): Awaited<ReturnType<T>> {
  const context = useContext(LoaderDataContext);
  if (context === null) {
    throw new Error("[moons] `useLoaderData` called outside a route render");
  }
  return context.value as Awaited<ReturnType<T>>;
}

/** PRD §8.1. */
export function useRouteError(): unknown {
  const context = useContext(RouteErrorContext);
  return context?.error;
}
