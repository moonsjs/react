import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import {
  getNavigationState,
  setNavigationPending,
  subscribeNavigation,
  useNavigation,
} from "../src/navigation-store";

test("store navigasi: transisi pending + notifikasi listener", () => {
  expect(getNavigationState()).toEqual({ pending: false, url: null });

  let notified = 0;
  const unsubscribe = subscribeNavigation(() => {
    notified += 1;
  });

  setNavigationPending(true, "/slow");
  expect(getNavigationState()).toEqual({ pending: true, url: "/slow" });
  expect(notified).toBe(1);

  // nilai sama → tidak ada notifikasi
  setNavigationPending(true, "/slow");
  expect(notified).toBe(1);

  setNavigationPending(false, null);
  expect(notified).toBe(2);
  unsubscribe();
  setNavigationPending(true, "/x");
  expect(notified).toBe(2);
  setNavigationPending(false, null);
});

test("useNavigation: SSR snapshot deterministik (pending=false)", () => {
  function Probe() {
    const navigation = useNavigation();
    return createElement("span", null, `pending:${String(navigation.pending)}`);
  }
  expect(renderToString(createElement(Probe))).toContain("pending:false");
});
