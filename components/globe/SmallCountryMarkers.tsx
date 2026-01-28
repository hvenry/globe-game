"use client";

import { useMemo } from "react";
import { geoCentroid } from "d3-geo";
import type { CountryFeature } from "@/lib/geo/types";
import { GLOBE_CONFIG, COLORS, SMALL_COUNTRIES } from "@/lib/constants";
import { baseId } from "@/lib/geo/countries";
import type { Resolution } from "@/lib/store/game-store";

interface SmallCountryMarkersProps {
  features: CountryFeature[];
  resolvedCountries: Map<string, Resolution>;
  wrongGuessIds: Set<string>;
  hoveredCountryBase: string | null;
}

const noopRaycast = () => {};

// Convert [lng, lat] to 3D position on sphere
function coordsToPosition(
  lng: number,
  lat: number,
  radius: number
): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((90 - lng) * Math.PI) / 180;
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return [x, y, z];
}

function getMarkerColor(
  base: string,
  resolvedCountries: Map<string, Resolution>,
  wrongGuessIds: Set<string>,
  hoveredCountryBase: string | null
): string {
  const resolution = resolvedCountries.get(base);
  if (resolution === "perfect") return COLORS.countryPerfect;
  if (resolution === "imperfect") return COLORS.countryImperfect;
  if (resolution === "failed") return COLORS.countryFailed;
  if (wrongGuessIds.has(base)) return COLORS.countryWrongGuess;
  if (hoveredCountryBase === base) return COLORS.countryHover;
  return COLORS.countryBorder;
}

function getMarkerOpacity(
  base: string,
  resolvedCountries: Map<string, Resolution>,
  wrongGuessIds: Set<string>,
  hoveredCountryBase: string | null
): number {
  const resolution = resolvedCountries.get(base);
  if (resolution) return 0.85;
  if (wrongGuessIds.has(base)) return 0.6;
  if (hoveredCountryBase === base) return 0.5;
  return 0.85;
}

export default function SmallCountryMarkers({
  features,
  resolvedCountries,
  wrongGuessIds,
  hoveredCountryBase,
}: SmallCountryMarkersProps) {
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
        const color = getMarkerColor(
          marker.base,
          resolvedCountries,
          wrongGuessIds,
          hoveredCountryBase
        );
        const opacity = getMarkerOpacity(
          marker.base,
          resolvedCountries,
          wrongGuessIds,
          hoveredCountryBase
        );

        return (
          <mesh
            key={marker.id}
            position={marker.position}
            raycast={noopRaycast}
          >
            <sphereGeometry args={[GLOBE_CONFIG.smallCountryMarkerRadius, 16, 16]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={opacity}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </>
  );
}
