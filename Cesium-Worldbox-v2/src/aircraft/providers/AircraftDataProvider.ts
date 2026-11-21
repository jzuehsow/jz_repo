import type { AircraftTrack } from "@/aircraft/models/AircraftState";

export interface AircraftRegionQuery {
  latitudeDeg: number;
  longitudeDeg: number;
  /** Search radius in kilometers (providers cap this, typically ~463 km / 250 NM). */
  radiusKm: number;
  /** Maximum tracks to return; the provider trims nearest-first. */
  limit: number;
  signal?: AbortSignal | undefined;
}

/**
 * Transport abstraction over an ADS-B feed. The Cesium layer never knows which
 * implementation supplies the data.
 */
export interface AircraftDataProvider {
  id: string;
  name: string;
  attribution: string;
  /** Minimum polite refresh interval in ms. */
  minRefreshMs: number;
  maxRadiusKm: number;
  fetchRegion(query: AircraftRegionQuery): Promise<AircraftTrack[]>;
}

const KM_PER_NM = 1.852;

export function kmToNauticalMiles(km: number): number {
  return km / KM_PER_NM;
}

interface RawAircraft {
  hex?: unknown;
  flight?: unknown;
  r?: unknown;
  t?: unknown;
  desc?: unknown;
  ownOp?: unknown;
  lat?: unknown;
  lon?: unknown;
  alt_baro?: unknown;
  alt_geom?: unknown;
  gs?: unknown;
  track?: unknown;
  true_heading?: unknown;
  baro_rate?: unknown;
  geom_rate?: unknown;
  squawk?: unknown;
  seen_pos?: unknown;
}

function numeric(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * readsb/tar1090-style JSON is shared by ADSB.lol and Airplanes.live, so both
 * providers reuse this parser.
 */
export function parseReadsbFeed(payload: unknown, sourceId: string): AircraftTrack[] {
  const list = (payload as { ac?: unknown; aircraft?: unknown } | null)?.ac ??
    (payload as { aircraft?: unknown } | null)?.aircraft;
  if (!Array.isArray(list)) return [];
  const now = Date.now();
  const tracks: AircraftTrack[] = [];

  for (const item of list as RawAircraft[]) {
    const icaoHex = text(item.hex)?.toLowerCase();
    const latitudeDeg = numeric(item.lat);
    const longitudeDeg = numeric(item.lon);
    if (!icaoHex || latitudeDeg === undefined || longitudeDeg === undefined) continue;

    const groundFlag = item.alt_baro === "ground";
    const altitudeFt = groundFlag ? undefined : (numeric(item.alt_baro) ?? numeric(item.alt_geom));
    const seenPos = numeric(item.seen_pos) ?? 0;

    tracks.push({
      object: {
        icaoHex,
        callsign: text(item.flight),
        registration: text(item.r),
        typeCode: text(item.t),
        typeName: text(item.desc),
        operator: text(item.ownOp),
      },
      state: {
        icaoHex,
        latitudeDeg,
        longitudeDeg,
        altitudeFt,
        onGround: groundFlag,
        groundSpeedKt: numeric(item.gs),
        trackDeg: numeric(item.track) ?? numeric(item.true_heading),
        verticalRateFpm: numeric(item.baro_rate) ?? numeric(item.geom_rate),
        squawk: text(item.squawk),
        observedAtMs: now - Math.max(0, seenPos) * 1000,
        source: sourceId,
      },
    });
  }
  return tracks;
}

/** Great-circle distance in km, used to trim to the nearest N aircraft. */
export function distanceKm(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLon = (bLon - aLon) * toRad;
  const lat1 = aLat * toRad;
  const lat2 = bLat * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function trimNearest(
  tracks: AircraftTrack[],
  query: AircraftRegionQuery,
): AircraftTrack[] {
  if (tracks.length <= query.limit) return tracks;
  return [...tracks]
    .sort(
      (a, b) =>
        distanceKm(query.latitudeDeg, query.longitudeDeg, a.state.latitudeDeg, a.state.longitudeDeg) -
        distanceKm(query.latitudeDeg, query.longitudeDeg, b.state.latitudeDeg, b.state.longitudeDeg),
    )
    .slice(0, query.limit);
}
