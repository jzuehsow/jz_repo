/**
 * Placeholder observation layer.
 *
 * Nothing consumes these yet; they exist so radar/optical tracks, uncertainty,
 * conjunction screening, maneuver detection, sensor models and historical
 * archives can be layered on without reshaping the core domain.
 */

import type { Vector3 } from "./spaceObject";

export type SensorKind = "RADAR" | "OPTICAL" | "RF" | "SPACE_BASED" | "OTHER";

export interface Sensor {
  id: string;
  name: string;
  kind: SensorKind;
  latitudeDeg?: number | undefined;
  longitudeDeg?: number | undefined;
  altitudeKm?: number | undefined;
}

/** 3x3 position covariance in the RIC frame, km^2. Optional for now. */
export type Covariance3 = [number, number, number, number, number, number, number, number, number];

export interface Observation {
  id: string;
  noradId: number;
  sensorId: string;
  /** ISO-8601 UTC. */
  time: string;
  /** Measured or inferred ECEF position, km, when available. */
  positionEcefKm?: Vector3 | undefined;
  rangeKm?: number | undefined;
  azimuthDeg?: number | undefined;
  elevationDeg?: number | undefined;
  rangeRateKmS?: number | undefined;
  covariance?: Covariance3 | undefined;
  residualsKm?: number | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface ConjunctionEvent {
  id: string;
  primaryNoradId: number;
  secondaryNoradId: number;
  timeOfClosestApproach: string;
  missDistanceKm: number;
  probabilityOfCollision?: number | undefined;
}

export interface ManeuverEvent {
  id: string;
  noradId: number;
  detectedAt: string;
  deltaVMetersPerSecond?: number | undefined;
  confidence?: number | undefined;
}

/** Future data providers can implement this without touching the catalog provider. */
export interface ObservationProvider {
  readonly id: string;
  listObservations(noradId: number, startTime: string, endTime: string): Promise<Observation[]>;
  listSensors?(): Promise<Sensor[]>;
}
