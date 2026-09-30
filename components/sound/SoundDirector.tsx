"use client";

/**
 * The one place game sound is triggered.
 *
 * Subscribes to the solo and race stores outside React's render cycle and
 * plays cues on transitions, so solo and race stay consistent and no
 * component needs to know a cue exists. Button presses come from a single
 * capture-phase click listener: every `<button>` gets `ui.click` unless it
 * carries `data-sound="<cue suffix>"` or `data-sound="none"`.
 *
 * Mounted once by GameContainer. Renders nothing.
 */

import { useEffect } from "react";
import { PULSE_CONFIG, TIMER_CONFIG } from "@/lib/constants";
import { isDraw, standings as rank } from "@/lib/engine/race";
import type { RaceView } from "@/lib/engine/types";
import { CUE_NAMES, isCueName } from "@/lib/sound/cues";
import {
  fileFor,
  play,
  preload,
  setEnabled,
  setVolume,
  unlockAudio,
} from "@/lib/sound/engine";
import { useGameStore } from "@/lib/store/game-store";
import { useRaceStore } from "@/lib/store/race-store";
import { useSettingsStore } from "@/lib/store/settings-store";

const SECOND_MS = 1_000;

/** Rapid ticks that accompany a score gain: how many, how spaced. */
const ROLLER_TICKS_MAX = 8;
/** Eight ticks at this gap run out about as the roller's digits settle. */
const ROLLER_TICK_GAP_MS = 60;
/** One tick per this much of the gain, so a bigger jump rattles longer. */
const ROLLER_POINTS_PER_TICK = 100;

/** How often the timer watcher looks at the clock. */
const TIMER_POLL_MS = 250;
/** A tick a second while the timer is low, twice a second once it is critical. */
const TIMER_TICK_MS = SECOND_MS;
const TIMER_TICK_CRITICAL_MS = SECOND_MS / 2;

/** The combo cue follows the claim by this much; past the octave it doubles up. */
const COMBO_DELAY_MS = 260;
const COMBO_DOUBLE_GAP_MS = 140;
/**
 * One major-scale degree per link past the second claim, in semitones above
 * the file's own pitch: root at ×2, up to the octave at ×9 and held there.
 */
const COMBO_SCALE_SEMITONES = [0, 2, 4, 5, 7, 9, 11, 12] as const;
/** Twelve-tone equal temperament: a semitone is the twelfth root of two. */
const SEMITONES_PER_OCTAVE = 12;

function comboRate(streak: number): number {
  const degree = Math.min(streak - 2, COMBO_SCALE_SEMITONES.length - 1);
  return 2 ** (COMBO_SCALE_SEMITONES[degree] / SEMITONES_PER_OCTAVE);
}

/** True once the streak has gone past the top of the scale. */
function comboPastOctave(streak: number): boolean {
  return streak - 2 > COMBO_SCALE_SEMITONES.length - 1;
}

/**
 * A cue on every beat of the "find it" pulse, for as long as it is up. Same
 * period as the ring and the flash; the first beat is the moment it appears.
 *
 * Returns the switch that holds it: solo and race both call it with whatever
 * their current phase says, and starting or stopping the interval is here.
 */
function pulseCue(
  cue: "solo.mustclick" | "race.reveal",
): (active: boolean) => void {
  let interval: ReturnType<typeof setInterval> | null = null;
  return function setPulsing(active) {
    if (active && interval === null) {
      play(cue, { force: true });
      interval = setInterval(
        () => play(cue, { force: true }),
        PULSE_CONFIG.periodMs,
      );
    } else if (!active && interval !== null) {
      clearInterval(interval);
      interval = null;
    }
  };
}

function useSettingsSync(): void {
  const enabled = useSettingsStore((s) => s.soundEnabled);
  const volume = useSettingsStore((s) => s.soundVolume);
  useEffect(() => {
    setEnabled(enabled);
  }, [enabled]);
  useEffect(() => {
    setVolume(volume);
  }, [volume]);
}

/** Unlock on the first gesture and warm the cache with every default cue. */
function useUnlock(): void {
  useEffect(() => {
    let warmed = false;
    const onGesture = () => {
      unlockAudio();
      if (!warmed) {
        warmed = true;
        preload(CUE_NAMES.map(fileFor));
      }
    };
    window.addEventListener("pointerdown", onGesture, { capture: true });
    window.addEventListener("keydown", onGesture, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", onGesture, { capture: true });
      window.removeEventListener("keydown", onGesture, { capture: true });
    };
  }, []);
}

/** Every button press, unless the element opts out or names its own cue. */
function useUiClicks(): void {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const button = target?.closest<HTMLElement>("button, a[href]");
      if (!button || (button as HTMLButtonElement).disabled) return;
      if (button.getAttribute("aria-disabled") === "true") return;
      const hint = button.dataset.sound;
      if (hint === "none") return;
      if (hint === "toggle") {
        // Capture phase runs before React flips the state, so the pressed
        // attribute still shows what the control is turning away from.
        const pressed =
          button.getAttribute("aria-pressed") === "true" ||
          button.getAttribute("aria-checked") === "true";
        play(pressed ? "ui.toggle.off" : "ui.toggle.on");
        return;
      }
      const cue = hint ? `ui.${hint}` : "ui.click";
      play(isCueName(cue) ? cue : "ui.click");
    };
    document.addEventListener("click", onClick, { capture: true });
    return () =>
      document.removeEventListener("click", onClick, { capture: true });
  }, []);
}

function useSoloCues(): void {
  useEffect(() => {
    let prev = useGameStore.getState();
    const pulse = pulseCue("solo.mustclick");
    const unsub = useGameStore.subscribe((s) => {
      const p = prev;
      prev = s;

      pulse(s.phase === "mustclick");

      if (s.wrongGuessIds.length > p.wrongGuessIds.length) play("solo.wrong");
      if (
        s.questionsAnswered > p.questionsAnswered &&
        (s.lastResolution === "perfect" || s.lastResolution === "almost")
      ) {
        play("solo.correct");
      }
      if (
        s.phase === "playing" &&
        p.phase === "playing" &&
        s.currentCountry?.id !== p.currentCountry?.id &&
        s.questionsAnswered === p.questionsAnswered
      ) {
        play("solo.skip");
      }
      if (s.phase === "gameover" && p.phase !== "gameover") {
        // One or the other: a perfect run gets its own sting, not both.
        const perfect =
          s.totalCountries > 0 && s.questionsCorrect >= s.totalCountries;
        play(perfect ? "solo.perfect" : "solo.gameover");
      }
    });
    return () => {
      unsub();
      pulse(false);
    };
  }, []);

  // Timer ticks: polled, since a deadline changes nothing on its own.
  useEffect(() => {
    let lastBucket = -1;
    const id = setInterval(() => {
      const s = useGameStore.getState();
      if (
        s.phase !== "playing" ||
        s.gamePausedAt !== null ||
        s.timerDeadline === null ||
        !s.countdownTimerLimit
      ) {
        return;
      }
      const remaining = Math.max(0, s.timerDeadline - Date.now());
      const fraction = remaining / (s.countdownTimerLimit * SECOND_MS);
      if (fraction >= TIMER_CONFIG.criticalThreshold) return;
      // Whole seconds, or half seconds once the bar turns red.
      const unit =
        fraction < TIMER_CONFIG.warningThreshold
          ? TIMER_TICK_CRITICAL_MS
          : TIMER_TICK_MS;
      const bucket = Math.floor(remaining / unit);
      if (bucket === lastBucket) return;
      lastBucket = bucket;
      play("timer.tick", { force: true });
    }, TIMER_POLL_MS);
    return () => clearInterval(id);
  }, []);
}

function useRaceCues(): void {
  useEffect(() => {
    let prev = useRaceStore.getState();
    const pulse = pulseCue("race.reveal");
    let timers: ReturnType<typeof setTimeout>[] = [];
    const clearTimers = () => {
      for (const t of timers) clearTimeout(t);
      timers = [];
    };
    const later = (ms: number, fn: () => void) => {
      timers.push(setTimeout(fn, Math.max(0, ms)));
    };

    const onCountdown = (race: RaceView, offset: number) => {
      clearTimers();
      if (race.phaseDeadline === null) return;
      const untilGo = race.phaseDeadline - (Date.now() + offset);
      for (let ms = SECOND_MS; ms < untilGo; ms += SECOND_MS) {
        later(untilGo - ms, () => play("race.countdown", { force: true }));
      }
      later(untilGo, () => play("race.go"));
    };

    const unsub = useRaceStore.subscribe((s) => {
      const p = prev;
      prev = s;
      const race = s.race;
      const before = p.race;

      // Lobby comings and goings.
      if (s.lobby && p.lobby && s.status === "lobby" && p.status === "lobby") {
        const now = s.lobby.players.filter((x) => x.connected).length;
        const was = p.lobby.players.filter((x) => x.connected).length;
        if (now > was) play("lobby.join");
        if (now < was) play("lobby.leave");
        // Your own ready button is a toggle and sounds like one; this cue is
        // for hearing someone else ready up.
        for (const x of s.lobby.players) {
          if (x.id === s.playerId) continue;
          const earlier = p.lobby.players.find((y) => y.id === x.id);
          if (earlier && earlier.ready !== x.ready) play("lobby.ready");
        }
      }
      // Turned away or thrown out.
      if (s.status === "idle" && p.status !== "idle" && s.error)
        play("room.closed");

      if (!race) return;

      if (race.phase === "countdown" && before?.phase !== "countdown") {
        onCountdown(race, s.clockOffset);
      }
      if (race.phase !== "countdown" && before?.phase === "countdown")
        clearTimers();

      // The reveal pulse: a cue every beat until someone finds it.
      pulse(race.phase === "reveal");

      // Outcomes, by sequence so a reconnect never replays history.
      if (before && race.nextSeq > before.nextSeq) {
        for (const e of race.events) {
          if (e.seq < before.nextSeq) continue;
          // `expired` needs no cue of its own: the reveal pulse covers it.
          if (e.type === "expired") continue;
          if (e.type === "recovery") {
            // The chime is the finder's; everyone else hears it go to someone.
            play(
              e.playerId === s.playerId ? "race.recovery" : "race.claim.other",
            );
          } else if (e.playerId === s.playerId) {
            play("race.claim.self");
            if (e.streak >= 2) {
              // After the claim has rung, a scale degree higher per extra link.
              const rate = comboRate(e.streak);
              later(COMBO_DELAY_MS, () =>
                play("race.combo", { rate, force: true }),
              );
              // Beyond the octave there is nowhere higher to go, so it dings twice.
              if (comboPastOctave(e.streak)) {
                later(COMBO_DELAY_MS + COMBO_DOUBLE_GAP_MS, () =>
                  play("race.combo", { rate, force: true }),
                );
              }
            }
          } else play("race.claim.other");
        }
      }

      const me = race.players.find((x) => x.id === s.playerId);
      const meBefore = before?.players.find((x) => x.id === p.playerId);

      // Lockout: buzz now, a small release when it lifts.
      if (
        me &&
        me.lockedUntil !== null &&
        me.lockedUntil !== meBefore?.lockedUntil
      ) {
        play("race.miss");
        later(me.lockedUntil - (Date.now() + s.clockOffset), () =>
          play("race.unlock"),
        );
      }

      // Score rolling up.
      if (me && meBefore && me.score > meBefore.score) {
        const ticks = Math.min(
          ROLLER_TICKS_MAX,
          Math.ceil((me.score - meBefore.score) / ROLLER_POINTS_PER_TICK),
        );
        for (let i = 0; i < ticks; i++) {
          later(i * ROLLER_TICK_GAP_MS, () =>
            play("race.roller", { force: true }),
          );
        }
      }

      // Standings reordering.
      if (before && race.players.length > 1) {
        const now = rank(race)
          .map((x) => x.id)
          .join();
        const was = rank(before)
          .map((x) => x.id)
          .join();
        if (now !== was) play("race.swap");
      }

      if (race.phase === "finished" && before?.phase !== "finished") {
        const ranked = rank(race);
        if (isDraw(ranked)) play("race.draw");
        else if (ranked[0].id === s.playerId) play("race.win");
        else play("race.lose");
      }
    });
    return () => {
      unsub();
      clearTimers();
      pulse(false);
    };
  }, []);
}

export default function SoundDirector() {
  useSettingsSync();
  useUnlock();
  useUiClicks();
  useSoloCues();
  useRaceCues();
  return null;
}
