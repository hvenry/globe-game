"use client";

/**
 * /sound — audition every cue and pick its file.
 *
 * Each cue lists its candidates as toggles; picking one plays it and stores
 * an override, so the game itself uses the pick straight away (overrides
 * live in localStorage). "Copy config" produces the cue → file map to paste
 * back into `lib/sound/cues.ts`.
 */

import { useState } from "react";
import { SOUND_CONFIG } from "@/lib/constants";
import { useCopied } from "@/lib/hooks/useCopied";
import { CUE_NAMES, CUES, type CueName } from "@/lib/sound/cues";
import { SOUND_LIBRARY } from "@/lib/sound/library";
import {
  clearOverrides,
  fileFor,
  getOverrides,
  playFile,
  setOverride,
  setVolume,
  unlockAudio,
} from "@/lib/sound/engine";
import { Slider } from "@/components/game/settings/SettingsControls";
import { PlayIcon } from "@/components/ui/icons";

/** The picked build ships one file per cue; the full library is hundreds. */
const FULL_BUILD_MIN_FILES = 100;
const PARTIAL_BUILD = SOUND_LIBRARY.length < FULL_BUILD_MIN_FILES;

/** What the picked build actually put on disk, for filtering candidates. */
const SHIPPED = new Set(SOUND_LIBRARY);

/* Candidate chips, in the selected/unselected pair the option grids and the
   lobby's ready chip already use — at chip size. */
const CHIP =
  "press rounded-control border px-2.5 py-1 text-xs transition-colors";
const CHIP_ON = "border-signal/60 bg-signal-soft text-signal";
const CHIP_OFF =
  "border-hairline bg-well text-mid hover:border-hairline-strong hover:text-hi";

function short(file: string): string {
  return file.replace(/^[^/]+\//, "").replace(/\.mp3$/, "");
}

function pack(file: string): string {
  return file.split("/")[0].replace(/-sounds$/, "");
}

/** Play a file the way its cue would: same group and gain, optional rate. */
function preview(cue: CueName, file: string, rate?: number): void {
  unlockAudio();
  void playFile(file, CUES[cue].group, { gain: CUES[cue].gain ?? 1, rate });
}

export default function SoundLab() {
  const [picks, setPicks] = useState<Partial<Record<CueName, string>>>(() =>
    getOverrides(),
  );
  const { copied, copy } = useCopied();
  const [volume, setVol] = useState<number>(SOUND_CONFIG.defaultVolume);

  function audition(cue: CueName, file: string) {
    setOverride(cue, file);
    setPicks((p) => ({ ...p, [cue]: file }));
    // The bottom of a pitch ladder, so a cue with a range is heard at rest.
    preview(cue, file, CUES[cue].rate?.[0]);
  }

  function replay(cue: CueName) {
    preview(cue, fileFor(cue));
  }

  function reset() {
    clearOverrides();
    setPicks({});
  }

  function copyConfig() {
    const config: Record<string, string> = {};
    for (const cue of CUE_NAMES) config[cue] = picks[cue] ?? CUES[cue].file;
    copy(JSON.stringify(config, null, 2));
  }

  const changed = CUE_NAMES.filter(
    (c) => picks[c] && picks[c] !== CUES[c].file,
  ).length;

  return (
    // The document itself is pinned and non-scrolling for the game's sake
    // (see html/body in globals.css), so this page scrolls inside its own box.
    <main
      className="h-dvh overflow-y-auto bg-ground px-4 py-8 text-hi md:px-8"
      style={{ overscrollBehavior: "contain", touchAction: "pan-y" }}
    >
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Sound lab
          </h1>
          <p className="mt-2 text-sm text-mid">
            Click a candidate to hear it and select it. Picks apply to the game
            immediately on this browser. When you are happy, copy the config and
            hand it over.
          </p>
          {PARTIAL_BUILD && (
            <p className="mt-2 text-sm text-caution">
              Only the picked files are built. Run{" "}
              <span className="readout">scripts/build-audio.sh --all</span> to
              audition every candidate.
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {/* The game's own slider: the lab hears what the game hears. */}
            <div className="w-48">
              <Slider
                label="Volume"
                value={volume}
                onChange={(v) => {
                  setVol(v);
                  setVolume(v);
                }}
                min={0}
                max={1}
                step={0.05}
              />
            </div>
            <span className="hud-label text-faint">
              <span className="readout">{changed}</span> changed from defaults
            </span>
          </div>
        </header>

        <ol className="space-y-6">
          {CUE_NAMES.map((cue) => {
            const def = CUES[cue];
            const current = picks[cue] ?? def.file;
            // Only files that exist on disk: the default build ships just the
            // picks, and `scripts/build-audio.sh --all` adds every candidate.
            const candidates = (def.candidates ?? [def.file]).filter((f) =>
              SHIPPED.has(f),
            );
            if (!candidates.includes(current) && SHIPPED.has(current)) {
              candidates.unshift(current);
            }
            return (
              <li key={cue} className="panel panel-ticks p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="readout text-sm text-signal">{cue}</p>
                    <p className="mt-1 text-sm text-mid">{def.description}</p>
                    <p className="hud-label mt-1 text-faint">
                      {def.group} · gain {def.gain ?? 1}
                      {def.rate && ` · rate ${def.rate[0]}–${def.rate[1]}`}
                      {def.minIntervalMs && ` · min ${def.minIntervalMs}ms`}
                    </p>
                  </div>
                  <button
                    onClick={() => replay(cue)}
                    aria-label={`Play ${cue}`}
                    className="btn-icon press shrink-0"
                    data-sound="none"
                  >
                    <PlayIcon size={13} />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {candidates.map((file) => {
                    const selected = file === current;
                    return (
                      <button
                        key={file}
                        onClick={() => audition(cue, file)}
                        aria-pressed={selected}
                        data-sound="none"
                        className={`${CHIP} ${selected ? CHIP_ON : CHIP_OFF}`}
                      >
                        <span className="readout">{short(file)}</span>
                        <span className="hud-label ml-1.5 text-faint">
                          {pack(file)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <label className="hud-label mt-3 flex items-center gap-3 text-low">
                  Any file
                  <select
                    value={current}
                    onChange={(e) => audition(cue, e.target.value)}
                    className="readout min-w-0 flex-1 rounded-control border border-hairline bg-well px-2 py-1 text-xs text-hi"
                  >
                    {SOUND_LIBRARY.map((file) => (
                      <option key={file} value={file}>
                        {file}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            );
          })}
        </ol>

        <footer className="mt-8 flex flex-col gap-3 md:flex-row">
          <button
            onClick={copyConfig}
            className="btn-primary btn-signal press"
            data-sound="none"
          >
            {copied ? "Copied" : "Copy config"}
          </button>
          <button onClick={reset} className="btn-ghost press" data-sound="none">
            Reset to defaults
          </button>
        </footer>
      </div>
    </main>
  );
}
