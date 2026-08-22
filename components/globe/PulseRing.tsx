"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLOBE_LAYER } from "@/lib/constants";

const noopRaycast = () => {};

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    // Distance from center of the circle (0 at center, 1 at edge)
    float dist = length(vUv - 0.5) * 2.0;

    // Number of concentric rings
    float numRings = 3.0;
    float speed = 0.25;
    float ringWidth = 0.035;

    float alpha = 0.0;

    for (float i = 0.0; i < 3.0; i++) {
      // Each ring expands outward over time, staggered
      float t = fract(uTime * speed - i / numRings);
      float ringRadius = t;

      // Ring shape: thin band around ringRadius
      float ring = 1.0 - smoothstep(0.0, ringWidth, abs(dist - ringRadius));

      // Fade out as ring expands
      float fade = 1.0 - t;

      alpha += ring * fade;
    }

    alpha = clamp(alpha, 0.0, 1.0);

    // Discard fully transparent fragments
    if (alpha < 0.01) discard;

    // Red-white gradient: brighter near center rings
    vec3 color = mix(vec3(1.0, 0.3, 0.3), vec3(1.0, 0.8, 0.8), alpha);

    gl_FragColor = vec4(color, alpha * 0.4);
  }
`;

interface PulseRingProps {
  position: [number, number, number];
}

export default function PulseRing({ position }: PulseRingProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  // Compute orientation quaternion so the circle faces outward from globe center
  const quaternion = useMemo(() => {
    const dir = new THREE.Vector3(...position).normalize();
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    return q;
  }, [position]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    [],
  );

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh renderOrder={GLOBE_LAYER.pulseRing}
      position={position}
      quaternion={quaternion}
      raycast={noopRaycast}
    >
      <circleGeometry args={[25, 64]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
