/**
 * Aircraft identity. Deliberately separate from the satellite SpaceObject
 * model — the two share only the TrackableRef selection abstraction.
 */
export interface AircraftObject {
  /** ICAO 24-bit hex address, lowercase. Stable key. */
  icaoHex: string;
  callsign?: string | undefined;
  registration?: string | undefined;
  /** ICAO type designator, e.g. A320, B738. */
  typeCode?: string | undefined;
  /** Human-readable type/model when the feed supplies one. */
  typeName?: string | undefined;
  operator?: string | undefined;
  /** Resolved family key used for thumbnails, e.g. "aircraft-a320-family". */
  modelFamily?: string | undefined;
}
