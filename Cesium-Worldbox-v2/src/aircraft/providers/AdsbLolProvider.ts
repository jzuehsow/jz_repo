import {
  kmToNauticalMiles,
  parseReadsbFeed,
  trimNearest,
  type AircraftDataProvider,
  type AircraftRegionQuery,
} from "@/aircraft/providers/AircraftDataProvider";
import type { AircraftTrack } from "@/aircraft/models/AircraftState";

/**
 * Relay base. Defaults to this app's own same-origin route; a host embedding the
 * UI elsewhere can point it at their own gateway with VITE_AIRCRAFT_API_BASE_URL.
 */
export const AIRCRAFT_API_BASE =
  (import.meta.env["VITE_AIRCRAFT_API_BASE_URL"] as string | undefined) ?? "/api/aircraft";

export async function fetchPointFeed(
  source: string,
  query: AircraftRegionQuery,
): Promise<unknown> {
  const radiusNm = Math.max(1, Math.min(250, Math.round(kmToNauticalMiles(query.radiusKm))));
  const url = `${AIRCRAFT_API_BASE}?source=${encodeURIComponent(source)}&lat=${query.latitudeDeg.toFixed(4)}&lon=${query.longitudeDeg.toFixed(4)}&radiusNm=${radiusNm}`;
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    ...(query.signal ? { signal: query.signal } : {}),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = (payload as { error?: string } | null)?.error;
    throw new Error(detail ?? `${source} responded ${response.status}`);
  }
  return payload;
}

/**
 * ADSB.lol — community-run, openly licensed feed (ODbL). Default because its
 * terms do not restrict operational use the way the OpenSky REST API does.
 */
export const adsbLolProvider: AircraftDataProvider = {
  id: "adsb.lol",
  name: "ADSB.lol",
  attribution: "Live ADS-B data © ADSB.lol contributors (ODbL)",
  minRefreshMs: 10_000,
  maxRadiusKm: 463,

  async fetchRegion(query: AircraftRegionQuery): Promise<AircraftTrack[]> {
    const payload = await fetchPointFeed(adsbLolProvider.id, query);
    return trimNearest(parseReadsbFeed(payload, adsbLolProvider.id), query);
  },
};
