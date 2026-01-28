"use client";

import { useMemo } from "react";
import * as THREE from "three";

const STAR_COUNT = 800;
const STAR_RADIUS = 600; // Distance from center
const STAR_SIZE = 1.2;
const STAR_COLOR = "#ffffff";
const STAR_OPACITY = 0.6;

export default function Stars() {
  const geometry = useMemo(() => {
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

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, []);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        color={STAR_COLOR}
        size={STAR_SIZE}
        transparent
        opacity={STAR_OPACITY}
        sizeAttenuation={false}
        depthWrite={false}
      />
    </points>
  );
}
