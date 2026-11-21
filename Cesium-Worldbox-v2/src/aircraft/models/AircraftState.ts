/** A live ADS-B observation. Never propagated into the future. */
export interface AircraftState {
  icaoHex: string;
  latitudeDeg: number;
  longitudeDeg: number;
  /** Barometric or geometric altitude, feet. Undefined when on ground/unknown. */
  altitudeFt?: number | undefined;
  onGround: boolean;
  groundSpeedKt?: number | undefined;
  /** True track over ground, degrees clockwise from north. */
  trackDeg?: number | undefined;
  verticalRateFpm?: number | undefined;
  squawk?: string | undefined;
  /** Observation time (ms since epoch, UTC). */
  observedAtMs: number;
  /** Provider id that supplied the observation. */
  source: string;
}

export interface AircraftTrack {
  object: import("./AircraftObject").AircraftObject;
  state: AircraftState;
}
