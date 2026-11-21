import type { Airport } from "@/aircraft/models/AircraftRoute";

export interface RouteLookup {
  callsign: string;
  origin: Airport | null;
  destination: Airport | null;
  plausible: boolean;
  source: string;
}

/** Replaceable route source; a future flight-plan provider can add waypoints. */
export interface AircraftRouteProvider {
  id: string;
  name: string;
  lookup(callsign: string, lat: number, lon: number, signal: AbortSignal): Promise<RouteLookup | null>;
}

const ROUTE_URL =
  (import.meta.env["VITE_AIRCRAFT_ROUTE_URL"] as string | undefined) ?? "/api/aircraft-route";

interface RawAirport {
  name?: string;
  icao?: string;
  iata?: string;
  location?: string;
  countryiso2?: string;
  lat?: number;
  lon?: number;
}

function toAirport(raw: RawAirport | undefined): Airport | null {
  if (!raw || typeof raw.lat !== "number" || typeof raw.lon !== "number") return null;
  return {
    name: raw.name ?? raw.icao ?? "Airport",
    icao: raw.icao,
    iata: raw.iata,
    city: raw.location,
    countryIso2: raw.countryiso2,
    latitudeDeg: raw.lat,
    longitudeDeg: raw.lon,
  };
}

/** ADSB.lol / adsb.im route set (ODbL, VRS standing data). */
export const adsbRouteProvider: AircraftRouteProvider = {
  id: "adsb-routeset",
  name: "ADSB.lol route database (ODbL)",
  async lookup(callsign, lat, lon, signal) {
    const response = await fetch(ROUTE_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ callsign, lat, lon }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]),
    });
    if (!response.ok) throw new Error(`Route lookup ${response.status}`);
    const json = (await response.json()) as Array<{ _airports?: RawAirport[]; plausible?: boolean }>;
    const entry = Array.isArray(json) ? json[0] : undefined;
    const airports = entry?._airports ?? [];
    if (airports.length < 2) return null;
    return {
      callsign,
      origin: toAirport(airports[0]),
      destination: toAirport(airports[airports.length - 1]),
      plausible: entry?.plausible !== false,
      source: this.name,
    };
  },
};

const cache = new Map<string, RouteLookup | null>();
const inflight = new Map<string, Promise<RouteLookup | null>>();

export function getCachedRoute(callsign: string): RouteLookup | null | undefined {
  return cache.get(callsign);
}

/** Cached per callsign; only ever called for the selected aircraft. */
export function lookupRoute(
  callsign: string,
  lat: number,
  lon: number,
  provider: AircraftRouteProvider = adsbRouteProvider,
): Promise<RouteLookup | null> {
  const key = callsign.trim().toUpperCase();
  if (cache.has(key)) return Promise.resolve(cache.get(key) ?? null);
  const pending = inflight.get(key);
  if (pending) return pending;
  const request = provider
    .lookup(key, lat, lon, new AbortController().signal)
    .then((result) => {
      cache.set(key, result);
      return result;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, request);
  return request;
}

/** Geodesic samples between two points (visual approximation only). */
export function greatCircle(
  from: { latitudeDeg: number; longitudeDeg: number },
  to: { latitudeDeg: number; longitudeDeg: number },
  segments = 64,
): Array<{ latitudeDeg: number; longitudeDeg: number }> {
  const rad = Math.PI / 180;
  const φ1 = from.latitudeDeg * rad;
  const λ1 = from.longitudeDeg * rad;
  const φ2 = to.latitudeDeg * rad;
  const λ2 = to.longitudeDeg * rad;
  const d =
    2 *
    Math.asin(
      Math.sqrt(Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2),
    );
  if (d === 0) return [from, to];
  const out: Array<{ latitudeDeg: number; longitudeDeg: number }> = [];
  for (let i = 0; i <= segments; i += 1) {
    const f = i / segments;
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);
    const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
    const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
    const z = a * Math.sin(φ1) + b * Math.sin(φ2);
    out.push({ latitudeDeg: Math.atan2(z, Math.hypot(x, y)) / rad, longitudeDeg: Math.atan2(y, x) / rad });
  }
  return out;
}
