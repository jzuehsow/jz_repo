/**
 * Core domain model for Cesium Worldbox.
 *
 * Deliberately framework-agnostic: no Cesium, React or transport concerns here.
 * Evolution path:  SpaceObject -> OrbitalElements -> PropagatedState -> Observation
 */

export type OrbitRegime = "LEO" | "MEO" | "GEO" | "HEO";

export type ObjectType = "PAYLOAD" | "ROCKET BODY" | "DEBRIS" | "UNKNOWN";

export type DataSourceKind = "celestrak" | "sample" | "rest-api" | "unknown";

/** Mean orbital elements (OMM / TLE compatible, SGP4 theory). */
export interface OrbitalElements {
  /** ISO-8601 UTC epoch of the element set. */
  epoch: string;
  /** Revolutions per day. */
  meanMotion: number;
  eccentricity: number;
  /** Degrees. */
  inclination: number;
  /** Degrees. */
  raOfAscNode: number;
  /** Degrees. */
  argOfPericenter: number;
  /** Degrees. */
  meanAnomaly: number;
  bstar: number;
  meanMotionDot: number;
  meanMotionDdot: number;
  revAtEpoch?: number | undefined;
  elementSetNo?: number | undefined;
  /** Optional raw TLE, when the upstream source provided one. */
  tleLine1?: string | undefined;
  tleLine2?: string | undefined;
}

/** Derived, human-facing orbit geometry. */
export interface OrbitSummary {
  periodMinutes: number;
  semiMajorAxisKm: number;
  apogeeKm: number;
  perigeeKm: number;
  inclinationDeg: number;
  regime: OrbitRegime;
}

export interface SpaceObject {
  /** Stable catalog key (NORAD id as string). */
  id: string;
  noradId: number;
  name: string;
  /** International designator, e.g. 2019-029A. */
  cosparId?: string | undefined;
  objectType: ObjectType;
  operator?: string | undefined;
  constellation?: string | undefined;
  countryCode?: string | undefined;
  launchDate?: string | undefined;
  elements: OrbitalElements;
  orbit: OrbitSummary;
  source: DataSourceKind;
  /** Logical model/platform family key, e.g. "satellite-starlink". Media layer resolves it. */
  modelFamily?: string | undefined;
  /** Explicit thumbnail key override; takes precedence over modelFamily. */
  thumbnailKey?: string | undefined;
}

/** A single propagated (or observed) state vector for one object. */
export interface PropagatedState {
  noradId: number;
  /** ISO-8601 UTC time the state refers to. */
  time: string;
  /** True when the time is in the future relative to wall clock: a propagated estimate. */
  isEstimate: boolean;
  /** Earth-centered, Earth-fixed position, kilometers. */
  positionEcefKm: Vector3;
  /** ECEF velocity, km/s. */
  velocityEcefKmS: Vector3;
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeKm: number;
  speedKmS: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Trajectory {
  noradId: number;
  startTime: string;
  endTime: string;
  stepSeconds: number;
  states: PropagatedState[];
  /** Any sample after wall-clock now is an estimate. */
  containsEstimates: boolean;
}

export interface CatalogFilters {
  query: string;
  regimes: OrbitRegime[];
  objectTypes: ObjectType[];
  operators: string[];
}

export const EMPTY_FILTERS: CatalogFilters = {
  query: "",
  regimes: [],
  objectTypes: [],
  operators: [],
};

export function classifyRegime(
  apogeeKm: number,
  perigeeKm: number,
  periodMinutes: number,
  inclinationDeg: number,
): OrbitRegime {
  const isNearCircular = apogeeKm - perigeeKm < 0.15 * (apogeeKm + perigeeKm);
  if (!isNearCircular && apogeeKm > 2000) return "HEO";
  if (periodMinutes > 1200 && periodMinutes < 1600 && inclinationDeg < 20) return "GEO";
  if (apogeeKm < 2000) return "LEO";
  if (apogeeKm < 35000) return "MEO";
  return "GEO";
}

export function matchesFilters(object: SpaceObject, filters: CatalogFilters): boolean {
  const q = filters.query.trim().toLowerCase();
  if (q) {
    const hit =
      object.name.toLowerCase().includes(q) ||
      String(object.noradId).includes(q) ||
      (object.cosparId?.toLowerCase().includes(q) ?? false) ||
      (object.operator?.toLowerCase().includes(q) ?? false);
    if (!hit) return false;
  }
  if (filters.regimes.length && !filters.regimes.includes(object.orbit.regime)) return false;
  if (filters.objectTypes.length && !filters.objectTypes.includes(object.objectType)) return false;
  if (filters.operators.length) {
    const key = object.constellation ?? object.operator ?? "Unknown";
    if (!filters.operators.includes(key)) return false;
  }
  return true;
}
