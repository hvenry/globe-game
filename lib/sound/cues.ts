/**
 * The sound vocabulary: every cue the game can play, by name.
 *
 * Components and the director speak in cue names; only this table knows
 * files. `file` is the shipped default, read from `config.json` (the map the
 * /sound lab copies out); `candidates` are the alternatives the lab offers
 * when the full library has been built. Paths are relative to /audio/.
 */

import config from "./config.json";

/** Mixer buses: one gain node each, so a group can be balanced on its own. */
export const SOUND_GROUPS = ["ui", "game"] as const;
export type SoundGroup = (typeof SOUND_GROUPS)[number];

export interface CueDef {
  file: string;
  group: SoundGroup;
  /** What the cue marks, for the lab and for anyone adding a trigger. */
  description: string;
  /** Linear gain applied to this cue, on top of the group and master. */
  gain?: number;
  /** Ignore triggers that arrive sooner than this after the last play. */
  minIntervalMs?: number;
  /** Playback-rate range for a little variation, or a pitch ladder. */
  rate?: [number, number];
  candidates?: string[];
}

/** The picked file per cue — the artifact the /sound lab copies out. */
const picked = config as Record<string, string>;

const ui = (n: string) => `interface-sounds/${n}.mp3`;
const fx = (n: string) => `sc-fi-sounds/${n}.mp3`;
const el = (n: string) => `electro-sounds/${n}.mp3`;

export const SOUND_CUES = {
  // ─── Interface ───
  "ui.click": {
    file: picked["ui.click"],
    group: "ui",
    description: "Any button press that has no more specific cue.",
    minIntervalMs: 40,
    candidates: [
      ui("click_001"),
      ui("click_002"),
      ui("click_003"),
      ui("click_004"),
      ui("click_005"),
      ui("select_001"),
      ui("select_003"),
      ui("tick_001"),
    ],
  },
  "ui.toggle.on": {
    file: picked["ui.toggle.on"],
    group: "ui",
    description:
      "A switch or option turning on (settings toggles, continent tiles, ready).",
    minIntervalMs: 40,
    candidates: [
      ui("toggle_001"),
      ui("toggle_002"),
      ui("toggle_003"),
      ui("toggle_004"),
      ui("switch_001"),
      ui("switch_002"),
      ui("switch_004"),
      ui("select_002"),
    ],
  },
  "ui.toggle.off": {
    file: picked["ui.toggle.off"],
    group: "ui",
    description:
      "The same control turning off. Usually the on cue's lower or shorter sibling.",
    minIntervalMs: 40,
    candidates: [
      ui("toggle_003"),
      ui("toggle_004"),
      ui("toggle_002"),
      ui("switch_003"),
      ui("switch_005"),
      ui("switch_007"),
      ui("minimize_003"),
      ui("select_002"),
    ],
  },
  "ui.open": {
    file: picked["ui.open"],
    group: "ui",
    description:
      "A panel opening over the live game: pause menu, race menu, in-race controls.",
    candidates: [
      ui("open_001"),
      ui("open_002"),
      ui("open_003"),
      ui("open_004"),
      ui("maximize_001"),
      ui("maximize_006"),
      fx("doorOpen_000"),
    ],
  },
  "ui.error": {
    file: picked["ui.error"],
    group: "ui",
    description: "A refused action: room full, bad code, not the host.",
    candidates: [
      ui("error_001"),
      ui("error_002"),
      ui("error_003"),
      ui("error_004"),
      ui("error_005"),
      ui("error_006"),
      ui("error_007"),
      ui("error_008"),
    ],
  },

  // ─── Solo ───
  "solo.correct": {
    file: picked["solo.correct"],
    group: "game",
    description: "You clicked the right country.",
    candidates: [
      ui("confirmation_001"),
      ui("confirmation_002"),
      ui("confirmation_003"),
      ui("confirmation_004"),
      ui("glass_001"),
      ui("glass_004"),
      ui("pluck_001"),
      ui("bong_001"),
    ],
  },
  "solo.wrong": {
    file: picked["solo.wrong"],
    group: "game",
    description: "A wrong click that costs a try.",
    candidates: [
      ui("error_001"),
      ui("error_002"),
      ui("error_003"),
      ui("error_005"),
      ui("error_008"),
      ui("glitch_001"),
      ui("scratch_001"),
      ui("drop_003"),
    ],
  },
  "solo.skip": {
    file: picked["solo.skip"],
    group: "game",
    description: "Skipping forward or back to another country.",
    minIntervalMs: 80,
    candidates: [
      ui("scroll_001"),
      ui("scroll_002"),
      ui("scroll_003"),
      ui("scroll_004"),
      ui("scroll_005"),
      ui("click_003"),
    ],
  },
  "solo.mustclick": {
    file: picked["solo.mustclick"],
    group: "game",
    description:
      "Out of tries or time: the country pulses and must be clicked.",
    candidates: [
      ui("question_001"),
      ui("question_002"),
      ui("question_003"),
      ui("question_004"),
      fx("forceField_000"),
      fx("forceField_003"),
      fx("computerNoise_000"),
    ],
  },
  "timer.tick": {
    file: picked["timer.tick"],
    group: "game",
    description:
      "The countdown running low: once a second, twice a second when critical.",
    gain: 0.6,
    minIntervalMs: 200,
    candidates: [
      ui("tick_001"),
      ui("tick_002"),
      ui("tick_004"),
      ui("click_005"),
      ui("select_008"),
    ],
  },
  "solo.gameover": {
    file: picked["solo.gameover"],
    group: "game",
    description: "A run ends (any result).",
    candidates: [
      el("electro-close-sound"),
      el("electro-open-sound"),
      el("electro-loose-sound"),
      ui("minimize_009"),
      fx("doorClose_002"),
    ],
  },
  "solo.perfect": {
    file: picked["solo.perfect"],
    group: "game",
    description: "A perfect run. Plays instead of the game-over cue.",
    candidates: [
      el("electro-success-sound"),
      el("electro-win-sound"),
      ui("confirmation_004"),
      ui("bong_001"),
    ],
  },

  // ─── Race ───
  "race.countdown": {
    file: picked["race.countdown"],
    group: "game",
    description: "Each second of the 3-2-1 before the first country.",
    candidates: [
      ui("tick_002"),
      ui("tick_001"),
      ui("tick_004"),
      ui("click_004"),
      ui("select_006"),
    ],
  },
  "race.go": {
    file: picked["race.go"],
    group: "game",
    description: "The race starts.",
    candidates: [
      ui("bong_001"),
      ui("confirmation_003"),
      fx("laserSmall_000"),
      fx("laserRetro_002"),
      el("electro-open-sound"),
    ],
  },
  "race.claim.self": {
    file: picked["race.claim.self"],
    group: "game",
    description: "You claimed the country.",
    candidates: [
      ui("confirmation_001"),
      ui("confirmation_002"),
      ui("confirmation_003"),
      ui("glass_002"),
      ui("pluck_002"),
      fx("laserSmall_002"),
      fx("laserRetro_000"),
    ],
  },
  "race.claim.other": {
    file: picked["race.claim.other"],
    group: "game",
    description: "Someone else claimed it. Quieter than your own.",
    gain: 0.6,
    candidates: [
      ui("drop_001"),
      ui("drop_002"),
      ui("drop_004"),
      ui("glass_005"),
      ui("click_002"),
      fx("impactMetal_000"),
    ],
  },
  "race.miss": {
    file: picked["race.miss"],
    group: "game",
    description: "A wrong click and the lockout that follows.",
    candidates: [
      ui("error_002"),
      ui("error_006"),
      ui("error_007"),
      ui("glitch_001"),
      ui("glitch_003"),
      ui("scratch_003"),
      fx("impactMetal_003"),
    ],
  },
  "race.unlock": {
    file: picked["race.unlock"],
    group: "game",
    description: "Your lockout ended; you can click again.",
    gain: 0.7,
    candidates: [
      ui("switch_001"),
      ui("switch_003"),
      ui("switch_005"),
      ui("switch_007"),
      ui("toggle_003"),
      ui("click_001"),
    ],
  },
  "race.reveal": {
    file: picked["race.reveal"],
    group: "game",
    description: "Nobody got it: the country lights up and waits.",
    candidates: [
      ui("question_002"),
      ui("question_001"),
      ui("question_004"),
      fx("forceField_001"),
      fx("forceField_004"),
      fx("computerNoise_002"),
    ],
  },
  "race.recovery": {
    file: picked["race.recovery"],
    group: "game",
    description:
      "You picked up a revealed country for the bonus. Others hear the opponent-claim cue.",
    candidates: [
      ui("pluck_001"),
      ui("pluck_002"),
      ui("glass_003"),
      ui("glass_006"),
      ui("confirmation_004"),
    ],
  },
  "race.combo": {
    file: picked["race.combo"],
    group: "game",
    description:
      "A streak of two or more: a major-scale step per link, one octave over eight, then a double ding at the top. Plays just after the claim.",
    gain: 1.4,
    rate: [1, 2],
    candidates: [
      ui("select_001"),
      ui("select_004"),
      ui("select_005"),
      ui("glass_001"),
      ui("pluck_002"),
      fx("laserSmall_004"),
    ],
  },
  "race.swap": {
    file: picked["race.swap"],
    group: "game",
    description: "The standings changed order.",
    gain: 0.7,
    candidates: [
      ui("maximize_001"),
      ui("maximize_003"),
      ui("maximize_008"),
      ui("minimize_004"),
      ui("scroll_002"),
      ui("switch_006"),
    ],
  },
  "race.roller": {
    file: picked["race.roller"],
    group: "game",
    description: "The score ticking up, a few rapid ticks per gain.",
    gain: 0.4,
    minIntervalMs: 50,
    rate: [0.95, 1.1],
    candidates: [
      ui("tick_004"),
      ui("tick_001"),
      ui("tick_002"),
      ui("click_005"),
      ui("select_007"),
    ],
  },
  "lobby.join": {
    file: picked["lobby.join"],
    group: "ui",
    description: "A player joined the room.",
    candidates: [
      ui("open_002"),
      ui("open_003"),
      ui("maximize_002"),
      ui("confirmation_002"),
      ui("glass_001"),
    ],
  },
  "lobby.leave": {
    file: picked["lobby.leave"],
    group: "ui",
    description: "A player left, or was removed.",
    candidates: [
      ui("close_002"),
      ui("close_003"),
      ui("minimize_002"),
      ui("drop_002"),
      ui("back_003"),
    ],
  },
  "lobby.ready": {
    file: picked["lobby.ready"],
    group: "ui",
    description:
      "Another player toggled ready. Your own button uses the toggle cues.",
    candidates: [
      ui("toggle_002"),
      ui("toggle_004"),
      ui("switch_002"),
      ui("select_002"),
      ui("click_004"),
    ],
  },
  "race.win": {
    file: picked["race.win"],
    group: "game",
    description: "You won the race.",
    candidates: [
      el("electro-win-sound"),
      el("electro-success-sound"),
      ui("confirmation_004"),
      fx("laserLarge_000"),
    ],
  },
  "race.lose": {
    file: picked["race.lose"],
    group: "game",
    description: "Someone else won.",
    candidates: [
      el("electro-loose-sound"),
      el("electro-close-sound"),
      ui("minimize_009"),
      fx("lowFrequency_explosion_000"),
    ],
  },
  "race.draw": {
    file: picked["race.draw"],
    group: "game",
    description: "A draw.",
    candidates: [
      el("electro-open-sound"),
      el("electro-close-sound"),
      ui("question_003"),
    ],
  },
  "room.closed": {
    file: picked["room.closed"],
    group: "ui",
    description: "Kicked, room gone, or the server unreachable.",
    candidates: [
      ui("glitch_002"),
      ui("glitch_004"),
      ui("error_003"),
      ui("scratch_005"),
      fx("computerNoise_003"),
    ],
  },
} as const satisfies Record<string, CueDef>;

export type CueName = keyof typeof SOUND_CUES;

export const CUE_NAMES = Object.keys(SOUND_CUES) as CueName[];

/**
 * The table with every entry widened to `CueDef`. `satisfies` keeps each
 * cue's literal shape, which drops the optional fields from the union; this
 * is the view for code that reads gain, rate or interval generically.
 */
export const CUES: Record<CueName, CueDef> = SOUND_CUES;

export function isCueName(value: string): value is CueName {
  return Object.hasOwn(SOUND_CUES, value);
}
