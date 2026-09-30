"use client";

import { useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { geoEquirectangular, geoPath, type GeoPath } from "d3-geo";
import type { CountryFeature } from "@/lib/geo/types";
import type { Resolution } from "@/lib/engine/types";
import type { CountryFill, ScenePalette } from "@/lib/constants";
import { useSceneColors } from "@/lib/hooks/useSceneColors";
import { baseId } from "@/lib/geo/countries";

/**
 * Fill texture density. The canvas wraps the whole planet, so per-country
 * resolution is what matters: at 4096×2048 a mid-sized country gets a few
 * hundred texels across, which stays crisp at the closest zoom levels.
 */
const TEX_W = 4096;
const TEX_H = 2048;

type StaticVisualState = Resolution | "wrongGuess";

function getFillColor(state: StaticVisualState, COLORS: ScenePalette): string {
  switch (state) {
    case "wrongGuess":
      return COLORS.countryWrongGuess;
    case "perfect":
      return COLORS.countryPerfect;
    case "almost":
      return COLORS.countryAlmost;
    case "failed":
      return COLORS.countryFailed;
  }
}

/** A named state resolves against the palette; an explicit fill is its own. */
function resolveFill(
  state: StaticVisualState | CountryFill,
  COLORS: ScenePalette,
): CountryFill {
  return typeof state === "string"
    ? { color: getFillColor(state, COLORS), opacity: COLORS.fillOpacity[state] }
    : state;
}

interface Layer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  texture: THREE.CanvasTexture;
  path: GeoPath;
}

function createLayer(mipmaps: boolean): Layer {
  const canvas = document.createElement("canvas");
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const texture = new THREE.CanvasTexture(canvas);
  // Mipmaps keep fills clean when the globe is small on screen; layers that
  // never matter at far zoom (hover, pulse) skip the regeneration cost.
  texture.generateMipmaps = mipmaps;
  texture.minFilter = mipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const ctx = canvas.getContext("2d");
  const projection = geoEquirectangular()
    .rotate([-90, 0, 0])
    .translate([TEX_W / 2, TEX_H / 2])
    .scale(TEX_W / (2 * Math.PI));
  return { canvas, ctx, texture, path: geoPath(projection, ctx ?? undefined) };
}

/**
 * Dot stipple tile. Sized in texels of the 4096-wide map, so a mid-sized
 * country shows a clear grid of dots rather than a blur or a single blob.
 */
const DOT_TILE = 6;
const DOT_RADIUS = 1.1;
const dotPatterns = new Map<string, CanvasPattern>();

function dotPattern(ctx: CanvasRenderingContext2D, color: string): CanvasPattern | null {
  const cached = dotPatterns.get(color);
  if (cached) return cached;
  const tile = document.createElement("canvas");
  tile.width = DOT_TILE;
  tile.height = DOT_TILE;
  const tctx = tile.getContext("2d");
  if (!tctx) return null;
  tctx.fillStyle = color;
  tctx.beginPath();
  tctx.arc(DOT_TILE / 2, DOT_TILE / 2, DOT_RADIUS, 0, Math.PI * 2);
  tctx.fill();
  const pattern = ctx.createPattern(tile, "repeat");
  if (pattern) dotPatterns.set(color, pattern);
  return pattern;
}

function paintFeature(
  layer: Layer,
  feature: CountryFeature,
  fill: string,
  alpha: number,
  pattern?: CountryFill["pattern"],
) {
  const ctx = layer.ctx;
  if (!ctx) return;
  ctx.fillStyle = (pattern === "dots" && dotPattern(ctx, fill)) || fill;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  layer.path(feature as unknown as GeoJSON.Feature);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function clearLayer(layer: Layer) {
  layer.ctx?.clearRect(0, 0, TEX_W, TEX_H);
}

function paintCountry(layer: Layer, features: CountryFeature[], fill: CountryFill) {
  for (const feature of features) {
    paintFeature(layer, feature, fill.color, fill.opacity, fill.pattern);
  }
}

/** Axis-aligned canvas rectangle: [x0, y0, x1, y1]. */
type Rect = [number, number, number, number];

/** Texels added around a country's bounds so its anti-aliased edge is inside. */
const RECT_PAD = 2;

/**
 * Past this many changed countries a full repaint is cheaper than redrawing
 * each one's neighbourhood (a theme switch changes every fill at once).
 */
const MAX_REGION_REPAINTS = 12;

function featureRect(layer: Layer, features: CountryFeature[]): Rect {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const feature of features) {
    const [[fx0, fy0], [fx1, fy1]] = layer.path.bounds(feature as unknown as GeoJSON.Feature);
    x0 = Math.min(x0, fx0);
    y0 = Math.min(y0, fy0);
    x1 = Math.max(x1, fx1);
    y1 = Math.max(y1, fy1);
  }
  if (!isFinite(x0)) return [0, 0, 0, 0];
  return [
    Math.max(0, Math.floor(x0) - RECT_PAD),
    Math.max(0, Math.floor(y0) - RECT_PAD),
    Math.min(TEX_W, Math.ceil(x1) + RECT_PAD),
    Math.min(TEX_H, Math.ceil(y1) + RECT_PAD),
  ];
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
}

const sameFill = (a: CountryFill, b: CountryFill) =>
  a.color === b.color && a.opacity === b.opacity && a.pattern === b.pattern;

/** Countries whose fill was added, removed or changed between two paints. */
function changedFills(
  prev: Map<string, CountryFill>,
  next: Map<string, CountryFill>,
): string[] {
  const dirty: string[] = [];
  for (const [id, fill] of next) {
    const before = prev.get(id);
    if (!before || !sameFill(before, fill)) dirty.push(id);
  }
  for (const id of prev.keys()) {
    if (!next.has(id)) dirty.push(id);
  }
  return dirty;
}

/**
 * Clear `rect` and redraw every fill that reaches into it, clipped to it, in
 * full-repaint order. The pixels inside come out as a full repaint would draw
 * them, neighbours' shared edges included; nothing outside is touched.
 */
function repaintRegion(
  layer: Layer,
  rect: Rect,
  fills: Map<string, CountryFill>,
  featuresByBase: Map<string, CountryFeature[]>,
  boundsByBase: Map<string, Rect>,
) {
  const ctx = layer.ctx;
  if (!ctx) return;
  const [x0, y0, x1, y1] = rect;
  if (x1 <= x0 || y1 <= y0) return;
  ctx.clearRect(x0, y0, x1 - x0, y1 - y0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.clip();
  for (const [countryBase, fill] of fills) {
    const bounds = boundsByBase.get(countryBase);
    if (!bounds || !rectsOverlap(rect, bounds)) continue;
    paintCountry(layer, featuresByBase.get(countryBase) ?? [], fill);
  }
  ctx.restore();
}

/** Flag the layer's texture for re-upload after painting. */
function commitLayer(layer: Layer) {
  layer.texture.needsUpdate = true;
}

function disposeLayer(layer: Layer) {
  layer.texture.dispose();
}

interface CountryTexturesParams {
  features: CountryFeature[];
  resolvedCountries: Record<string, Resolution | CountryFill>;
  wrongGuessIds: string[];
  hoveredCountryBase: string | null;
  /** Base id of the country flashing during mustclick, or null. */
  pulseBase: string | null;
  /** Active-set ids in continent modes, or null for the whole globe. */
  emphasisIds: Set<string> | null;
  /** Called once, after the first paint of the base layer. */
  onFirstDraw?: () => void;
}

/**
 * Four fill layers — land, resolved/wrong-guess, hover, mustclick pulse — each
 * repainted only when its own state changes. Nothing paints per frame; the
 * pulse flash is a material tint (PulseFillLayer), not a repaint.
 */
export function useCountryTextures({
  features,
  resolvedCountries,
  wrongGuessIds,
  hoveredCountryBase,
  pulseBase,
  emphasisIds,
  onFirstDraw,
}: CountryTexturesParams) {
  const gl = useThree((state) => state.gl);
  const COLORS = useSceneColors();

  const land = useMemo(() => createLayer(true), []);
  const base = useMemo(() => createLayer(true), []);
  const hover = useMemo(() => createLayer(false), []);
  const pulse = useMemo(() => createLayer(false), []);

  // Sharpen fills viewed at glancing angles (globe edges)
  useEffect(() => {
    const anisotropy = gl.capabilities.getMaxAnisotropy();
    for (const layer of [land, base, hover, pulse]) {
      layer.texture.anisotropy = anisotropy;
    }
  }, [gl, land, base, hover, pulse]);

  useEffect(() => {
    return () => {
      disposeLayer(land);
      disposeLayer(base);
      disposeLayer(hover);
      disposeLayer(pulse);
    };
  }, [land, base, hover, pulse]);

  const featuresByBase = useMemo(() => {
    const map = new Map<string, CountryFeature[]>();
    for (const feature of features) {
      // Point features (e.g. Tuvalu) render as 3D markers, not fills
      if (feature.geometry.type === "Point") continue;
      const key = baseId(feature.id);
      const list = map.get(key);
      if (list) list.push(feature);
      else map.set(key, [feature]);
    }
    return map;
  }, [features]);

  // In continent modes only the active set is painted, so the ocean shows
  // through elsewhere and the playfield becomes the only land on the globe.
  useEffect(() => {
    clearLayer(land);
    if (COLORS.land) {
      for (const [countryBase, countryFeatures] of featuresByBase) {
        if (emphasisIds && !emphasisIds.has(countryBase)) continue;
        for (const feature of countryFeatures) {
          paintFeature(land, feature, COLORS.land, 1);
        }
      }
    }
    commitLayer(land);
  }, [land, featuresByBase, COLORS.land, emphasisIds]);

  // Canvas-space bounds per country, traced once per feature set.
  const boundsByBase = useMemo(() => {
    const bounds = new Map<string, Rect>();
    for (const [countryBase, countryFeatures] of featuresByBase) {
      bounds.set(countryBase, featureRect(base, countryFeatures));
    }
    return bounds;
  }, [base, featuresByBase]);

  // Base layer: resolved + wrong-guess fills. Repainted in place: only the
  // countries whose fill changed are redrawn, so a claim costs the same on
  // the first country as on the hundredth.
  const painted = useRef<{
    fills: Map<string, CountryFill>;
    featuresByBase: Map<string, CountryFeature[]>;
  } | null>(null);
  const firstDrawSignaled = useRef(false);
  useEffect(() => {
    // Built in `featuresByBase` order, which is the paint order a full
    // repaint uses — a redrawn region stacks exactly as it would from scratch.
    const fills = new Map<string, CountryFill>();
    for (const countryBase of featuresByBase.keys()) {
      // The pulsing country is painted by the pulse layer
      if (countryBase === pulseBase) continue;
      const state: StaticVisualState | CountryFill | null =
        resolvedCountries[countryBase] ??
        (wrongGuessIds.includes(countryBase) ? "wrongGuess" : null);
      if (state) fills.set(countryBase, resolveFill(state, COLORS));
    }

    const prev =
      painted.current?.featuresByBase === featuresByBase
        ? painted.current.fills
        : null;
    const dirty = prev ? changedFills(prev, fills) : null;
    painted.current = { fills, featuresByBase };

    if (dirty === null || dirty.length > MAX_REGION_REPAINTS) {
      clearLayer(base);
      for (const [countryBase, fill] of fills) {
        paintCountry(base, featuresByBase.get(countryBase) ?? [], fill);
      }
      commitLayer(base);
    } else if (dirty.length > 0) {
      for (const countryBase of dirty) {
        const rect = boundsByBase.get(countryBase);
        if (rect) repaintRegion(base, rect, fills, featuresByBase, boundsByBase);
      }
      commitLayer(base);
    }

    if (!firstDrawSignaled.current && onFirstDraw) {
      firstDrawSignaled.current = true;
      onFirstDraw();
    }
  }, [base, featuresByBase, boundsByBase, resolvedCountries, wrongGuessIds, pulseBase, onFirstDraw, COLORS]);

  // Hover layer: the hovered country only
  useEffect(() => {
    clearLayer(hover);
    if (hoveredCountryBase && hoveredCountryBase !== pulseBase) {
      for (const feature of featuresByBase.get(hoveredCountryBase) ?? []) {
        paintFeature(hover, feature, COLORS.countryHover, COLORS.hoverOpacity);
      }
    }
    commitLayer(hover);
  }, [hover, featuresByBase, hoveredCountryBase, pulseBase, COLORS]);

  // Pulse layer: the mustclick country in solid white; flashing happens via
  // material tint, so this repaints only when the target changes
  useEffect(() => {
    clearLayer(pulse);
    if (pulseBase) {
      for (const feature of featuresByBase.get(pulseBase) ?? []) {
        paintFeature(pulse, feature, "#ffffff", 1);
      }
    }
    commitLayer(pulse);
  }, [pulse, featuresByBase, pulseBase]);

  return {
    landTexture: land.texture,
    baseTexture: base.texture,
    hoverTexture: hover.texture,
    pulseTexture: pulse.texture,
  };
}
