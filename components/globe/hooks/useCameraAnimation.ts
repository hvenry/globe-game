"use client";

import { useCallback, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { GLOBE_CONFIG } from "@/lib/constants";
import { lngLatToCameraPos } from "@/lib/geo/coords";
import type { GamePhase } from "@/lib/store/game-store";
import type { CountrySetId } from "@/lib/geo/country-sets";

/**
 * Approximate [lng, lat] centres for the sets the intro can fly to. Draw sets
 * and "all" have none and fall back to the hero framing.
 */
const SET_CENTERS: Partial<Record<CountrySetId, [number, number]>> = {
  africa: [20, 5],
  asia: [80, 30],
  europe: [15, 50],
  north_america: [-95, 35],
  south_america: [-58, -15],
  oceania: [145, -10],
  caribbean: [-70, 17],
  central_america: [-86, 13],
  middle_east: [45, 28],
  southeast_asia: [110, 5],
  balkans: [21, 43],
  nordics: [15, 63],
  stans: [65, 40],
  west_africa: [-3, 12],
  east_africa: [38, 2],
  southern_africa: [24, -22],
};

/**
 * A planned camera flight: azimuth, polar angle, and radius tweened together
 * over a duration proportional to the arc length, so nearby targets arrive
 * quickly and far ones get a longer, readable journey. Interpolating in
 * OrbitControls' own parametrization means the path can never swing over a
 * pole (where lookAt's up vector degenerates and the view rolls).
 */
interface CameraFlight {
  startRadius: number;
  startPhi: number;
  startTheta: number;
  dRadius: number;
  dPhi: number;
  /** Azimuth delta, wrapped to the shortest way around. */
  dTheta: number;
  duration: number;
  elapsed: number;
  target: THREE.Vector3;
}

function planFlight(from: THREE.Vector3, to: THREE.Vector3): CameraFlight {
  const start = new THREE.Spherical().setFromVector3(from);
  const end = new THREE.Spherical().setFromVector3(to);
  const dTheta =
    THREE.MathUtils.euclideanModulo(
      end.theta - start.theta + Math.PI,
      Math.PI * 2,
    ) - Math.PI;

  const arc = from.clone().normalize().angleTo(to.clone().normalize());
  const duration = THREE.MathUtils.clamp(
    arc / GLOBE_CONFIG.cameraFlightSpeed,
    GLOBE_CONFIG.cameraFlightMinDuration,
    GLOBE_CONFIG.cameraFlightMaxDuration,
  );

  return {
    startRadius: start.radius,
    startPhi: start.phi,
    startTheta: start.theta,
    dRadius: end.radius - start.radius,
    dPhi: end.phi - start.phi,
    dTheta,
    duration,
    elapsed: 0,
    target: to.clone(),
  };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Phase-driven camera animation:
 * - game start (`gameKey` changes) → fly to the set's centre (or the hero
 *   framing when it has none); `onIntroArrived` fires when it settles, and the
 *   gameplay clock stays held until then so fly-in time never eats the timer
 * - game end / menu → fly back to the hero framing (equator-level, standard
 *   zoom) so results and the menu always sit over a fresh-looking globe
 * - expert loss → fly to the missed country (`revealPosition`) so the player
 *   sees where it was before the results appear; `onRevealArrived` fires when
 *   that flight settles
 *
 * OrbitControls is disabled while animating. Beyond that, the intro and the
 * reveal are cinematics that input cannot cancel: the intro holds the game
 * clock until the playfield is framed, and the reveal is the one look at the
 * missed country. Only the hero flights stay interruptible.
 */
export function useCameraAnimation(
  controlsRef: React.RefObject<OrbitControlsImpl | null>,
  gamePhase: GamePhase,
  gameCountrySetId: CountrySetId,
  /** Identity of the current game run (its start timestamp), null when idle. */
  gameKey: number | null,
  revealPosition: [number, number, number] | null,
  /** Hero-framing camera distance; widens on narrow viewports. */
  heroDistance: number,
  onIntroArrived?: () => void,
  onRevealArrived?: () => void,
) {
  const { camera } = useThree();
  const prevPhaseRef = useRef(gamePhase);
  const flightRef = useRef<CameraFlight | null>(null);
  const lastGameKeyRef = useRef<number | null>(null);
  const isIntroFlightRef = useRef(false);
  const isRevealFlightRef = useRef(false);

  const endIntroFlight = useCallback(() => {
    if (isIntroFlightRef.current) {
      isIntroFlightRef.current = false;
      onIntroArrived?.();
    }
  }, [onIntroArrived]);

  const endRevealFlight = useCallback(() => {
    if (isRevealFlightRef.current) {
      isRevealFlightRef.current = false;
      onRevealArrived?.();
    }
  }, [onRevealArrived]);

  const setControlsEnabled = useCallback(
    (enabled: boolean) => {
      if (controlsRef.current) controlsRef.current.enabled = enabled;
    },
    [controlsRef],
  );

  const cancelAnim = useCallback(() => {
    if (isIntroFlightRef.current || isRevealFlightRef.current) return;
    if (flightRef.current) {
      flightRef.current = null;
      setControlsEnabled(true);
    }
  }, [setControlsEnabled]);

  /**
   * Back to the hero framing: equator-level at the standard distance, keeping
   * the current azimuth. Returns false when already there.
   */
  const flyToHero = useCallback((): boolean => {
    const current = new THREE.Spherical().setFromVector3(camera.position);
    if (
      Math.abs(current.phi - Math.PI / 2) < 0.02 &&
      Math.abs(current.radius - heroDistance) < 2
    ) {
      return false;
    }
    flightRef.current = planFlight(
      camera.position,
      new THREE.Vector3().setFromSpherical(
        new THREE.Spherical(heroDistance, Math.PI / 2, current.theta),
      ),
    );
    setControlsEnabled(false);
    return true;
  }, [camera, setControlsEnabled, heroDistance]);

  // Intro flight: every new game run (fresh start or restart) flies to the
  // set's centre, or back to the hero framing when it has none. Keyed on the
  // run's identity so restarts re-trigger it and onIntroArrived always fires.
  useEffect(() => {
    if (gamePhase !== "playing" || gameKey === null) return;
    if (lastGameKeyRef.current === gameKey) return;
    lastGameKeyRef.current = gameKey;

    const center = SET_CENTERS[gameCountrySetId];
    if (center) {
      // Full flight to face the set
      flightRef.current = planFlight(
        camera.position,
        lngLatToCameraPos(center[0], center[1], heroDistance),
      );
      isIntroFlightRef.current = true;
      setControlsEnabled(false);
    } else if (flyToHero()) {
      isIntroFlightRef.current = true;
    } else {
      // Already framed — release the gameplay clock immediately
      onIntroArrived?.();
    }
  }, [
    gameKey,
    gamePhase,
    gameCountrySetId,
    camera,
    setControlsEnabled,
    flyToHero,
    onIntroArrived,
    heroDistance,
  ]);

  useEffect(() => {
    const wasInGame =
      prevPhaseRef.current === "playing" ||
      prevPhaseRef.current === "feedback" ||
      prevPhaseRef.current === "mustclick";

    if (gamePhase === "gameover" && wasInGame) {
      if (revealPosition) {
        // Expert loss: fly to the missed country's pulse marker
        flightRef.current = planFlight(
          camera.position,
          new THREE.Vector3(...revealPosition)
            .normalize()
            .multiplyScalar(GLOBE_CONFIG.revealDistance),
        );
        isRevealFlightRef.current = true;
        setControlsEnabled(false);
      } else {
        // Results over a leveled, spinning globe — same as a fresh load
        flyToHero();
      }
    }

    // Entering the menu (from game over or a forfeit) always restores the
    // hero framing, wherever the game or its reveal left the camera
    if (gamePhase === "idle" && prevPhaseRef.current !== "idle") {
      flyToHero();
    }

    prevPhaseRef.current = gamePhase;
  }, [gamePhase, revealPosition, camera, setControlsEnabled, flyToHero]);

  // Any user interaction cancels the animation. Capture phase so controls are
  // re-enabled before OrbitControls sees the same pointerdown event.
  useEffect(() => {
    const el = document.body;
    el.addEventListener("pointerdown", cancelAnim, { capture: true });
    el.addEventListener("wheel", cancelAnim, { capture: true });
    return () => {
      el.removeEventListener("pointerdown", cancelAnim, { capture: true });
      el.removeEventListener("wheel", cancelAnim, { capture: true });
    };
  }, [cancelAnim]);

  useFrame((_, delta) => {
    // Camera flight (intro, expert-loss reveal, return to hero framing)
    if (flightRef.current) {
      const flight = flightRef.current;
      // Clamp delta so a background-tab hiccup can't teleport the camera
      flight.elapsed += Math.min(delta, 0.1);
      const t = Math.min(1, flight.elapsed / flight.duration);
      const eased = easeInOutCubic(t);

      const next = new THREE.Spherical(
        flight.startRadius + flight.dRadius * eased,
        flight.startPhi + flight.dPhi * eased,
        flight.startTheta + flight.dTheta * eased,
      );
      next.makeSafe(); // keep clear of the poles

      camera.position.setFromSpherical(next);
      // Controls are disabled while animating (drei skips controls.update()),
      // so keep the camera aimed at the globe ourselves
      camera.lookAt(0, 0, 0);

      if (t >= 1) {
        camera.position.copy(flight.target);
        camera.lookAt(0, 0, 0);
        flightRef.current = null;
        setControlsEnabled(true);
        endIntroFlight();
        endRevealFlight();
      }
    }
  });
}
