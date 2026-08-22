"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * False during SSR and the first client render, true afterwards.
 *
 * The persisted stores (settings, stats) rehydrate from localStorage on the
 * client, so any UI that renders their values must wait for this flag or the
 * server HTML (built from defaults) won't match the client render.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
