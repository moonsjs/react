import type { JSX, MouseEvent, ReactNode } from "react";
import { navigate } from "./navigation";
import { prefetchRoute } from "./navigation-store";
import type { RouteMap } from "./types";

/** PRD §8.1 + Addendum A.3 (`search`) + Addendum D.4 (`prefetch`). */
export type LinkProps<P extends keyof RouteMap> =
  RouteMap[P]["params"] extends Record<string, never>
    ? {
        to: P;
        params?: never;
        search?: Record<string, string | number | boolean | undefined>;
        /** Addendum D.4: prefetch dokumen saat hover/focus (default true). */
        prefetch?: boolean;
        children: ReactNode;
      }
    : {
        to: P;
        params: RouteMap[P]["params"];
        search?: Record<string, string | number | boolean | undefined>;
        /** Addendum D.4: prefetch dokumen saat hover/focus (default true). */
        prefetch?: boolean;
        children: ReactNode;
      };

/**
 * PRD §8.3: merender `<a href>`; klik kiri tanpa modifier menjadi navigasi
 * client-side. Modifier/middle-click/target eksternal diteruskan ke browser.
 */
export function Link<P extends keyof RouteMap>(props: LinkProps<P>): JSX.Element {
  const to = props.to as string;
  const params = ((props as { params?: Record<string, string> }).params ?? {}) as Record<
    string,
    string
  >;
  const search = (props as { search?: Record<string, string | number | boolean | undefined> })
    .search;
  const prefetch = (props as { prefetch?: boolean }).prefetch ?? true;
  const href = buildHref(to, params, search);
  const children = props.children;

  function onClick(event: MouseEvent<HTMLAnchorElement>): void {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.currentTarget.getAttribute("target");
    if (target !== null && target !== "_self") return;
    event.preventDefault();
    navigate(href);
  }

  function onPrefetchTrigger(): void {
    if (!prefetch || !isInternalHref(href)) {
      return;
    }
    prefetchRoute(href);
  }

  return (
    <a href={href} onClick={onClick} onPointerEnter={onPrefetchTrigger} onFocus={onPrefetchTrigger}>
      {children}
    </a>
  );
}

function isInternalHref(href: string): boolean {
  if (href.startsWith("#") || href.startsWith("//")) {
    return false;
  }
  return !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href);
}

/**
 * "/users/[id]" + { id: "u 1" } → "/users/u%201";
 * "/docs/[...rest]" + { rest: "a/b" } → "/docs/a/b".
 * Addendum A.3: `search` ditambahkan sebagai query string (nilai `undefined` dilewati).
 */
export function buildHref(
  to: string,
  params: Record<string, string>,
  search?: Record<string, string | number | boolean | undefined>,
): string {
  const segments = to.split("/").filter((segment) => segment.length > 0);
  const path =
    segments.length === 0
      ? "/"
      : `/${segments
          .map((segment) => {
            if (segment.startsWith("[...") && segment.endsWith("]")) {
              const name = segment.slice(4, -1);
              const value = params[name];
              if (value === undefined) {
                throw new Error(`[moons] param \`${name}\` not provided for Link to="${to}"`);
              }
              return value.split("/").map(encodeURIComponent).join("/");
            }
            if (segment.startsWith("[") && segment.endsWith("]")) {
              const name = segment.slice(1, -1);
              const value = params[name];
              if (value === undefined) {
                throw new Error(`[moons] param \`${name}\` not provided for Link to="${to}"`);
              }
              return encodeURIComponent(value);
            }
            return segment;
          })
          .join("/")}`;

  if (search === undefined) {
    return path;
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value !== undefined) {
      query.append(key, String(value));
    }
  }
  const queryString = query.toString();
  return queryString.length > 0 ? `${path}?${queryString}` : path;
}
