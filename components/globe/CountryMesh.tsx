"use client";

import { memo, useMemo } from "react";
import GeoJsonGeometry from "three-geojson-geometry";
import type { CountryFeature } from "@/lib/geo/types";
import { GLOBE_CONFIG, COLORS } from "@/lib/constants";

const noopRaycast = () => {};

function CountryMeshComponent({ feature }: { feature: CountryFeature }) {
  const borderGeometry = useMemo(() => {
    try {
      return new GeoJsonGeometry(
        feature.geometry,
        GLOBE_CONFIG.meshRadius + 0.15
      );
    } catch {
      return null;
    }
  }, [feature.geometry]);

  if (!borderGeometry) return null;

  return (
    <lineSegments geometry={borderGeometry} raycast={noopRaycast}>
      <lineBasicMaterial
        color={COLORS.countryBorder}
        transparent
        opacity={0.7}
      />
    </lineSegments>
  );
}

export default memo(CountryMeshComponent);
