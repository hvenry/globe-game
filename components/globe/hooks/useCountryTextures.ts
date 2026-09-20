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

  // Base layer: resolved + wrong-guess fills
  const firstDrawSignaled = useRef(false);
  useEffect(() => {
    clearLayer(base);

    for (const [countryBase, countryFeatures] of featuresByBase) {
      // The pulsing country is painted by the pulse layer
      if (countryBase === pulseBase) continue;
      const state: StaticVisualState | CountryFill | null =
        resolvedCountries[countryBase] ??
        (wrongGuessIds.includes(countryBase) ? "wrongGuess" : null);
      if (!state) continue;
      const { color, opacity, pattern } = resolveFill(state, COLORS);
      for (const feature of countryFeatures) {
        paintFeature(base, feature, color, opacity, pattern);
      }
    }
    commitLayer(base);

    if (!firstDrawSignaled.current && onFirstDraw) {
      firstDrawSignaled.current = true;
      onFirstDraw();
    }
  }, [base, featuresByBase, resolvedCountries, wrongGuessIds, pulseBase, onFirstDraw, COLORS]);

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
