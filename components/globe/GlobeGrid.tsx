"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { GLOBE_CONFIG } from "@/lib/constants";

const noopRaycast = () => {};

// Grid configuration
const LAT_STEP = 15; // degrees between latitude lines
const LNG_STEP = 15; // degrees between longitude lines
const SEGMENTS_PER_LINE = 64;
const GRID_RADIUS = GLOBE_CONFIG.meshRadius + 0.05; // Above country fill texture sphere
const GRID_COLOR = "#666666";
const GRID_OPACITY = 0.3;

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function latLngToPoint(
  lat: number,
  lng: number,
  radius: number,
): THREE.Vector3 {
  const phi = degToRad(90 - lat);
  const theta = degToRad(lng + 90);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export default function GlobeGrid() {
  const gridGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];

    // Latitude lines (parallels)
    for (let lat = -80; lat <= 80; lat += LAT_STEP) {
      for (let i = 0; i <= SEGMENTS_PER_LINE; i++) {
        const lng = (i / SEGMENTS_PER_LINE) * 360 - 180;
        points.push(latLngToPoint(lat, lng, GRID_RADIUS));
        if (i > 0 && i < SEGMENTS_PER_LINE) {
          // Duplicate point for line segments (except first and last)
          points.push(latLngToPoint(lat, lng, GRID_RADIUS));
        }
      }
    }

    // Longitude lines (meridians)
    for (let lng = -180; lng < 180; lng += LNG_STEP) {
      for (let i = 0; i <= SEGMENTS_PER_LINE; i++) {
        const lat = (i / SEGMENTS_PER_LINE) * 180 - 90;
        points.push(latLngToPoint(lat, lng, GRID_RADIUS));
        if (i > 0 && i < SEGMENTS_PER_LINE) {
          // Duplicate point for line segments (except first and last)
          points.push(latLngToPoint(lat, lng, GRID_RADIUS));
        }
      }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, []);

  return (
    <lineSegments geometry={gridGeometry} raycast={noopRaycast}>
      <lineBasicMaterial
        color={GRID_COLOR}
        transparent
        opacity={GRID_OPACITY}
        depthTest={true}
        depthWrite={false}
      />
    </lineSegments>
  );
}
