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
import GlobeGrid from "./GlobeGrid";
import Stars from "./Stars";
import CountryMesh from "./CountryMesh";
import SmallCountryMarkers from "./SmallCountryMarkers";
import type { CountryFeature } from "@/lib/geo/types";
import { GLOBE_CONFIG, COLORS, SMALL_COUNTRIES } from "@/lib/constants";
import { baseId } from "@/lib/geo/countries";
import type { Resolution, FloatingLabel } from "@/lib/store/game-store";
import { useGameStore } from "@/lib/store/game-store";
import type { CountrySetId } from "@/lib/geo/country-sets";

// ── Continent camera targets ────────────────────────────────────────────────

/** Approximate [lng, lat] centers for each continent game mode */
const CONTINENT_CENTERS: Partial<Record<CountrySetId, [number, number]>> = {
  africa: [20, 5],
  asia: [80, 30],
  europe: [15, 50],
  north_america: [-95, 35],
  south_america: [-58, -15],
  oceania: [145, -10],
};

/**
 * Convert [lng, lat] to a Three.js camera position at the given distance.
 * Coordinate convention matches three-geojson-geometry / pointToCoords.
 */
function lngLatToCameraPos(
  lng: number,
  lat: number,
  distance: number,
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (90 - lng) * (Math.PI / 180);
  return new THREE.Vector3(
    distance * Math.sin(phi) * Math.cos(theta),
    distance * Math.cos(phi),
    distance * Math.sin(phi) * Math.sin(theta),
  );
}

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
  onReady?: () => void;
  zoomSpeed?: number;
  rotateSpeed?: number;
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
  onReady,
  zoomSpeed = 0.53,
  rotateSpeed = 1.0,
}: GlobeProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const [hoveredCountryBase, setHoveredCountryBase] = useState<string | null>(
    null,
  );
  const readySignaled = useRef(false);
  const validCountryIds = useGameStore((s) => s.validCountryIds);
  const { camera } = useThree();

  // ── Camera animation (continent targeting + zoom reset) ─────────────────

  const gamePhase = useGameStore((s) => s.phase);
  const gameCountrySetId = useGameStore((s) => s.countrySetId);
  const prevPhaseRef = useRef(gamePhase);
  const animTargetRef = useRef<THREE.Vector3 | null>(null);
  const animDistanceRef = useRef<number | null>(null);
  const hasAnimatedForGame = useRef(false);

  const cancelAnim = useCallback(() => {
    animTargetRef.current = null;
    animDistanceRef.current = null;
  }, []);

  useEffect(() => {
    const wasInGame = prevPhaseRef.current === "playing" || prevPhaseRef.current === "feedback";

    // Only animate once per game session (idle/gameover → playing)
    if (gamePhase === "playing" && !wasInGame && !hasAnimatedForGame.current) {
      hasAnimatedForGame.current = true;
      const center = CONTINENT_CENTERS[gameCountrySetId];
      if (center) {
        // Full position animation to face the continent
        animTargetRef.current = lngLatToCameraPos(center[0], center[1], GLOBE_CONFIG.cameraZ);
      } else {
        // "all" mode — distance-only reset
        animDistanceRef.current = GLOBE_CONFIG.cameraZ;
      }
    }

    if ((gamePhase === "idle" || gamePhase === "gameover") && wasInGame) {
      hasAnimatedForGame.current = false;
      // Distance-only animation so autoRotate can spin freely
      animDistanceRef.current = GLOBE_CONFIG.cameraZ;
    }

    prevPhaseRef.current = gamePhase;
  }, [gamePhase, gameCountrySetId, camera]);

  // Cancel camera animation on any user interaction (drag, scroll/zoom)
  useEffect(() => {
    const el = document.body;
    el.addEventListener("pointerdown", cancelAnim);
    el.addEventListener("wheel", cancelAnim);
    return () => {
      el.removeEventListener("pointerdown", cancelAnim);
      el.removeEventListener("wheel", cancelAnim);
    };
  }, [cancelAnim]);

  useFrame(() => {
    // Full position animation (game start → continent)
    if (animTargetRef.current) {
      camera.position.lerp(animTargetRef.current, 0.05);
      if (camera.position.distanceTo(animTargetRef.current) < 0.5) {
        camera.position.copy(animTargetRef.current);
        animTargetRef.current = null;
      }
      return;
    }

    // Distance-only animation (game end → reset zoom)
    if (animDistanceRef.current !== null) {
      const currentDist = camera.position.length();
      const targetDist = animDistanceRef.current;
      const newDist = THREE.MathUtils.lerp(currentDist, targetDist, 0.05);
      camera.position.normalize().multiplyScalar(newDist);
      if (Math.abs(newDist - targetDist) < 0.5) {
        camera.position.normalize().multiplyScalar(targetDist);
        animDistanceRef.current = null;
      }
    }
  });

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

    // Signal ready after initial render
    if (!readySignaled.current && onReady) {
      readySignaled.current = true;
      // Small delay to ensure everything is rendered
      setTimeout(() => onReady(), 100);
    }
  }, [canvas, texture, projection, features, getCountryState, onReady]);

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
      let base = id ? baseId(id) : null;
      // Ignore countries outside the active game set
      if (base && validCountryIds.size > 0 && !validCountryIds.has(base)) {
        base = null;
      }
      if (base !== hoveredCountryBase) {
        setHoveredCountryBase(base);
        document.body.style.cursor = base ? "pointer" : "auto";
      }
    },
    [interactive, findCountryAtPoint, hoveredCountryBase, validCountryIds],
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
      if (id) {
        const base = baseId(id);
        // Ignore countries outside the active game set
        if (validCountryIds.size > 0 && !validCountryIds.has(base)) return;
        onCountryClick(id, [e.point.x, e.point.y, e.point.z]);
      }
    },
    [interactive, onCountryClick, findCountryAtPoint, validCountryIds],
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
      <Stars />

      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 3, 5]} intensity={0.8} />

      {/* Dark base sphere */}
      <GlobeSphere />
      <GlobeGrid />
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
        zoomSpeed={zoomSpeed}
        rotateSpeed={rotateSpeed}
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
