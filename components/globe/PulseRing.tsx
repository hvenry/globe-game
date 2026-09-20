"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLOBE_LAYER, PULSE_CONFIG } from "@/lib/constants";

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
  uniform float uPeriod;
  uniform float uRings;
  varying vec2 vUv;

  // A band thin enough to read as a sweep rather than a disc.
  const float RING_WIDTH = 0.035;
  // GLSL ES needs a constant loop bound, so the loop runs to this cap and
  // breaks at uRings. Raising PULSE_CONFIG.rings past it would truncate.
  const float MAX_RINGS = 8.0;
  // Below this a fragment contributes nothing, so it is cheaper to drop it.
  const float MIN_ALPHA = 0.01;
  // Red at the faint outer edge warming to near-white where rings overlap.
  const vec3 RING_EDGE = vec3(1.0, 0.3, 0.3);
  const vec3 RING_CORE = vec3(1.0, 0.8, 0.8);
  // Additive over a lit globe: at full strength the radar blows out to white.
  const float RING_OPACITY = 0.4;

  void main() {
    // Distance from center of the circle (0 at center, 1 at edge)
    float dist = length(vUv - 0.5) * 2.0;

    float alpha = 0.0;

    for (float i = 0.0; i < MAX_RINGS; i++) {
      if (i >= uRings) break;
      // A ring is born every period and takes rings × period to reach the
      // edge, so the beat the fill and the cue share is also the ring's birth.
      float t = fract((uTime - i * uPeriod) / (uRings * uPeriod));
      if (uTime < i * uPeriod) continue;
      float ringRadius = t;

      // Ring shape: thin band around ringRadius
      float ring = 1.0 - smoothstep(0.0, RING_WIDTH, abs(dist - ringRadius));

      // Fade out as ring expands
      float fade = 1.0 - t;

      alpha += ring * fade;
    }

    alpha = clamp(alpha, 0.0, 1.0);

    // Discard fully transparent fragments
    if (alpha < MIN_ALPHA) discard;

    // Red-white gradient: brighter near center rings
    vec3 color = mix(RING_EDGE, RING_CORE, alpha);

    gl_FragColor = vec4(color, alpha * RING_OPACITY);
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
      uPeriod: { value: PULSE_CONFIG.periodSeconds },
      uRings: { value: PULSE_CONFIG.rings },
    }),
    [],
  );

  // Time runs from the first frame this ring is shown, so the first beat
  // lands the moment the target appears — the same frame the fill starts.
  const startRef = useRef<number | null>(null);
  useFrame((state) => {
    if (!matRef.current) return;
    startRef.current ??= state.clock.elapsedTime;
    matRef.current.uniforms.uTime.value =
      state.clock.elapsedTime - startRef.current;
  });

  return (
    <mesh
      renderOrder={GLOBE_LAYER.pulseRing}
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
