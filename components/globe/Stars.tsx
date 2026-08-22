"use client";

import { useMemo, useState } from "react";
import * as THREE from "three";
import { useSceneColors } from "@/lib/hooks/useSceneColors";

const STAR_COUNT = 800;
const STAR_RADIUS = 600; // Distance from center
const STAR_SIZE = 1.2;

// Generate star positions once at module level to avoid impure calls during render
function generateStarData() {
  const positions = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);

  for (let i = 0; i < STAR_COUNT; i++) {
    // Random point on a sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = STAR_RADIUS + (Math.random() - 0.5) * 100;

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    // Slight size variation
    sizes[i] = STAR_SIZE * (0.5 + Math.random() * 0.8);
  }

  return { positions, sizes };
}

export default function Stars() {
  const COLORS = useSceneColors();

  // Use lazy initialization to generate star data only once
  const [starData] = useState(generateStarData);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(starData.positions, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(starData.sizes, 1));
    return geo;
  }, [starData]);

  // Light mode has no sky to put stars in
  if (COLORS.starOpacity === 0) return null;

  return (
    <points geometry={geometry}>
      <pointsMaterial
        color={COLORS.star}
        size={STAR_SIZE}
        transparent
        opacity={COLORS.starOpacity}
        sizeAttenuation={false}
        depthWrite={false}
      />
    </points>
  );
}
