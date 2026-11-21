/** Provider-agnostic geographic reference models. */

export interface Country {
  name: string;
  labelLatitudeDeg: number;
  labelLongitudeDeg: number;
  /** Lower = more prominent. */
  labelRank: number;
}

/** First-level subdivision; `kind` is the provider's term (State, Province, Territory…). */
export interface AdministrativeRegion {
  name: string;
  kind: string;
  countryIso2?: string | undefined;
  labelLatitudeDeg: number;
  labelLongitudeDeg: number;
  labelRank: number;
}

export type PopulatedPlaceRole = "NATIONAL_CAPITAL" | "REGIONAL_CAPITAL" | "CITY";

export interface PopulatedPlace {
  name: string;
  latitudeDeg: number;
  longitudeDeg: number;
  role: PopulatedPlaceRole;
  population: number;
  scaleRank: number;
}

/** Boundary polylines as [lon, lat] vertex arrays. */
export type BoundaryLines = number[][][];

export type BoundaryDetail = "LOW" | "MEDIUM";
