import {
  eciToEcf,
  eciToGeodetic,
  gstime,
  json2satrec,
  propagate,
  radiansToDegrees,
  twoline2satrec,
  type SatRec,
} from "satellite.js";

import type {
  OrbitSummary,
  OrbitalElements,
  PropagatedState,
  SpaceObject,
  Trajectory,
  Vector3,
} from "@/domain/spaceObject";
import { classifyRegime } from "@/domain/spaceObject";

const EARTH_RADIUS_KM = 6378.137;
const MU = 398600.4418; // km^3/s^2

const satrecCache = new Map<number, SatRec | null>();

function toSatrec(noradId: number, elements: OrbitalElements): SatRec | null {
  const cached = satrecCache.get(noradId);
  if (cached !== undefined) return cached;

  let rec: SatRec | null = null;
  try {
    if (elements.tleLine1 && elements.tleLine2) {
      rec = twoline2satrec(elements.tleLine1, elements.tleLine2);
    } else {
      rec = json2satrec({
        OBJECT_NAME: String(noradId),
        OBJECT_ID: String(noradId),
        EPOCH: elements.epoch.replace(/Z$/, ""),
        MEAN_MOTION: elements.meanMotion,
        ECCENTRICITY: elements.eccentricity,
        INCLINATION: elements.inclination,
        RA_OF_ASC_NODE: elements.raOfAscNode,
        ARG_OF_PERICENTER: elements.argOfPericenter,
        MEAN_ANOMALY: elements.meanAnomaly,
        NORAD_CAT_ID: noradId,
        ELEMENT_SET_NO: elements.elementSetNo ?? 999,
        BSTAR: elements.bstar,
        MEAN_MOTION_DOT: elements.meanMotionDot,
        MEAN_MOTION_DDOT: elements.meanMotionDdot,
      });
    }
  } catch {
    rec = null;
  }
  satrecCache.set(noradId, rec);
  return rec;
}

/** Derive human-facing orbit geometry straight from mean elements. */
export function summarizeOrbit(elements: OrbitalElements): OrbitSummary {
  const periodMinutes = elements.meanMotion > 0 ? 1440 / elements.meanMotion : 0;
  const periodSeconds = periodMinutes * 60;
  const semiMajorAxisKm =
    periodSeconds > 0 ? Math.cbrt((MU * periodSeconds ** 2) / (4 * Math.PI ** 2)) : 0;
  const apogeeKm = semiMajorAxisKm * (1 + elements.eccentricity) - EARTH_RADIUS_KM;
  const perigeeKm = semiMajorAxisKm * (1 - elements.eccentricity) - EARTH_RADIUS_KM;
  return {
    periodMinutes,
    semiMajorAxisKm,
    apogeeKm,
    perigeeKm,
    inclinationDeg: elements.inclination,
    regime: classifyRegime(apogeeKm, perigeeKm, periodMinutes, elements.inclination),
  };
}

export interface RawState {
  positionEcefKm: Vector3;
  velocityEcefKmS: Vector3;
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeKm: number;
  speedKmS: number;
}

/** Low-level, allocation-light propagation used by the globe render loop. */
export function propagateRaw(object: SpaceObject, time: Date): RawState | null {
  const rec = toSatrec(object.noradId, object.elements);
  if (!rec) return null;

  const pv = propagate(rec, time, { communityDecayCheckEnabled: true });
  if (!pv || !pv.position || !pv.velocity) return null;

  const gmst = gstime(time);
  const ecf = eciToEcf(pv.position, gmst);
  const vecf = eciToEcf(pv.velocity, gmst);
  const geo = eciToGeodetic(pv.position, gmst);

  const speedKmS = Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z);
  if (!Number.isFinite(ecf.x) || !Number.isFinite(geo.height)) return null;

  return {
    positionEcefKm: { x: ecf.x, y: ecf.y, z: ecf.z },
    velocityEcefKmS: { x: vecf.x, y: vecf.y, z: vecf.z },
    latitudeDeg: radiansToDegrees(geo.latitude),
    longitudeDeg: normalizeLongitude(radiansToDegrees(geo.longitude)),
    altitudeKm: geo.height,
    speedKmS,
  };
}

/** GET /state?time=... equivalent, computed client-side today. */
export function propagateState(object: SpaceObject, time: Date): PropagatedState | null {
  const raw = propagateRaw(object, time);
  if (!raw) return null;
  return {
    noradId: object.noradId,
    time: time.toISOString(),
    isEstimate: time.getTime() > Date.now(),
    ...raw,
  };
}

export interface TrajectoryOptions {
  start: Date;
  end: Date;
  /** Target number of samples; the step is derived from the window. */
  samples?: number;
}

/** GET /trajectory?start=...&end=... equivalent. Bounded by `samples`. */
export function computeTrajectory(
  object: SpaceObject,
  { start, end, samples = 240 }: TrajectoryOptions,
): Trajectory {
  const spanMs = Math.max(1000, end.getTime() - start.getTime());
  const count = Math.max(2, Math.min(samples, 1200));
  const stepMs = spanMs / count;
  const states: PropagatedState[] = [];
  for (let i = 0; i <= count; i += 1) {
    const t = new Date(start.getTime() + i * stepMs);
    const state = propagateState(object, t);
    if (state) states.push(state);
  }
  return {
    noradId: object.noradId,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    stepSeconds: stepMs / 1000,
    states,
    containsEstimates: end.getTime() > Date.now(),
  };
}

/** One full revolution centered on `time` — what the globe draws for a selection. */
export function computeOrbitTrack(object: SpaceObject, time: Date, samples = 300): Trajectory {
  const periodMs = Math.max(60_000, object.orbit.periodMinutes * 60_000);
  return computeTrajectory(object, {
    start: new Date(time.getTime() - periodMs / 2),
    end: new Date(time.getTime() + periodMs / 2),
    samples,
  });
}

export function clearPropagatorCache(): void {
  satrecCache.clear();
}

function normalizeLongitude(deg: number): number {
  let d = deg;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}
