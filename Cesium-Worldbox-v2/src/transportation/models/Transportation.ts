/** Static reference models — independent of live aircraft / vessel data. */

export type AirportClass = "LARGE" | "MEDIUM" | "SMALL";

export interface ReferenceAirport {
  name: string;
  iata?: string | undefined;
  icao?: string | undefined;
  latitudeDeg: number;
  longitudeDeg: number;
  elevationFt: number | null;
  municipality?: string | undefined;
  region?: string | undefined;
  countryIso2?: string | undefined;
  airportClass: AirportClass;
}

export interface ReferencePort {
  name: string;
  unlocode?: string | undefined;
  country?: string | undefined;
  latitudeDeg: number;
  longitudeDeg: number;
  /** Lower = more important (Natural Earth scalerank). */
  rank: number;
}

export interface ReferenceFlightRoute {
  fromIata: string;
  toIata: string;
  from: { latitudeDeg: number; longitudeDeg: number };
  to: { latitudeDeg: number; longitudeDeg: number };
  /** Number of airlines historically operating the pair (importance proxy). */
  airlineCount: number;
}

export type ShippingLaneClass = "MAJOR" | "MIDDLE" | "MINOR";

export interface ShippingLane {
  laneClass: ShippingLaneClass;
  /** [lon, lat] vertices. */
  coordinates: number[][];
}

export interface DatasetInfo {
  source: string;
  version: string;
  license: string;
  disclaimer?: string | undefined;
}
