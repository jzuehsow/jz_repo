/** Representative per-type data. Plain config: edit src/aircraft/data/aircraftTypes.ts. */
export interface AircraftTypeMetadata {
  icaoType: string;
  manufacturer: string;
  model: string;
  /** Typical cruise altitude in feet (used only as a labelled estimate). */
  cruiseAltitudeFt: number;
  /** Typical cruise ground speed in knots. */
  cruiseSpeedKt: number;
  thumbnailKey?: string | undefined;
}

export type AltitudeSource = "REPORTED" | "ESTIMATED" | "ON_GROUND" | "UNAVAILABLE";

export interface ResolvedAltitude {
  altitudeFt: number | null;
  source: AltitudeSource;
  note?: string | undefined;
}
