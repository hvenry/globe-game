"use client";

/**
 * The kill feed: every claim, recovery and expiry, newest at the top, each
 * entry sliding in from the right and fading after a few seconds. Entries
 * are keyed on the engine's event `seq`, so a reconnect that replays the
 * state shows only what this client has not seen.
 */

import { useEffect, useRef, useState } from "react";
import type { RaceEvent, RaceState } from "@/lib/engine/types";
import { COUNTRY_NAMES } from "@/lib/geo/country-names";
import PlayerDot from "./PlayerDot";

/** How long an entry stays. Also drives `.animate-feed-in`, via `--feed-ttl`. */
const FEED_TTL_MS = 4_500;
const FEED_MAX = 5;

const ENTRY = "animate-feed-in hud-glass px-2 py-1 text-label";

/** The bonuses a claim earned, in the order they are worth reading. */
function tagsFor(event: Extract<RaceEvent, { type: "claim" | "recovery" }>) {
  const tags: string[] = [];
  if (event.type === "recovery") tags.push("recovered");
  if (event.breakdown.speed > 0) tags.push(`fast +${event.breakdown.speed}`);
  if (event.breakdown.accuracy > 0)
    tags.push(`clean +${event.breakdown.accuracy}`);
  if (event.breakdown.combo > 0)
    tags.push(`×${event.streak} +${event.breakdown.combo}`);
  return tags;
}

export default function RaceFeed({
  race,
  playerId,
}: {
  race: RaceState;
  playerId: string | null;
}) {
  const [shown, setShown] = useState<RaceEvent[]>([]);
  // The last seq this client has put on screen. Seeded from the first state
  // seen, so joining mid-race does not replay the whole history as if it
  // just happened. Derived during render (the "adjust state on prop change"
  // pattern) rather than in an effect, so new entries never cost a second
  // render.
  const [seenSeq, setSeenSeq] = useState(race.nextSeq - 1);
  if (race.nextSeq - 1 !== seenSeq) {
    const fresh = race.events.filter((e) => e.seq > seenSeq);
    setSeenSeq(race.nextSeq - 1);
    if (fresh.length > 0) {
      setShown((prev) =>
        [...fresh.slice().reverse(), ...prev].slice(0, FEED_MAX),
      );
    }
  }

  // When each entry appeared, stamped once it is on screen (a clock read
  // belongs in an effect, not in render). The timer clears entries past
  // their stay, so a quiet spell still empties the feed.
  const shownAt = useRef(new Map<number, number>());
  useEffect(() => {
    if (shown.length === 0) return;
    const now = Date.now();
    for (const e of shown)
      if (!shownAt.current.has(e.seq)) shownAt.current.set(e.seq, now);
    const oldest = Math.min(
      ...shown.map((e) => shownAt.current.get(e.seq) ?? now),
    );
    const id = setTimeout(
      () => {
        const cutoff = Date.now() - FEED_TTL_MS;
        setShown((prev) =>
          prev.filter((e) => (shownAt.current.get(e.seq) ?? cutoff) > cutoff),
        );
      },
      Math.max(0, oldest + FEED_TTL_MS - Date.now()),
    );
    return () => clearTimeout(id);
  }, [shown]);

  if (shown.length === 0) return null;

  return (
    <ol
      className="pointer-events-none flex flex-col items-end gap-1"
      style={{ "--feed-ttl": `${FEED_TTL_MS}ms` } as React.CSSProperties}
    >
      {shown.map((event) => {
        const name = COUNTRY_NAMES[event.countryId] ?? event.countryId;
        if (event.type === "expired") {
          return (
            <li key={event.seq} className={`${ENTRY} text-faint`}>
              nobody got {name}
            </li>
          );
        }
        const player = race.players.find((p) => p.id === event.playerId);
        const who = event.playerId === playerId ? "you" : (player?.name ?? "?");
        const tags = tagsFor(event);
        return (
          <li key={event.seq} className={`${ENTRY} flex items-baseline gap-2`}>
            <PlayerDot
              color={player?.color ?? "blue"}
              className="h-1.5 w-1.5 self-center"
            />
            <span className="text-hi">
              {who} · {name}
            </span>
            {/* Points read in the signal channel, apart from the player's own
                colour, so a score is never confused with an identity. */}
            <span className="readout text-signal">+{event.points}</span>
            {tags.length > 0 && (
              <span className="text-faint">{tags.join(" · ")}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
