import type { OrbitalElements, SpaceObject } from "@/domain/spaceObject";

/**
 * Transport-neutral catalog boundary.
 *
 * Cesium and the UI only ever see this interface, so the backing store can be
 * CelesTrak, bundled sample data, a REST API, or a future ingestion service.
 */
export interface SpaceObjectProvider {
  readonly id: string;
  readonly label: string;
  /** GET /api/space-objects */
  listSpaceObjects(options?: ListOptions): Promise<SpaceObject[]>;
  /** GET /api/space-objects/{noradId} */
  getSpaceObject?(noradId: number): Promise<SpaceObject | null>;
}

export interface ListOptions {
  /** Soft cap on returned objects; providers should respect it for bounded work. */
  limit?: number | undefined;
  signal?: AbortSignal | undefined;
}

/** Raw CelesTrak-compatible OMM record (also what /api/space-objects could return). */
export interface OmmRecord {
  OBJECT_NAME: string;
  OBJECT_ID?: string | undefined;
  EPOCH: string;
  MEAN_MOTION: number | string;
  ECCENTRICITY: number | string;
  INCLINATION: number | string;
  RA_OF_ASC_NODE: number | string;
  ARG_OF_PERICENTER: number | string;
  MEAN_ANOMALY: number | string;
  NORAD_CAT_ID: number | string;
  BSTAR: number | string;
  MEAN_MOTION_DOT: number | string;
  MEAN_MOTION_DDOT: number | string;
  REV_AT_EPOCH?: number | string | undefined;
  ELEMENT_SET_NO?: number | string | undefined;
  OBJECT_TYPE?: string | undefined;
  COUNTRY_CODE?: string | undefined;
  LAUNCH_DATE?: string | undefined;
  [key: string]: unknown;
}

export function num(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

export function ommToElements(record: OmmRecord): OrbitalElements {
  return {
    epoch: normalizeEpoch(record.EPOCH),
    meanMotion: num(record.MEAN_MOTION),
    eccentricity: num(record.ECCENTRICITY),
    inclination: num(record.INCLINATION),
    raOfAscNode: num(record.RA_OF_ASC_NODE),
    argOfPericenter: num(record.ARG_OF_PERICENTER),
    meanAnomaly: num(record.MEAN_ANOMALY),
    bstar: num(record.BSTAR),
    meanMotionDot: num(record.MEAN_MOTION_DOT),
    meanMotionDdot: num(record.MEAN_MOTION_DDOT),
    revAtEpoch: record.REV_AT_EPOCH === undefined ? undefined : num(record.REV_AT_EPOCH),
    elementSetNo: record.ELEMENT_SET_NO === undefined ? undefined : num(record.ELEMENT_SET_NO, 999),
  };
}

function normalizeEpoch(epoch: string): string {
  const withZone = /(Z|[+-]\d{2}:?\d{2})$/.test(epoch) ? epoch : `${epoch}Z`;
  const date = new Date(withZone);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}
