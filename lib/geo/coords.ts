import * as THREE from "three";

/**
 * Coordinate conversions between [lng, lat] and Three.js space.
 *
 * The globe uses three-geojson-geometry's convention: the sphere is oriented
 * with [lng=0, lat=0] along the +X axis. These helpers are the single source
 * of truth for that mapping — keep every component on them.
 */

/** Convert a Three.js intersection point on the sphere to [lng, lat]. */
export function pointToCoords(point: THREE.Vector3, radius: number): [number, number] {
  const phi = Math.acos(Math.max(-1, Math.min(1, point.y / radius)));
  const theta = Math.atan2(point.z, point.x);
  const lat = 90 - phi * (180 / Math.PI);
  let lng = 90 - theta * (180 / Math.PI);
  if (lng > 180) lng -= 360;
  if (lng < -180) lng += 360;
  return [lng, lat];
}

/** Convert [lng, lat] to a position on a sphere of the given radius. */
export function coordsToPosition(
  lng: number,
  lat: number,
  radius: number,
): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((90 - lng) * Math.PI) / 180;
  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

/** Convert [lng, lat] to a camera position vector at the given distance. */
export function lngLatToCameraPos(
  lng: number,
  lat: number,
  distance: number,
): THREE.Vector3 {
  return new THREE.Vector3(...coordsToPosition(lng, lat, distance));
}
