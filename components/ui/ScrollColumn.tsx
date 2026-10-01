"use client";

/**
 * A height-capped, scrolling body for a dialog panel: a thin progress bar
 * along the top, the content scrolling beneath with no visible scrollbar,
 * and in dark a scrim so content sinks into shadow at the bottom edge.
 *
 * The settings page and the race options view both use it, so a long list
 * of controls is the same size and feel wherever it appears.
 */

import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";
import { useSettingsStore } from "@/lib/store/settings-store";

/** The body never grows past this share of the viewport. */
const MAX_HEIGHT = "40vh";

export default function ScrollColumn({
  children,
  header,
  footer,
  accent = "signal",
  scrollRef,
  initialScrollTop,
  onScrollTop,
}: {
  children: React.ReactNode;
  /** Sits above the progress bar and does not scroll. */
  header?: React.ReactNode;
  /** Sits below the scroll area and does not scroll. */
  footer?: React.ReactNode;
  accent?: "signal" | "expert";
  /** Handed out so a caller can scroll the body to a section. */
  scrollRef?: RefObject<HTMLDivElement | null>;
  /** Where to start, for a panel that comes back after being swapped out. */
  initialScrollTop?: number;
  /** Fires with the body's scrollTop on every scroll. */
  onScrollTop?: (top: number) => void;
}) {
  const progressRef = useRef<HTMLDivElement>(null);
  const ownRef = useRef<HTMLDivElement>(null);
  const bodyRef = scrollRef ?? ownRef;
  const theme = useSettingsStore((s) => s.theme);

  // Restore once, before paint, so the return looks like nothing moved.
  useLayoutEffect(() => {
    if (initialScrollTop && bodyRef.current)
      bodyRef.current.scrollTop = initialScrollTop;
  }, [initialScrollTop, bodyRef]);

  // Written straight to the node: a re-render per scroll event lands the bar a
  // frame behind the content on top of an already-running WebGL loop.
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const scrollable = el.scrollHeight - el.clientHeight;
      const progress = scrollable > 0 ? (el.scrollTop / scrollable) * 100 : 0;
      if (progressRef.current) {
        progressRef.current.style.width = `${progress > 99 ? 100 : progress}%`;
      }
      onScrollTop?.(el.scrollTop);
    },
    [onScrollTop],
  );

  return (
    <div className="relative flex flex-col" style={{ maxHeight: MAX_HEIGHT }}>
      {header}

      {/* `shrink-0` is load-bearing: this is a flex item in a height-capped
          column, so without it flex crushed the 1px bar to a third of a pixel
          and the fill was invisible however far you scrolled. */}
      <div className="relative mt-3 h-0.5 shrink-0 overflow-hidden rounded-full bg-hairline">
        <div
          ref={progressRef}
          className={`h-full w-0 rounded-full ${accent === "expert" ? "bg-expert" : "bg-signal"}`}
        />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={bodyRef}
          className="min-h-0 flex-1 space-y-8 overflow-x-hidden overflow-y-auto px-3 pt-4 pb-14 text-left scrollbar-hide"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            touchAction: "pan-y",
            overscrollBehaviorX: "none",
          }}
          onScroll={handleScroll}
        >
          {children}
        </div>

        {/* Bottom scrim, dark only: the panel is opaque there, so a wash of
            the panel colour matches it exactly. The light panel is frosted
            glass, where any wash reads as a slab laid over the options. */}
        {theme === "dark" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-panel to-transparent" />
        )}
      </div>

      {footer}
    </div>
  );
}
