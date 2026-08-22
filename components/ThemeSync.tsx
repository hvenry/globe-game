"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/lib/store/settings-store";

/**
 * Mirrors the persisted theme setting onto `<html data-theme>`, which is what
 * the CSS token layer switches on.
 *
 * The inline bootstrap in app/layout.tsx sets the same attribute before first
 * paint so there is no flash; this keeps it in sync afterwards, including
 * when the store rehydrates with a value different from the bootstrap's.
 */
export default function ThemeSync() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return null;
}
