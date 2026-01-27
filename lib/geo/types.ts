import type { Feature, Polygon, MultiPolygon } from "geojson";

export interface CountryFeature extends Feature<Polygon | MultiPolygon> {
  id: string;
  properties: { name: string };
}

export interface CountryData {
  id: string;
  name: string;
  feature: CountryFeature;
}
