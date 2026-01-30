import type { Feature, Polygon, MultiPolygon, Point } from "geojson";

export interface CountryFeature extends Feature<Polygon | MultiPolygon | Point> {
  id: string;
  properties: { name: string };
}

export interface CountryData {
  id: string;
  name: string;
  feature: CountryFeature;
}
