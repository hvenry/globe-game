/**
 * Web Audio playback for the cue vocabulary in `./cues`.
 *
 * One `AudioContext`, created and resumed on the first user gesture (browsers
 * refuse audio before one), buffers fetched and decoded once, and a master
 * gain with a sub-gain per group so volume and mute are one knob. No React
 * in here: the director and the lab call `play`, nothing else needs to.
 *
 * Overrides let the /sound lab swap a cue's file at runtime and hear it in
 * the game straight away; they persist in localStorage until cleared.
 */

import { SOUND_CONFIG } from "@/lib/constants";
import {
  CUES,
  isCueName,
  SOUND_GROUPS,
  type CueName,
  type SoundGroup,
} from "./cues";

const AUDIO_ROOT = "/audio/";
const OVERRIDES_KEY = "globe-sound-overrides";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const groups: Partial<Record<SoundGroup, GainNode>> = {};
const buffers = new Map<string, Promise<AudioBuffer | null>>();
const lastPlayed = new Map<string, number>();

let enabled: boolean = SOUND_CONFIG.defaultEnabled;
let volume: number = SOUND_CONFIG.defaultVolume;
let overrides: Partial<Record<CueName, string>> = loadOverrides();

function loadOverrides(): Partial<Record<CueName, string>> {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const clean: Partial<Record<CueName, string>> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (isCueName(k) && typeof v === "string") clean[k] = v;
    }
    return clean;
  } catch {
    return {};
  }
}

/** Write the map back, dropping the key entirely once nothing is overridden. */
function saveOverrides(): void {
  try {
    if (Object.keys(overrides).length === 0)
      localStorage.removeItem(OVERRIDES_KEY);
    else localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // Storage blocked: the overrides still hold for this page.
  }
}

export function getOverrides(): Partial<Record<CueName, string>> {
  return { ...overrides };
}

export function setOverride(cue: CueName, file: string | null): void {
  if (file === null) delete overrides[cue];
  else overrides[cue] = file;
  saveOverrides();
}

export function clearOverrides(): void {
  overrides = {};
  saveOverrides();
}

/** The file a cue currently resolves to, override first. */
export function fileFor(cue: CueName): string {
  return overrides[cue] ?? CUES[cue].file;
}

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = enabled ? volume : 0;
  master.connect(ctx.destination);
  for (const g of SOUND_GROUPS) {
    const node = ctx.createGain();
    node.connect(master);
    groups[g] = node;
  }
  return ctx;
}

/**
 * Call from a user gesture. Creates the context if needed and resumes it;
 * safe to call on every click.
 */
export function unlockAudio(): void {
  const c = ensureContext();
  if (c && c.state === "suspended") void c.resume();
}

export function setEnabled(on: boolean): void {
  enabled = on;
  applyMaster();
}

export function setVolume(v: number): void {
  volume = Math.max(0, Math.min(1, v));
  applyMaster();
}

function applyMaster(): void {
  if (!master || !ctx) return;
  master.gain.setTargetAtTime(
    enabled ? volume : 0,
    ctx.currentTime,
    SOUND_CONFIG.volumeRampSeconds,
  );
}

function loadBuffer(file: string): Promise<AudioBuffer | null> {
  const cached = buffers.get(file);
  if (cached) return cached;
  const p = (async () => {
    const c = ensureContext();
    if (!c) return null;
    try {
      const res = await fetch(AUDIO_ROOT + file);
      if (!res.ok) return null;
      return await c.decodeAudioData(await res.arrayBuffer());
    } catch {
      return null;
    }
  })();
  buffers.set(file, p);
  return p;
}

/** Warm the cache for a set of files (e.g. every default cue on unlock). */
export function preload(files: readonly string[]): void {
  for (const f of files) void loadBuffer(f);
}

export interface PlayOptions {
  /** Playback rate; overrides the cue's own range. */
  rate?: number;
  /** Extra linear gain on top of the cue's. */
  gain?: number;
  /** Play this file instead of the cue's; the lab uses it to audition. */
  file?: string;
  /** Skip the cue's rate limit. */
  force?: boolean;
}

function pick(range: [number, number] | undefined): number {
  if (!range) return 1;
  return range[0] + Math.random() * (range[1] - range[0]);
}

/** Play a cue. Fire-and-forget; a file that fails to load is silently skipped. */
export function play(cue: CueName, opts: PlayOptions = {}): void {
  if (!enabled) return;
  const def = CUES[cue];
  const now = performance.now();
  if (!opts.force && def.minIntervalMs) {
    const last = lastPlayed.get(cue) ?? -Infinity;
    if (now - last < def.minIntervalMs) return;
  }
  lastPlayed.set(cue, now);
  void playFile(opts.file ?? fileFor(cue), def.group, {
    rate: opts.rate ?? pick(def.rate),
    gain: (def.gain ?? 1) * (opts.gain ?? 1),
  });
}

/** Play any library file through a group; the lab's browse-all path. */
export async function playFile(
  file: string,
  group: SoundGroup,
  opts: { rate?: number; gain?: number } = {},
): Promise<void> {
  const c = ensureContext();
  if (!c) return;
  const bus = groups[group];
  const buffer = await loadBuffer(file);
  if (!buffer || !bus) return;
  const source = c.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = opts.rate ?? 1;
  const g = c.createGain();
  g.gain.value = opts.gain ?? 1;
  source.connect(g);
  g.connect(bus);
  source.start();
}
