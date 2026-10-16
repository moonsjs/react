import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { Link, useLoaderData, useParams, useRouteError, useSearchParams } from "@moonsjs/react";
import { RouteErrorProvider, type ClientRouteEntry } from "@moonsjs/react/internal";
import { renderToMarkup } from "@moonsjs/react/ssr";
import type { ReactNode } from "react";
import { buildHref } from "../src/link";

declare module "@moonsjs/react" {
  interface RouteMap {
    "/about": { params: {} };
    "/users/[id]": { params: { id: string } };
    "/docs/[...rest]": { params: { rest: string } };
  }
}

const layoutLoader = async () => ({ site: "Moons Basic" });

function Layout(props: { children?: ReactNode }) {
  const data = useLoaderData<typeof layoutLoader>();
  return (
    <div id="layout">
      site:{data.site};{props.children}
    </div>
  );
}

const pageLoader = async () => ({ name: "Alice" });

function Page() {
  const data = useLoaderData<typeof pageLoader>();
  const params = useParams<"/users/[id]">();
  return (
    <p id="page">
      page:{params.id}:{data.name}
    </p>
  );
}

test("renderToMarkup menyusun provider + layout + page dengan data loader masing-masing", () => {
  const entry: ClientRouteEntry = { page: "users/[id]", layouts: ["_layout"] };
  const plain = (markup: string): string => markup.replaceAll("<!-- -->", "");

  const markup = renderToMarkup(
    entry,
    { page: { default: Page }, layouts: [{ default: Layout }] },
    { id: "u1" },
    { "users/[id]": { name: "Alice" }, _layout: { site: "Moons Basic" } },
  );

  expect(markup).toContain('id="layout"');
  expect(plain(markup)).toContain("site:Moons Basic;");
  expect(plain(markup)).toContain("page:u1:Alice");
});

test("Link merender <a href> (§8.3) dan mengisi params", () => {
  expect(renderToString(<Link to="/about">About</Link>)).toBe('<a href="/about">About</a>');
  expect(renderToString(<Link to="/users/[id]" params={{ id: "u 1" }}>U</Link>)).toBe(
    '<a href="/users/u%201">U</a>',
  );
});

test("buildHref menangani dynamic, catch-all, query, dan root", () => {
  expect(buildHref("/", {})).toBe("/");
  expect(buildHref("/users/[id]", { id: "u 1" })).toBe("/users/u%201");
  expect(buildHref("/docs/[...rest]", { rest: "a/b c" })).toBe("/docs/a/b%20c");
  expect(buildHref("/", {}, { month: "2026-11", flag: true, skip: undefined })).toBe(
    "/?month=2026-11&flag=true",
  );
  expect(() => buildHref("/users/[id]", {})).toThrow("param `id` not provided for Link");
});

test("useParams/useLoaderData di luar render route → error jelas", () => {
  function Stray() {
    useParams();
    return null;
  }
  expect(() => renderToString(<Stray />)).toThrow("`useParams` called outside a route render");
});

test("useRouteError mengembalikan error dari provider (default undefined)", () => {
  const plain = (markup: string): string => markup.replaceAll("<!-- -->", "");
  function ErrView() {
    return <p>err:{String(useRouteError())}</p>;
  }
  expect(plain(renderToString(<ErrView />))).toContain("err:undefined");
  expect(
    plain(
      renderToString(
        <RouteErrorProvider error={"boom"}>
          <ErrView />
        </RouteErrorProvider>,
      ),
    ),
  ).toContain("err:boom");
});

test("renderToMarkup meneruskan error ke useRouteError (halaman _error)", () => {
  const plain = (markup: string): string => markup.replaceAll("<!-- -->", "");
  const entry: ClientRouteEntry = { page: "_error", layouts: [] };
  const modules = { page: { default: ErrOnly }, layouts: [] };

  const withError = renderToMarkup(entry, modules, {}, {}, {}, { message: "gagal" });
  expect(plain(withError)).toContain("err:[object Object]");

  const withoutError = renderToMarkup(entry, modules, {}, {});
  expect(plain(withoutError)).toContain("err:undefined");
});

test("useSearchParams mengembalikan query dari provider (Addendum A.3)", () => {
  const plain = (markup: string): string => markup.replaceAll("<!-- -->", "");
  function QueryView() {
    const searchParams = useSearchParams();
    return (
      <p>
        q:{searchParams["month"]}:{searchParams["type"] ?? "-"}
      </p>
    );
  }

  const markup = renderToMarkup(
    { page: "index", layouts: [] },
    { page: { default: QueryView }, layouts: [] },
    {},
    {},
    { month: "2026-11", type: "FIX" },
  );
  expect(plain(markup)).toContain("q:2026-11:FIX");
});

test("useSearchParams di luar render route → error jelas", () => {
  function StrayQuery() {
    useSearchParams();
    return null;
  }
  expect(() => renderToString(<StrayQuery />)).toThrow("`useSearchParams` called outside a route render");
});

test("Link mendukung prop search (Addendum A.3)", () => {
  expect(
    renderToString(
      <Link to="/users/[id]" params={{ id: "u1" }} search={{ tab: "moq", page: 2 }}>
        U
      </Link>,
    ),
  ).toBe('<a href="/users/u1?tab=moq&amp;page=2">U</a>');
  expect(renderToString(<Link to="/about" search={{ ref: undefined }}>A</Link>)).toBe(
    '<a href="/about">A</a>',
  );
});

function ErrOnly() {
  return <p>err:{String(useRouteError())}</p>;
}
