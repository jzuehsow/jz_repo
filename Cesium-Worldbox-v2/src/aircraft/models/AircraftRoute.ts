export interface AircraftTrackPoint {
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeFt: number | null;
  observedAtMs: number;
}

export interface Airport {
  name: string;
  icao?: string | undefined;
  iata?: string | undefined;
  city?: string | undefined;
  countryIso2?: string | undefined;
  latitudeDeg: number;
  longitudeDeg: number;
}

export interface AircraftRoute {
  aircraftId: string;
  callsign: string;
  originAirport: Airport | null;
  destinationAirport: Airport | null;
  /** Real reported positions only. */
  historicalTrackPoints: AircraftTrackPoint[];
  /** Visual approximation (geodesic to destination) — never navigation telemetry. */
  estimatedFuturePoints: AircraftTrackPoint[];
  routeSource: string;
  observedThrough: number | null;
  isEstimated: boolean;
  /** Provider flagged the callsign/route pairing as plausible for this position. */
  plausible?: boolean | undefined;
}
