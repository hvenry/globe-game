"use client";

import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import {
  geoContains,
  geoPath,
  geoEquirectangular,
  geoCentroid,
  geoDistance,
} from "d3-geo";
import GlobeSphere from "./GlobeSphere";
import CountryMesh from "./CountryMesh";
import SmallCountryMarkers from "./SmallCountryMarkers";
import type { CountryFeature } from "@/lib/geo/types";
import { GLOBE_CONFIG, COLORS, SMALL_COUNTRIES } from "@/lib/constants";
import { baseId } from "@/lib/geo/countries";
import type { Resolution, FloatingLabel } from "@/lib/store/game-store";
import { useGameStore } from "@/lib/store/game-store";

// ── Types ────────────────────────────────────────────────────────────────────

type CountryVisualState =
  | "default"
  | "hover"
  | "wrongGuess"
  | "perfect"
  | "imperfect"
  | "failed";

interface GlobeProps {
  features: CountryFeature[];
  wrongGuessIds: Set<string>;
  resolvedCountries: Map<string, Resolution>;
  interactive: boolean;
  autoRotate: boolean;
  onCountryClick?: (
    countryId: string,
    position: [number, number, number],
  ) => void;
}

// ── Fill colour helpers ──────────────────────────────────────────────────────

function getFillColor(state: CountryVisualState): string {
  switch (state) {
    case "hover":
      return COLORS.countryHover;
    case "wrongGuess":
      return COLORS.countryWrongGuess;
    case "perfect":
      return COLORS.countryPerfect;
    case "imperfect":
      return COLORS.countryImperfect;
    case "failed":
      return COLORS.countryFailed;
    default:
      return COLORS.countryDefault;
  }
}

function getFillOpacity(state: CountryVisualState): number {
  switch (state) {
    case "hover":
      return 0.22;
    case "wrongGuess":
      return 0.5;
    case "perfect":
      return 0.65;
    case "imperfect":
      return 0.6;
    case "failed":
      return 0.6;
    default:
      return 0;
  }
}

// ── Coordinate conversion ────────────────────────────────────────────────────

const noopRaycast = () => {};

/**
 * Convert a Three.js intersection point on the sphere to [lng, lat].
 * Matches the coordinate convention used by three-geojson-geometry.
 */
function pointToCoords(point: THREE.Vector3, radius: number): [number, number] {
  const phi = Math.acos(Math.max(-1, Math.min(1, point.y / radius)));
  const theta = Math.atan2(point.z, point.x);
  const lat = 90 - phi * (180 / Math.PI);
  let lng = 90 - theta * (180 / Math.PI);
  if (lng > 180) lng -= 360;
  if (lng < -180) lng += 360;
  return [lng, lat];
}

// ── Canvas texture constants ─────────────────────────────────────────────────

const TEX_W = 2048;
const TEX_H = 1024;

// ── Atmosphere ───────────────────────────────────────────────────────────────

function Atmosphere() {
  return (
    <mesh raycast={noopRaycast}>
      <sphereGeometry args={[GLOBE_CONFIG.radius * 1.015, 64, 64]} />
      <meshBasicMaterial
        color={COLORS.emerald}
        transparent
        opacity={0.04}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

// ── Label Projector ──────────────────────────────────────────────────────────

function LabelProjector() {
  const { camera, size } = useThree();
  const floatingLabels = useGameStore((s) => s.floatingLabels);

  useFrame(() => {
    if (floatingLabels.length === 0) return;

    const projectedLabels = floatingLabels.map((label) => {
      const vector = new THREE.Vector3(...label.position);
      vector.project(camera);

      // Convert to screen coordinates
      const x = (vector.x * 0.5 + 0.5) * size.width;
      const y = (-(vector.y * 0.5) + 0.5) * size.height;

      // Check if behind camera
      const visible = vector.z < 1;

      return {
        ...label,
        screenX: x,
        screenY: y,
        visible,
      };
    });

    // Dispatch event with projected positions
    window.dispatchEvent(
      new CustomEvent("label-projection-update", {
        detail: projectedLabels,
      }),
    );
  });

  return null;
}

// ── Main scene ───────────────────────────────────────────────────────────────

function GlobeScene({
  features,
  wrongGuessIds,
  resolvedCountries,
  interactive,
  autoRotate,
  onCountryClick,
}: GlobeProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const [hoveredCountryBase, setHoveredCountryBase] = useState<string | null>(
    null,
  );

  // ── d3 projection (equirectangular rotated to match Three.js sphere UVs) ──

  const projection = useMemo(
    () =>
      geoEquirectangular()
        .rotate([-90, 0, 0])
        .translate([TEX_W / 2, TEX_H / 2])
        .scale(TEX_W / (2 * Math.PI)),
    [],
  );

  // ── Canvas + Three.js texture (created once) ──────────────────────────────

  const { canvas, texture } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = TEX_W;
    c.height = TEX_H;
    const t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    return { canvas: c, texture: t };
  }, []);

  useEffect(() => {
    return () => texture.dispose();
  }, [texture]);

  // ── Country state resolver ────────────────────────────────────────────────

  const getCountryState = useCallback(
    (featureId: string): CountryVisualState => {
      const base = baseId(featureId);
      const resolution = resolvedCountries.get(base);
      if (resolution) return resolution;
      if (wrongGuessIds.has(base)) return "wrongGuess";
      if (hoveredCountryBase === base) return "hover";
      return "default";
    },
    [resolvedCountries, wrongGuessIds, hoveredCountryBase],
  );

  // ── Redraw fill texture whenever visual state changes ─────────────────────

  useEffect(() => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, TEX_W, TEX_H);
    const pathGen = geoPath(projection, ctx);

    for (const feature of features) {
      const state = getCountryState(feature.id);
      if (state === "default") continue;

      ctx.fillStyle = getFillColor(state);
      ctx.globalAlpha = getFillOpacity(state);
      ctx.beginPath();
      pathGen(feature as unknown as GeoJSON.Feature);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    texture.needsUpdate = true;
  }, [canvas, texture, projection, features, getCountryState]);

  // ── Pointer → country lookup via d3-geo ───────────────────────────────────

  const findCountryAtPoint = useCallback(
    (point: THREE.Vector3): string | null => {
      const coords = pointToCoords(point, GLOBE_CONFIG.meshRadius);

      // First check if we're near any small country centroid
      for (const feature of features) {
        const base = baseId(feature.id);
        if (!SMALL_COUNTRIES.has(base)) continue;

        try {
          const centroid = geoCentroid(feature as unknown as GeoJSON.Feature);
          if (!centroid || !isFinite(centroid[0]) || !isFinite(centroid[1]))
            continue;

          // Calculate distance in degrees
          const distance = geoDistance(coords, centroid) * (180 / Math.PI);
          if (distance <= GLOBE_CONFIG.smallCountryClickRadius) {
            return feature.id;
          }
        } catch {
          // skip if centroid fails
        }
      }

      // Fall back to standard polygon containment check
      for (const feature of features) {
        try {
          if (geoContains(feature as unknown as GeoJSON.Feature, coords)) {
            return feature.id;
          }
        } catch {
          // skip malformed geometry
        }
      }
      return null;
    },
    [features],
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!interactive) {
        if (hoveredCountryBase) {
          setHoveredCountryBase(null);
          document.body.style.cursor = "auto";
        }
        return;
      }
      const id = findCountryAtPoint(e.point);
      const base = id ? baseId(id) : null;
      if (base !== hoveredCountryBase) {
        setHoveredCountryBase(base);
        document.body.style.cursor = base ? "pointer" : "auto";
      }
    },
    [interactive, findCountryAtPoint, hoveredCountryBase],
  );

  const handlePointerOut = useCallback(() => {
    setHoveredCountryBase(null);
    document.body.style.cursor = "auto";
  }, []);

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!interactive || !onCountryClick) return;

      // Only count as a click if pointer didn't move much (drag threshold)
      if (pointerDownRef.current) {
        const dx = e.clientX - pointerDownRef.current.x;
        const dy = e.clientY - pointerDownRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 5) {
          pointerDownRef.current = null;
          return; // It was a drag, not a click
        }
      }

      const id = findCountryAtPoint(e.point);
      if (id) onCountryClick(id, [e.point.x, e.point.y, e.point.z]);
    },
    [interactive, onCountryClick, findCountryAtPoint],
  );

  // ── Border line elements (static, no state dependency) ────────────────────

  const borderElements = useMemo(
    () =>
      features.map((feature) => (
        <CountryMesh key={feature.id} feature={feature} />
      )),
    [features],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 3, 5]} intensity={0.8} />

      {/* Dark base sphere */}
      <GlobeSphere />
      <Atmosphere />

      {/* Country fill texture sphere (sits on top of base) */}
      <mesh raycast={noopRaycast}>
        <sphereGeometry
          args={[
            GLOBE_CONFIG.meshRadius,
            GLOBE_CONFIG.segments,
            GLOBE_CONFIG.segments,
          ]}
        />
        <meshBasicMaterial map={texture} transparent depthWrite={false} />
      </mesh>

      {/* Country border outlines */}
      {borderElements}

      {/* Small country markers */}
      <SmallCountryMarkers
        features={features}
        resolvedCountries={resolvedCountries}
        wrongGuessIds={wrongGuessIds}
        hoveredCountryBase={hoveredCountryBase}
      />

      {/* Invisible event-catcher sphere */}
      <mesh
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry
          args={[
            GLOBE_CONFIG.meshRadius + 0.5,
            GLOBE_CONFIG.segments,
            GLOBE_CONFIG.segments,
          ]}
        />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <LabelProjector />

      <OrbitControls
        ref={controlsRef}
        enableZoom={true}
        enablePan={false}
        autoRotate={autoRotate}
        autoRotateSpeed={GLOBE_CONFIG.autoRotateSpeed}
        dampingFactor={GLOBE_CONFIG.dampingFactor}
        enableDamping
        minDistance={200}
        maxDistance={450}
        zoomSpeed={0.5}
        rotateSpeed={0.8}
      />
    </>
  );
}

// ── Canvas wrapper ───────────────────────────────────────────────────────────

export default function Globe(props: GlobeProps) {
  return (
    <Canvas
      camera={{
        position: [0, 0, GLOBE_CONFIG.cameraZ],
        fov: GLOBE_CONFIG.cameraFov,
        near: 1,
        far: 1000,
      }}
      style={{ background: "transparent" }}
      gl={{ antialias: true, alpha: true }}
    >
      <GlobeScene {...props} />
    </Canvas>
  );
}
