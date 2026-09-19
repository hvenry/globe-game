"use client";

import { useState } from "react";
import { createRoom, useRaceStore } from "@/lib/store/race-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { LOBBY_LIMITS } from "@/lib/race/types";
import { ROOM_CODE_LENGTH as CODE_LENGTH } from "@/lib/race/room-code";
import CodeInput from "./CodeInput";

/* The fill *is* the affordance: a quiet outline until the name is usable,
   then the signal channel, same as every other primary action. Both states
   are tokens, so light mode follows. */
const ACTION =
  "press shrink-0 rounded-control border px-4 text-sm font-semibold uppercase tracking-[0.14em] transition-all";
const ACTION_READY =
  "btn-signal cursor-pointer border-signal hover:brightness-110 hover:shadow-[0_0_24px_rgb(var(--signal)/0.4)]";
const ACTION_IDLE = "cursor-default border-hairline bg-transparent text-mid";

const NAME_FIELD =
  "min-w-0 flex-1 rounded-control border border-hairline bg-well px-3 py-2 text-hi outline-none placeholder:text-faint focus:border-signal";

export default function JoinView({
  initialRoom,
  onBack,
}: {
  initialRoom: string;
  onBack: () => void;
}) {
  const join = useRaceStore((s) => s.join);
  // A preference, not a claim: the room hands out another if this is taken.
  const preferredColor = useSettingsStore((s) => s.playerColor);
  const savedName = useSettingsStore((s) => s.playerName);
  const rememberName = useSettingsStore((s) => s.setPlayerName);

  const [name, setName] = useState(savedName);
  const [code, setCode] = useState(initialRoom);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * An invite link settles which room, so the only open question is who you
   * are: it lands on the name prompt rather than the full form, where the
   * neighbouring "Next" would start a second room by mistake. The same
   * prompt catches a join attempted without a name.
   */
  const [prompting, setPrompting] = useState(initialRoom.length === CODE_LENGTH);

  const cleanName = name.trim();
  const named = cleanName.length >= LOBBY_LIMITS.minNameLength;
  const codeReady = code.length === CODE_LENGTH;
  const canHost = named && !busy;

  /** Every way into a room goes through here, so the name is always kept. */
  function enter(roomId: string) {
    rememberName(cleanName);
    join(roomId, cleanName, preferredColor);
  }

  async function host() {
    setBusy(true);
    setError(null);
    try {
      const roomId = await createRoom();
      // Keep the code in the URL so the tab can be refreshed or shared as-is.
      window.history.replaceState(null, "", `/race?room=${roomId}`);
      enter(roomId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create a room.");
      setBusy(false);
    }
  }

  if (prompting) {
    return (
      <div className="panel panel-ticks panel-dialog">
        <h1 className="hud-label mb-2 text-mid">Joining room</h1>
        <p className="readout mb-6 text-3xl tracking-[0.3em] text-hi">{code}</p>

        <label className="hud-label mb-2 block text-low" htmlFor="race-name">
          Your name
        </label>
        <div className="mb-6 flex gap-2">
          <input
            id="race-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && named) enter(code);
            }}
            maxLength={LOBBY_LIMITS.maxNameLength}
            placeholder="Enter a name"
            autoFocus
            className={NAME_FIELD}
          />
          <button
            onClick={() => named && enter(code)}
            className={`${ACTION} ${named ? ACTION_READY : ACTION_IDLE}`}
          >
            Join
          </button>
        </div>

        <button onClick={() => setPrompting(false)} className="btn-quiet press">
          Use a different room
        </button>
      </div>
    );
  }

  return (
    <div className="panel panel-ticks panel-dialog">
      <h1 className="hud-label mb-6 text-mid">Live race</h1>

      <label className="hud-label mb-2 block text-low" htmlFor="race-name">
        Your name
      </label>
      {/* Stretch, not a fixed height: the button takes the input's. */}
      <div className="mb-6 flex gap-2">
        <input
          id="race-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canHost) host();
          }}
          maxLength={LOBBY_LIMITS.maxNameLength}
          placeholder="Enter a name"
          className={NAME_FIELD}
        />
        <button
          onClick={host}
          disabled={!canHost}
          className={`${ACTION} ${canHost ? ACTION_READY : ACTION_IDLE}`}
        >
          {busy ? "…" : "Next"}
        </button>
      </div>

      <div className="hud-rule mb-6" />

      <label className="hud-label mb-2 block text-low" htmlFor="race-code">
        Or join with a code
      </label>
      <CodeInput
        id="race-code"
        value={code}
        onChange={setCode}
        onSubmit={() => codeReady && (named ? enter(code) : setPrompting(true))}
      />
      {/* Live on the code alone: a missing name is answered with the prompt,
          not with a button that sits there doing nothing. */}
      <button
        onClick={() => (named ? enter(code) : setPrompting(true))}
        disabled={!codeReady}
        className="btn-ghost press mt-3 disabled:opacity-40"
      >
        Join
      </button>

      {error && <p className="mt-4 text-sm text-alert">{error}</p>}

      <button onClick={onBack} className="btn-quiet press mt-6">
        Back to menu
      </button>
    </div>
  );
}
