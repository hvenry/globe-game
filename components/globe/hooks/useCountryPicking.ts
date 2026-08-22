"use client";

import { useCallback, useMemo } from "react";
import * as THREE from "three";
import { geoBounds, geoCentroid, geoContains, geoDistance } from "d3-geo";
import type { CountryFeature } from "@/lib/geo/types";
import { GLOBE_CONFIG, SMALL_COUNTRIES } from "@/lib/constants";
import { baseId } from "@/lib/geo/countries";
import { pointToCoords } from "@/lib/geo/coords";

/** Padding (degrees) added around bounding boxes to absorb edge clicks. */
const BBOX_PAD = 0.5;

interface PolygonEntry {
  id: string;
  feature: CountryFeature;
  bounds: [[number, number], [number, number]];
}

interface SmallCountryEntry {
  id: string;
  centroid: [number, number];
}

function boundsContain(
  bounds: [[number, number], [number, number]],
  lng: number,
  lat: number,
): boolean {
  const [[minLng, minLat], [maxLng, maxLat]] = bounds;
  if (lat < minLat - BBOX_PAD || lat > maxLat + BBOX_PAD) return false;
  // Features crossing the antimeridian have minLng > maxLng
  if (minLng <= maxLng) {
    return lng >= minLng - BBOX_PAD && lng <= maxLng + BBOX_PAD;
  }
  return lng >= minLng - BBOX_PAD || lng <= maxLng + BBOX_PAD;
}

/**
 * Pointer → country lookup with a precomputed index: small-country centroids
 * (nearest within the click radius wins) and per-feature bounding boxes that
 * gate the expensive geoContains checks.
 */
export function useCountryPicking(features: CountryFeature[]) {
  const index = useMemo(() => {
    const polygons: PolygonEntry[] = [];
    const smalls: SmallCountryEntry[] = [];

    for (const feature of features) {
      const geo = feature as unknown as GeoJSON.Feature;
      if (SMALL_COUNTRIES.has(baseId(feature.id))) {
        try {
          const centroid = geoCentroid(geo);
          if (centroid && isFinite(centroid[0]) && isFinite(centroid[1])) {
            smalls.push({ id: feature.id, centroid });
          }
        } catch {
          // skip if centroid fails
        }
      }
      if (feature.geometry.type === "Point") continue;
      try {
        polygons.push({ id: feature.id, feature, bounds: geoBounds(geo) });
      } catch {
        // skip malformed geometry
      }
    }

    return { polygons, smalls };
  }, [features]);

  return useCallback(
    (point: THREE.Vector3, smallCountryRadiusScale = 1): string | null => {
      const coords = pointToCoords(point, GLOBE_CONFIG.meshRadius);

      // Small countries first: the closest centroid within the click radius
      let closestId: string | null = null;
      let closestDeg: number =
        GLOBE_CONFIG.smallCountryClickRadius * smallCountryRadiusScale;
      for (const small of index.smalls) {
        const deg = geoDistance(coords, small.centroid) * (180 / Math.PI);
        if (deg <= closestDeg) {
          closestDeg = deg;
          closestId = small.id;
        }
      }
      if (closestId) return closestId;

      for (const entry of index.polygons) {
        if (!boundsContain(entry.bounds, coords[0], coords[1])) continue;
        try {
          if (geoContains(entry.feature as unknown as GeoJSON.Feature, coords)) {
            return entry.id;
          }
        } catch {
          // skip malformed geometry
        }
      }
      return null;
    },
    [index],
  );
}
