/**
 * Shared selection abstraction. Satellites and aircraft keep separate domain
 * models; only the UI's "what is selected" concern is unified here.
 */
export type TrackableKind = "SPACE_OBJECT" | "AIRCRAFT" | "VESSEL";

export interface TrackableRef {
  kind: TrackableKind;
  /** NORAD id as string for space objects, ICAO hex for aircraft, MMSI for vessels. */
  id: string;
}

export function spaceObjectRef(noradId: number): TrackableRef {
  return { kind: "SPACE_OBJECT", id: String(noradId) };
}

export function aircraftRef(icaoHex: string): TrackableRef {
  return { kind: "AIRCRAFT", id: icaoHex };
}

export function vesselRef(mmsi: number): TrackableRef {
  return { kind: "VESSEL", id: String(mmsi) };
}
