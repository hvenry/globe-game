"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { geoCentroid } from "d3-geo";
import type { CountryFeature } from "@/lib/geo/types";
import {
  GLOBE_CONFIG,
  GLOBE_LAYER,
  SMALL_COUNTRIES,
  type ScenePalette,
} from "@/lib/constants";
import { useSceneColors } from "@/lib/hooks/useSceneColors";
import { baseId } from "@/lib/geo/countries";
import { coordsToPosition } from "@/lib/geo/coords";
import type { Resolution } from "@/lib/engine/types";

interface SmallCountryMarkersProps {
  features: CountryFeature[];
  resolvedCountries: Record<string, Resolution>;
  wrongGuessIds: string[];
  hoveredCountryBase: string | null;
  /** Base id of the country pulsing during mustclick, or null. */
  pulseBase: string | null;
  /** Active-set ids in continent modes (out-of-set markers dim), or null. */
  emphasisIds: Set<string> | null;
}

const noopRaycast = () => {};

function getMarkerColor(
  base: string,
  resolvedCountries: Record<string, Resolution>,
  wrongGuessIds: string[],
  hoveredCountryBase: string | null,
  COLORS: ScenePalette
): string {
  const resolution = resolvedCountries[base];
  if (resolution === "perfect") return COLORS.countryPerfect;
  if (resolution === "almost") return COLORS.countryAlmost;
  if (resolution === "failed") return COLORS.countryFailed;
  if (wrongGuessIds.includes(base)) return COLORS.countryWrongGuess;
  if (hoveredCountryBase === base) return COLORS.countryHover;
  return COLORS.countryBorder;
}

function getMarkerOpacity(
  base: string,
  resolvedCountries: Record<string, Resolution>,
  wrongGuessIds: string[],
  hoveredCountryBase: string | null,
  isPulsing: boolean
): number {
  if (isPulsing) return 0.9;
  if (resolvedCountries[base]) return 0.85;
  if (wrongGuessIds.includes(base)) return 0.6;
  if (hoveredCountryBase === base) return 0.5;
  return 0.85;
}

interface MarkerProps {
  position: [number, number, number];
  color: string;
  opacity: number;
  isPulsing: boolean;
  /** Flash color for the mustclick pulse, from the active scene palette. */
  pulseColor: string;
  pulseAltColor: string;
}

function Marker({
  position,
  color,
  opacity,
  isPulsing,
  pulseColor,
  pulseAltColor,
}: MarkerProps) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  // Pulse imperatively so the flash never triggers React re-renders
  useFrame((state) => {
    const material = materialRef.current;
    if (!material || !isPulsing) return;
    const pulse = (Math.sin(state.clock.elapsedTime * 4) + 1) / 2;
    material.color.set(pulse > 0.5 ? pulseColor : pulseAltColor);
  });

  return (
    <mesh
      position={position}
      raycast={noopRaycast}
      renderOrder={GLOBE_LAYER.markers}
    >
      <sphereGeometry args={[GLOBE_CONFIG.smallCountryMarkerRadius, 16, 16]} />
      <meshBasicMaterial
        ref={materialRef}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function SmallCountryMarkers({
  features,
  resolvedCountries,
  wrongGuessIds,
  hoveredCountryBase,
  pulseBase,
  emphasisIds,
}: SmallCountryMarkersProps) {
  const COLORS = useSceneColors();

  const markers = useMemo(() => {
    const result: Array<{
      id: string;
      base: string;
      position: [number, number, number];
    }> = [];

    for (const feature of features) {
      const base = baseId(feature.id);
      if (!SMALL_COUNTRIES.has(base)) continue;

      try {
        const centroid = geoCentroid(feature as unknown as GeoJSON.Feature);
        if (!centroid || !isFinite(centroid[0]) || !isFinite(centroid[1]))
          continue;

        const position = coordsToPosition(
          centroid[0],
          centroid[1],
          GLOBE_CONFIG.meshRadius + 0.4
        );

        result.push({ id: feature.id, base, position });
      } catch {
        // Skip if centroid calculation fails
      }
    }

    return result;
  }, [features]);

  return (
    <>
      {markers.map((marker) => {
        const isPulsing = pulseBase === marker.base;
        const outOfSet = emphasisIds !== null && !emphasisIds.has(marker.base);
        const opacity = getMarkerOpacity(
          marker.base,
          resolvedCountries,
          wrongGuessIds,
          hoveredCountryBase,
          isPulsing
        );
        return (
          <Marker
            key={marker.id}
            position={marker.position}
            color={getMarkerColor(
              marker.base,
              resolvedCountries,
              wrongGuessIds,
              hoveredCountryBase,
              COLORS
            )}
            opacity={
              outOfSet ? opacity * COLORS.outOfSetScale : opacity
            }
            isPulsing={isPulsing}
            pulseColor={COLORS.countryFailed}
            pulseAltColor={COLORS.countryHover}
          />
        );
      })}
    </>
  );
}
