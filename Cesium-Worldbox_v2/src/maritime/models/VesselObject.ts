/** AIS vessel identity — deliberately separate from SpaceObject and AircraftObject. */
export type VesselCategory =
  | "CARGO"
  | "CONTAINER"
  | "TANKER"
  | "PASSENGER"
  | "CRUISE"
  | "FERRY"
  | "TUG"
  | "FISHING"
  | "PLEASURE"
  | "MILITARY_GOV"
  | "OTHER"
  | "UNKNOWN";

export interface VesselObject {
  mmsi: number;
  imo?: number | undefined;
  name?: string | undefined;
  callsign?: string | undefined;
  /** AIS ship-type code (0–99). */
  shipTypeCode?: number | undefined;
  category: VesselCategory;
  flag?: string | undefined;
  lengthM?: number | undefined;
  beamM?: number | undefined;
  draughtM?: number | undefined;
  /** Destination exactly as broadcast by the vessel. */
  destination?: string | undefined;
  /** ETA as broadcast (month/day/hour/min, UTC), ISO-ish string. */
  eta?: string | undefined;
  thumbnailKey?: string | undefined;
}

export interface VesselState {
  mmsi: number;
  latitudeDeg: number;
  longitudeDeg: number;
  speedKn?: number | undefined;
  courseDeg?: number | undefined;
  headingDeg?: number | undefined;
  navStatus?: number | undefined;
  observedAtMs: number;
  source: string;
}

export interface VesselTrack {
  object: VesselObject;
  state: VesselState;
}
