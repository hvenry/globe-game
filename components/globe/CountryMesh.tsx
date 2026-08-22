"use client";

import { memo, useMemo } from "react";
import GeoJsonGeometry from "three-geojson-geometry";
import type { CountryFeature } from "@/lib/geo/types";
import { GLOBE_CONFIG, GLOBE_LAYER } from "@/lib/constants";
import { useSceneColors } from "@/lib/hooks/useSceneColors";

const noopRaycast = () => {};

interface CountryMeshProps {
  feature: CountryFeature;
  opacity: number;
}

function CountryMeshComponent({ feature, opacity }: CountryMeshProps) {
  const COLORS = useSceneColors();

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
    <lineSegments
      geometry={borderGeometry}
      raycast={noopRaycast}
      renderOrder={GLOBE_LAYER.borders}
    >
      <lineBasicMaterial
        color={COLORS.countryBorder}
        transparent
        opacity={opacity}
      />
    </lineSegments>
  );
}

export default memo(CountryMeshComponent);
