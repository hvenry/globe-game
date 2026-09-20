"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** How long a copy button reads "Copied" before offering the copy again. */
const COPIED_MS = 2_000;

/**
 * The "Copied" flash every copy button in the app shares: write the text,
 * then hold `copied` true for a couple of seconds.
 *
 * The timeout is cleared on unmount, so a panel closed mid-flash (results,
 * lobby) never wakes up to set state on a component that is gone.
 */
export function useCopied(): {
  copied: boolean;
  copy: (text: string) => void;
} {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const copy = useCallback((text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setCopied(true);
      timeoutRef.current = setTimeout(() => setCopied(false), COPIED_MS);
    });
  }, []);

  return { copied, copy };
}
