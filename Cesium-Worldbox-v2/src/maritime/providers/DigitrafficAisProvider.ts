import type { VesselObject, VesselTrack } from "@/maritime/models/VesselObject";
import { inBounds, type MaritimeDataProvider } from "@/maritime/providers/MaritimeDataProvider";
import { categorize, flagFromMmsi } from "@/maritime/services/vesselMetadataService";

const BASE =
  (import.meta.env["VITE_DIGITRAFFIC_AIS_URL"] as string | undefined) ??
  "https://meri.digitraffic.fi/api/ais/v1";

const METADATA_TTL_MS = 30 * 60_000;
const SOURCE = "Digitraffic AIS";

interface LocationFeature {
  mmsi: number;
  geometry: { coordinates: [number, number] };
  properties: { sog?: number; cog?: number; heading?: number; navStat?: number; timestampExternal?: number };
}

interface VesselMeta {
  mmsi: number;
  name?: string;
  callSign?: string;
  imo?: number;
  shipType?: number;
  destination?: string;
  draught?: number;
  eta?: number;
  referencePointA?: number;
  referencePointB?: number;
  referencePointC?: number;
  referencePointD?: number;
}

function decodeEta(eta: number | undefined): string | undefined {
  if (!eta) return undefined;
  const month = (eta >> 16) & 0xf;
  const day = (eta >> 11) & 0x1f;
  const hour = (eta >> 6) & 0x1f;
  const minute = eta & 0x3f;
  if (!month || !day || hour > 23 || minute > 59) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)} UTC`;
}

/**
 * Fintraffic Digitraffic open AIS (CC BY 4.0, no key). Coverage: Baltic Sea.
 * Positions are fetched incrementally (`from=`) after the first snapshot.
 */
class DigitrafficAisProvider implements MaritimeDataProvider {
  capabilities = {
    id: "digitraffic",
    name: "Fintraffic Digitraffic",
    coverage: "Baltic Sea & Gulf of Finland",
    attribution: "AIS data © Fintraffic / digitraffic.fi, CC BY 4.0",
    license: "CC BY 4.0",
    sourceUrl: "https://www.digitraffic.fi/en/marine-traffic/",
    requiresCredentials: false,
    minRefreshMs: 60_000,
  };

  private positions = new Map<number, LocationFeature>();
  private lastFetch = 0;
  private metadata = new Map<number, VesselMeta>();
  private metadataAt = 0;

  private async loadMetadata(signal: AbortSignal) {
    if (Date.now() - this.metadataAt < METADATA_TTL_MS) return;
    const response = await fetch(`${BASE}/vessels`, { signal });
    if (!response.ok) throw new Error(`Digitraffic vessels ${response.status}`);
    const list = (await response.json()) as VesselMeta[];
    this.metadata = new Map(list.map((v) => [v.mmsi, v]));
    this.metadataAt = Date.now();
  }

  private toObject(mmsi: number): VesselObject {
    const meta = this.metadata.get(mmsi);
    const name = meta?.name?.trim() || undefined;
    const length = (meta?.referencePointA ?? 0) + (meta?.referencePointB ?? 0);
    const beam = (meta?.referencePointC ?? 0) + (meta?.referencePointD ?? 0);
    return {
      mmsi,
      imo: meta?.imo || undefined,
      name,
      callsign: meta?.callSign?.trim() || undefined,
      shipTypeCode: meta?.shipType,
      category: categorize(meta?.shipType, name),
      flag: flagFromMmsi(mmsi),
      lengthM: length > 0 ? length : undefined,
      beamM: beam > 0 ? beam : undefined,
      draughtM: meta?.draught ? meta.draught / 10 : undefined,
      destination: meta?.destination?.trim() || undefined,
      eta: decodeEta(meta?.eta),
    };
  }

  async fetchRegion({ bounds, limit, signal }: Parameters<MaritimeDataProvider["fetchRegion"]>[0]) {
    const metadataLoad = this.loadMetadata(signal).catch((cause) => {
      if (this.metadata.size === 0) console.warn("[maritime] metadata unavailable", cause);
    });
    const since = this.lastFetch ? `?from=${this.lastFetch - 120_000}` : "";
    const requestedAt = Date.now();
    const response = await fetch(`${BASE}/locations${since}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]) });
    if (response.status === 429) throw new Error("Digitraffic rate limit reached.");
    if (!response.ok) throw new Error(`Digitraffic responded ${response.status}`);
    const json = (await response.json()) as { features?: LocationFeature[] };
    for (const feature of json.features ?? []) this.positions.set(feature.mmsi, feature);
    this.lastFetch = requestedAt;
    await metadataLoad;

    const tracks: VesselTrack[] = [];
    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLon = (bounds.west + bounds.east) / 2;
    for (const feature of this.positions.values()) {
      const [lon, lat] = feature.geometry.coordinates;
      if (!inBounds(lat, lon, bounds)) continue;
      const p = feature.properties;
      tracks.push({
        object: this.toObject(feature.mmsi),
        state: {
          mmsi: feature.mmsi,
          latitudeDeg: lat,
          longitudeDeg: lon,
          speedKn: p.sog !== undefined && p.sog < 102.3 ? p.sog : undefined,
          courseDeg: p.cog !== undefined && p.cog < 360 ? p.cog : undefined,
          headingDeg: p.heading !== undefined && p.heading < 360 ? p.heading : undefined,
          navStatus: p.navStat,
          observedAtMs: p.timestampExternal ?? requestedAt,
          source: SOURCE,
        },
      });
    }
    if (tracks.length > limit) {
      tracks.sort(
        (a, b) =>
          Math.hypot(a.state.latitudeDeg - centerLat, a.state.longitudeDeg - centerLon) -
          Math.hypot(b.state.latitudeDeg - centerLat, b.state.longitudeDeg - centerLon),
      );
      tracks.length = limit;
    }
    return tracks;
  }
}

export const digitrafficAisProvider = new DigitrafficAisProvider();
