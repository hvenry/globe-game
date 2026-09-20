import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { CountryFeature, CountryData } from "./types";
import { COUNTRY_NAMES, GUESSABLE_IDS } from "./country-names";
import topoData from "@/data/countries-50m.json";

const topology = topoData as unknown as Topology;

let _allFeatures: CountryFeature[] | null = null;

// Synthetic feature for Tuvalu (not in Natural Earth 50m dataset)
// Coordinates: approximately -8.5167° S, 179.1967° E (near Fiji in the Pacific)
// Rendered as a small green circle marker instead of a polygon
const TUVALU_FEATURE: CountryFeature = {
  type: "Feature",
  id: "798",
  properties: {
    name: "Tuvalu",
  },
  geometry: {
    type: "Point",
    coordinates: [179.1967, -8.5167],
  },
};

export function getAllFeatures(): CountryFeature[] {
  if (_allFeatures) return _allFeatures;

  const geojson = topojson.feature(
    topology,
    topology.objects.countries as GeometryCollection,
  );

  const seen = new Set<string>();

  _allFeatures = (geojson as GeoJSON.FeatureCollection).features
    // Kosovo has no ISO 3166-1 numeric code, so Natural Earth ships it with
    // none; "383" is the code the rest of the ecosystem settled on.
    .map((f) =>
      f.id == null && f.properties?.name === "Kosovo" ? { ...f, id: "383" } : f,
    )
    .filter((f) => f.id != null)
    .map((f, i) => {
      const baseId = String(f.id);
      // Deduplicate: if we've seen this ID, append an index suffix
      let uniqueId = baseId;
      if (seen.has(uniqueId)) {
        uniqueId = `${baseId}_${i}`;
      }
      seen.add(uniqueId);

      return {
        ...f,
        id: uniqueId,
        properties: {
          name: COUNTRY_NAMES[baseId] || f.properties?.name || "Unknown",
        },
      };
    }) as CountryFeature[];

  // Add synthetic Tuvalu feature
  _allFeatures.push(TUVALU_FEATURE);

  return _allFeatures;
}

/** Extract the base ISO numeric ID (strips any dedup suffix like "_42") */
export function baseId(id: string): string {
  const idx = id.indexOf("_");
  return idx === -1 ? id : id.slice(0, idx);
}

export function getGuessableCountries(): CountryData[] {
  const features = getAllFeatures();
  const seen = new Set<string>();

  return features
    .filter((f) => {
      const base = baseId(f.id);
      if (!GUESSABLE_IDS.has(base)) return false;
      // Only include the first feature per country for the guess pool
      if (seen.has(base)) return false;
      seen.add(base);
      return true;
    })
    .map((f) => {
      const base = baseId(f.id);
      return {
        id: base,
        name: COUNTRY_NAMES[base] || f.properties.name,
        feature: f,
      };
    });
}
