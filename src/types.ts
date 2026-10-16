import type { ReactNode } from "react";

/** Di-augmentasi oleh `.moons/routes.d.ts` hasil typegen (§13). */
export interface RouteMap {}

/**
 * Params untuk key route P. Untuk aplikasi, `RouteMap` sudah berisi hasil
 * typegen sehingga tipe ini presisi; saat package dikompilasi mandiri
 * (RouteMap kosong) hasilnya fallback `Record<string, string>`.
 */
export type ParamsFor<P extends string> = P extends keyof RouteMap
  ? RouteMap[P] extends { params: infer R }
    ? R
    : Record<string, string>
  : Record<string, string>;

export interface LoaderArgs<P extends string = string> {
  params: ParamsFor<P>;
  ctx: Ctx;
  req: Request;
}

export interface RouteMeta {
  title?: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Helper typing untuk `export const meta` di file page (PRD §11.2, Addendum B.1):
 * `export const meta: RouteMetaFn<typeof loader> = ({ data }) => ({ title: data.user.name })`.
 */
export type RouteMetaFn<L extends (...args: never[]) => unknown> = (args: {
  data: Awaited<ReturnType<L>>;
}) => RouteMeta;

export type { ReactNode };
