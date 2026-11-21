import type { VesselTrack } from "@/maritime/models/VesselObject";
import type { MaritimeDataProvider } from "@/maritime/providers/MaritimeDataProvider";

const RELAY =
  (import.meta.env["VITE_VESSEL_API_BASE_URL"] as string | undefined) ?? "/api/vessels";

/**
 * AISStream.io (global, free API key). The key never reaches the browser: the
 * same-origin relay holds AISSTREAM_API_KEY and returns a short snapshot.
 */
export const aisStreamProvider: MaritimeDataProvider = {
  capabilities: {
    id: "aisstream",
    name: "AISStream.io",
    coverage: "Global (terrestrial AIS network)",
    attribution: "AIS data via AISStream.io",
    license: "AISStream.io terms of service",
    sourceUrl: "https://aisstream.io/",
    requiresCredentials: true,
    minRefreshMs: 60_000,
  },
  async fetchRegion({ bounds, limit, signal }) {
    const params = new URLSearchParams({
      west: bounds.west.toFixed(3),
      south: bounds.south.toFixed(3),
      east: bounds.east.toFixed(3),
      north: bounds.north.toFixed(3),
      limit: String(limit),
    });
    const response = await fetch(`${RELAY}?${params.toString()}`, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
    });
    if (response.status === 501) throw new Error("Needs API key (AISSTREAM_API_KEY).");
    if (!response.ok) throw new Error(`Vessel relay responded ${response.status}`);
    const json = (await response.json()) as { vessels?: VesselTrack[] };
    return json.vessels ?? [];
  },
};
