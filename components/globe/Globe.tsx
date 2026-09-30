"use client";

import { useRef, useCallback, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { geoCentroid, geoArea } from "d3-geo";
import GlobeSphere from "./GlobeSphere";
import GlobeGrid from "./GlobeGrid";
import Stars from "./Stars";
import CountryMesh from "./CountryMesh";
import SmallCountryMarkers from "./SmallCountryMarkers";
import PulseRing from "./PulseRing";
import type { CountryFeature } from "@/lib/geo/types";
import {
  GLOBE_CONFIG,
  GLOBE_LAYER,
  type CountryFill,
  PULSE_CONFIG,
} from "@/lib/constants";
import { useSceneColors } from "@/lib/hooks/useSceneColors";
import { useHeroFraming } from "@/lib/hooks/useHeroFraming";
import { baseId } from "@/lib/geo/countries";
import { coordsToPosition } from "@/lib/geo/coords";
import type { Resolution } from "@/lib/engine/types";
import { useSettingsStore } from "@/lib/store/settings-store";
import { getCountrySet, type CountrySetId } from "@/lib/geo/country-sets";
import { useGameStore, type GamePhase } from "@/lib/store/game-store";
import { useLabelProjectionStore } from "@/lib/store/label-projection-store";
import { useIsCoarsePointer } from "@/lib/hooks/useIsCoarsePointer";
import { useCameraAnimation } from "./hooks/useCameraAnimation";
import { useCountryPicking } from "./hooks/useCountryPicking";
import { useCountryTextures } from "./hooks/useCountryTextures";

const noopRaycast = () => {};

interface GlobeProps {
  features: CountryFeature[];
  wrongGuessIds: string[];
  resolvedCountries: Record<string, Resolution | CountryFill>;
  interactive: boolean;
  autoRotate: boolean;
  onCountryClick?: (
    countryId: string,
    position: [number, number, number],
  ) => void;
  onReady?: () => void;
  /** Fires when the game-start camera flight settles (or is taken over). */
  onIntroArrived?: () => void;
  /** Fires when the expert-loss reveal flight settles (or is taken over). */
  onRevealArrived?: () => void;
  zoomSpeed?: number;
  rotateSpeed?: number;
  /**
   * Whether countries already painted (resolved or guessed wrong) still light
   * up under the pointer. Off, the highlight only ever marks a live target,
   * so nothing invites a click that cannot be answered.
   */
  hoverFilled?: boolean;
  /**
   * Drive the scene from somewhere other than the solo game store. Race mode
   * passes this so set emphasis, hover gating and the camera flights follow
   * the room's settings rather than whatever the solo menu has selected.
   */
  scene?: GlobeScene;
}

export interface GlobeScene {
  phase: GamePhase;
  countrySetId: CountrySetId;
  /** Identity of the current run; a change triggers the intro flight. */
  gameKey: number | null;
  /** A country to pulse (race reveal), or null. Replaces the solo mustclick pulse. */
  pulseId?: string | null;
  /** The exact ids in play when the set alone cannot say (a draw set's sample). */
  validIds?: ReadonlySet<string> | null;
}

// Mustclick pulse fill: the target country is painted white on its own
// texture layer once; the red/white flash is a per-frame material tint —
// no canvas repaints or texture uploads involved.
function PulseFillLayer({
  texture,
  active,
}: {
  texture: THREE.Texture;
  active: boolean;
}) {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const COLORS = useSceneColors();
  const flashColors = useMemo(
    () => ({
      alert: new THREE.Color(COLORS.countryFailed),
      alt: new THREE.Color(COLORS.countryHover),
    }),
    [COLORS.countryFailed, COLORS.countryHover],
  );

  // Swaps colour on each beat of the same clock the radar ring and the
  // repeating cue run on, started the frame the pulse becomes active.
  const startRef = useRef<number | null>(null);
  useFrame((state) => {
    const material = materialRef.current;
    if (!material || !active) {
      startRef.current = null;
      return;
    }
    startRef.current ??= state.clock.elapsedTime;
    // Solid, and it alternates: red for one beat, white for the next.
    const beat = Math.floor(
      (state.clock.elapsedTime - startRef.current) / PULSE_CONFIG.periodSeconds,
    );
    material.color.copy(beat % 2 === 0 ? flashColors.alert : flashColors.alt);
  });

  return (
    <mesh
      raycast={noopRaycast}
      visible={active}
      renderOrder={GLOBE_LAYER.pulse}
    >
      <sphereGeometry
        args={[
          GLOBE_CONFIG.meshRadius + 0.1,
          GLOBE_CONFIG.segments,
          GLOBE_CONFIG.segments,
        ]}
      />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </mesh>
  );
}

// Atmosphere
function Atmosphere() {
  const COLORS = useSceneColors();

  return (
    <mesh raycast={noopRaycast} renderOrder={GLOBE_LAYER.atmosphere}>
      <sphereGeometry args={[GLOBE_CONFIG.radius * 1.015, 64, 64]} />
      <meshBasicMaterial
        color={COLORS.atmosphere}
        transparent
        opacity={COLORS.atmosphereOpacity}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

// Projects floating labels into screen space for the DOM overlay
function LabelProjector() {
  const { camera, size } = useThree();
  const floatingLabels = useGameStore((s) => s.floatingLabels);
  const setLabels = useLabelProjectionStore((s) => s.setLabels);

  useFrame(() => {
    if (floatingLabels.length === 0) return;

    setLabels(
      floatingLabels.map((label) => {
        const vector = new THREE.Vector3(...label.position);
        vector.project(camera);
        return {
          ...label,
          screenX: (vector.x * 0.5 + 0.5) * size.width,
          screenY: (-(vector.y * 0.5) + 0.5) * size.height,
          visible: vector.z < 1,
        };
      }),
    );
  });

  return null;
}

// Main scene
function GlobeScene({
  features,
  wrongGuessIds,
  resolvedCountries,
  interactive,
  autoRotate,
  onCountryClick,
  onReady,
  onIntroArrived,
  onRevealArrived,
  zoomSpeed = 0.53,
  rotateSpeed = 1.0,
  hoverFilled = true,
  scene,
}: GlobeProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const pointerDownRef = useRef<{
    x: number;
    y: number;
    isTouch: boolean;
  } | null>(null);
  const [hoveredCountryBase, setHoveredCountryBase] = useState<string | null>(
    null,
  );
  const storeValidCountryIds = useGameStore((s) => s.validCountryIds);
  const { camera } = useThree();
  const COLORS = useSceneColors();

  // Coarse-pointer (touch) tuning: grippier damping, deeper zoom, no hover
  const isCoarsePointer = useIsCoarsePointer();
  const minDistance = isCoarsePointer
    ? GLOBE_CONFIG.touch.minDistance
    : GLOBE_CONFIG.minDistance;
  const { heroDistance, maxDistance } = useHeroFraming();
  const dampingFactor = isCoarsePointer
    ? GLOBE_CONFIG.touch.dampingFactor
    : GLOBE_CONFIG.dampingFactor;
  const baseRotateSpeed =
    rotateSpeed * (isCoarsePointer ? GLOBE_CONFIG.touch.rotateSpeedScale : 1);
  const baseZoomSpeed =
    zoomSpeed * (isCoarsePointer ? GLOBE_CONFIG.touch.zoomSpeedScale : 1);

  const storePhase = useGameStore((s) => s.phase);
  const currentCountry = useGameStore((s) => s.currentCountry);
  const storeCountrySetId = useGameStore((s) => s.countrySetId);
  const settingsCountrySet = useSettingsStore((s) => s.countrySet);
  const storeGameStartTime = useGameStore((s) => s.gameStartTime);

  const gamePhase = scene?.phase ?? storePhase;
  const gameCountrySetId = scene?.countrySetId ?? storeCountrySetId;
  const gameStartTime = scene ? scene.gameKey : storeGameStartTime;

  // With an override the playable set is fixed by the caller's set id, in
  // every phase — the solo store's set only means something in solo mode.
  // Keyed on the set alone, not the whole scene: the scene changes with every
  // race phase, and a new Set here repaints the land layer.
  const hasScene = scene !== undefined;
  const sceneCountrySetId = scene?.countrySetId;
  const sceneValidIds = scene?.validIds;
  const sceneSetIds = useMemo(() => {
    if (!hasScene) return null;
    if (sceneValidIds) return new Set(sceneValidIds);
    const ids = sceneCountrySetId
      ? getCountrySet(sceneCountrySetId).countryIds
      : null;
    return new Set(ids ?? []);
  }, [hasScene, sceneCountrySetId, sceneValidIds]);
  const validCountryIds = sceneSetIds ?? storeValidCountryIds;
  const expertMode = useGameStore((s) => s.expertMode);
  const lastResolution = useGameStore((s) => s.lastResolution);

  // Pulse the failed country during mustclick, and on expert-mode game over
  const showMustclickEffects =
    gamePhase === "mustclick" ||
    (gamePhase === "gameover" && expertMode && lastResolution === "failed");
  const pulseBase = scene
    ? (scene.pulseId ?? null)
    : showMustclickEffects && currentCountry
      ? currentCountry.id
      : null;

  // Compute centroid position for pulse ring during mustclick phase or expert gameover
  const pulseRingPosition = useMemo(() => {
    if (!pulseBase) return null;
    const feature = features.find((f) => baseId(f.id) === pulseBase);
    if (!feature) return null;
    try {
      // For MultiPolygon features (e.g. France with French Guiana), use the
      // centroid of the largest polygon so the radar appears on the mainland.
      let centroidTarget: GeoJSON.Feature =
        feature as unknown as GeoJSON.Feature;
      if (feature.geometry.type === "MultiPolygon") {
        let largestArea = -1;
        for (const coords of feature.geometry.coordinates) {
          const poly: GeoJSON.Feature = {
            type: "Feature",
            properties: {},
            geometry: { type: "Polygon", coordinates: coords },
          };
          const area = geoArea(poly);
          if (area > largestArea) {
            largestArea = area;
            centroidTarget = poly;
          }
        }
      }
      const centroid = geoCentroid(centroidTarget);
      if (!centroid || !isFinite(centroid[0]) || !isFinite(centroid[1]))
        return null;
      return coordsToPosition(
        centroid[0],
        centroid[1],
        GLOBE_CONFIG.meshRadius + 0.5,
      );
    } catch {
      return null;
    }
  }, [pulseBase, features]);

  useCameraAnimation(
    controlsRef,
    gamePhase,
    gameCountrySetId,
    gameStartTime,
    pulseRingPosition,
    heroDistance,
    onIntroArrived,
    onRevealArrived,
  );

  // Scale rotate speed with distance to the globe SURFACE so close-up drags
  // stay precise: the visible ground patch shrinks with (distance - radius),
  // so rotation per pixel must shrink with it for ~1:1 pointer tracking.
  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const zoomFactor = THREE.MathUtils.clamp(
      (camera.position.length() - GLOBE_CONFIG.radius) /
        (maxDistance - GLOBE_CONFIG.radius),
      GLOBE_CONFIG.rotateSpeedMinFactor,
      1,
    );
    controls.rotateSpeed = baseRotateSpeed * zoomFactor;
  });

  const handleReady = useCallback(() => {
    if (onReady) {
      // Small delay to ensure everything is rendered
      setTimeout(() => onReady(), 100);
    }
  }, [onReady]);

  // On the menu there is no run yet, so the emphasis previews whichever set is
  // selected in settings rather than waiting for the game to start.
  const previewIds = useMemo(() => {
    if (settingsCountrySet === "all") return null;
    const ids = getCountrySet(settingsCountrySet).countryIds;
    return ids ? new Set(ids) : null;
  }, [settingsCountrySet]);

  // The ids the globe treats as the playfield — everything outside them dims
  // to `outOfSetOpacityScale`. Null means the whole world is in play.
  function activeEmphasisIds(): Set<string> | null {
    if (scene) {
      if (scene.countrySetId === "all") return null;
      return sceneSetIds && sceneSetIds.size > 0 ? sceneSetIds : null;
    }
    if (gameCountrySetId !== "all" && validCountryIds.size > 0) {
      return validCountryIds;
    }
    return gamePhase === "idle" ? previewIds : null;
  }

  const emphasisIds = activeEmphasisIds();

  const { landTexture, baseTexture, hoverTexture, pulseTexture } =
    useCountryTextures({
      features,
      resolvedCountries,
      wrongGuessIds,
      hoveredCountryBase,
      pulseBase,
      emphasisIds,
      onFirstDraw: handleReady,
    });

  const findCountryAtPoint = useCountryPicking(features);

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      // No hover on touch: dragging a finger across the globe is navigation,
      // not pointing, and the highlight just flashes under the drag
      if (!interactive || e.pointerType === "touch") {
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
      // Without hints there is nothing to learn from a painted country — except
      // the one pulsing to be clicked, which is the live target however it is
      // painted.
      if (
        base &&
        !hoverFilled &&
        base !== pulseBase &&
        (resolvedCountries[base] !== undefined || wrongGuessIds.includes(base))
      ) {
        base = null;
      }
      if (base !== hoveredCountryBase) {
        setHoveredCountryBase(base);
        document.body.style.cursor = base ? "pointer" : "auto";
      }
    },
    [
      interactive,
      findCountryAtPoint,
      hoveredCountryBase,
      validCountryIds,
      hoverFilled,
      pulseBase,
      resolvedCountries,
      wrongGuessIds,
    ],
  );

  const handlePointerOut = useCallback(() => {
    setHoveredCountryBase(null);
    document.body.style.cursor = "auto";
  }, []);

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    pointerDownRef.current = {
      x: e.clientX,
      y: e.clientY,
      isTouch: e.pointerType === "touch",
    };
  }, []);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!interactive || !onCountryClick) return;

      // Only count as a click if pointer didn't move much (drag threshold);
      // fingers wobble, so touch gets a looser threshold
      const isTouch = pointerDownRef.current?.isTouch ?? false;
      if (pointerDownRef.current) {
        const dx = e.clientX - pointerDownRef.current.x;
        const dy = e.clientY - pointerDownRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const threshold = isTouch
          ? GLOBE_CONFIG.touch.dragThreshold
          : GLOBE_CONFIG.dragThreshold;
        if (distance > threshold) {
          pointerDownRef.current = null;
          return; // It was a drag, not a click
        }
      }

      const id = findCountryAtPoint(
        e.point,
        // No precise pointer on touch — widen the micro-state tap radius
        isTouch ? GLOBE_CONFIG.touch.smallCountryRadiusScale : 1,
      );
      if (id) {
        const base = baseId(id);
        // Ignore countries outside the active game set
        if (validCountryIds.size > 0 && !validCountryIds.has(base)) return;
        onCountryClick(id, [e.point.x, e.point.y, e.point.z]);
      }
    },
    [interactive, onCountryClick, findCountryAtPoint, validCountryIds],
  );

  // Border line elements (rebuilt only when the emphasis set changes)
  const borderElements = useMemo(
    () =>
      features.map((feature) => (
        <CountryMesh
          key={feature.id}
          feature={feature}
          opacity={
            emphasisIds && !emphasisIds.has(baseId(feature.id))
              ? COLORS.borderOpacity * COLORS.outOfSetScale
              : COLORS.borderOpacity
          }
        />
      )),
    [features, emphasisIds, COLORS.borderOpacity, COLORS.outOfSetScale],
  );

  // Render
  return (
    <>
      <Stars />

      <ambientLight intensity={COLORS.ambientIntensity} />
      <directionalLight
        position={[5, 3, 5]}
        intensity={COLORS.directionalIntensity}
      />

      {/* Base sphere: the void in dark, the ocean in light */}
      <GlobeSphere />
      <GlobeGrid />
      <Atmosphere />

      {COLORS.land && (
        <mesh raycast={noopRaycast} renderOrder={GLOBE_LAYER.land}>
          <sphereGeometry
            args={[
              GLOBE_CONFIG.meshRadius - 0.05,
              GLOBE_CONFIG.segments,
              GLOBE_CONFIG.segments,
            ]}
          />
          {COLORS.unlit ? (
            <meshBasicMaterial
              map={landTexture}
              transparent
              depthWrite={false}
            />
          ) : (
            <meshPhongMaterial
              map={landTexture}
              transparent
              depthWrite={false}
              shininess={2}
            />
          )}
        </mesh>
      )}

      {/* Country fills: static layer (resolved / wrong guesses) */}
      <mesh raycast={noopRaycast} renderOrder={GLOBE_LAYER.fills}>
        <sphereGeometry
          args={[
            GLOBE_CONFIG.meshRadius,
            GLOBE_CONFIG.segments,
            GLOBE_CONFIG.segments,
          ]}
        />
        <meshBasicMaterial map={baseTexture} transparent depthWrite={false} />
      </mesh>

      {/* Country fills: hover layer */}
      <mesh raycast={noopRaycast} renderOrder={GLOBE_LAYER.hover}>
        <sphereGeometry
          args={[
            GLOBE_CONFIG.meshRadius + 0.05,
            GLOBE_CONFIG.segments,
            GLOBE_CONFIG.segments,
          ]}
        />
        <meshBasicMaterial map={hoverTexture} transparent depthWrite={false} />
      </mesh>

      {/* Country fills: mustclick pulse layer (flash via material tint) */}
      <PulseFillLayer texture={pulseTexture} active={pulseBase !== null} />

      {/* Country border outlines */}
      {borderElements}

      {/* Small country markers */}
      <SmallCountryMarkers
        features={features}
        resolvedCountries={resolvedCountries}
        wrongGuessIds={wrongGuessIds}
        hoveredCountryBase={hoveredCountryBase}
        pulseBase={pulseBase}
        emphasisIds={emphasisIds}
      />

      {/* Radar pulse ring for mustclick phase */}
      {pulseRingPosition && <PulseRing position={pulseRingPosition} />}

      {/* Invisible event-catcher sphere */}
      <mesh
        renderOrder={GLOBE_LAYER.picker}
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
        dampingFactor={dampingFactor}
        enableDamping
        minDistance={minDistance}
        maxDistance={maxDistance}
        zoomSpeed={baseZoomSpeed}
        rotateSpeed={baseRotateSpeed}
      />
    </>
  );
}

// Canvas wrapper
export default function Globe(props: GlobeProps) {
  const { heroDistance } = useHeroFraming();

  return (
    <Canvas
      camera={{
        position: [0, 0, heroDistance],
        fov: GLOBE_CONFIG.cameraFov,
        near: 1,
        far: 1000,
      }}
      style={{ background: "transparent" }}
      gl={{ antialias: true, alpha: true }}
      /* `flat` disables R3F's default ACES tone mapping, which desaturates
         midtones — on a flat palette that just reads as mud. */
      flat
    >
      <GlobeScene {...props} />
    </Canvas>
  );
}
