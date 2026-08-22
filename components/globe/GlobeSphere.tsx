"use client";

import { GLOBE_CONFIG } from "@/lib/constants";
import { useSceneColors } from "@/lib/hooks/useSceneColors";

const noopRaycast = () => {};

export default function GlobeSphere() {
  const COLORS = useSceneColors();

  return (
    <mesh raycast={noopRaycast}>
      <sphereGeometry
        args={[GLOBE_CONFIG.radius, GLOBE_CONFIG.segments, GLOBE_CONFIG.segments]}
      />
      {COLORS.unlit ? (
        <meshBasicMaterial color={COLORS.globeBase} transparent={false} />
      ) : (
        <meshPhongMaterial
          color={COLORS.globeBase}
          shininess={5}
          transparent={false}
        />
      )}
    </mesh>
  );
}
