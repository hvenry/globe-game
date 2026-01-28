"use client";

import { GLOBE_CONFIG, COLORS } from "@/lib/constants";

const noopRaycast = () => {};

export default function GlobeSphere() {
  return (
    <mesh raycast={noopRaycast}>
      <sphereGeometry
        args={[GLOBE_CONFIG.radius, GLOBE_CONFIG.segments, GLOBE_CONFIG.segments]}
      />
      <meshPhongMaterial
        color={COLORS.globeBase}
        shininess={5}
        transparent={false}
      />
    </mesh>
  );
}
