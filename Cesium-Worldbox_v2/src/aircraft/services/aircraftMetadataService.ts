import { AIRCRAFT_TYPES, GENERIC_AIRLINER } from "@/aircraft/data/aircraftTypes";
import type { AircraftTrack } from "@/aircraft/models/AircraftState";
import type { AircraftTypeMetadata, ResolvedAltitude } from "@/aircraft/models/AircraftTypeMetadata";

export function getTypeMetadata(typeCode: string | undefined): AircraftTypeMetadata | null {
  if (!typeCode) return null;
  return AIRCRAFT_TYPES[typeCode.toUpperCase()] ?? null;
}

const CRUISE_SPEED_FRACTION = 0.75;

/**
 * Reported altitude wins. Otherwise estimate cruise altitude only when the
 * aircraft is clearly airborne and at cruise speed; never for ground/slow traffic.
 */
export function resolveAltitude(track: AircraftTrack): ResolvedAltitude {
  const { state, object } = track;
  if (state.onGround) return { altitudeFt: 0, source: "ON_GROUND" };
  if (state.altitudeFt !== undefined) return { altitudeFt: state.altitudeFt, source: "REPORTED" };

  const speed = state.groundSpeedKt;
  const known = getTypeMetadata(object.typeCode);
  const meta = known ?? GENERIC_AIRLINER;
  if (speed === undefined || speed < meta.cruiseSpeedKt * CRUISE_SPEED_FRACTION) {
    return { altitudeFt: null, source: "UNAVAILABLE" };
  }
  return {
    altitudeFt: Math.round(meta.cruiseAltitudeFt / 1000) * 1000,
    source: "ESTIMATED",
    note: known ? `typical ${meta.model} cruise` : "generic airliner cruise",
  };
}
