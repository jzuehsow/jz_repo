/**
 * Swappable reference-data providers. Defaults read small, pre-simplified
 * open datasets bundled under /data; replace with REST-backed providers later.
 */
import { loadStaticJson } from "@/lib/staticData";
import type {
  AirportClass,
  DatasetInfo,
  ReferenceAirport,
  ReferenceFlightRoute,
  ReferencePort,
  ShippingLane,
  ShippingLaneClass,
} from "@/transportation/models/Transportation";

export interface AirportProvider {
  info: DatasetInfo;
  load(signal?: AbortSignal): Promise<ReferenceAirport[]>;
}
export interface PortProvider {
  info: DatasetInfo;
  load(signal?: AbortSignal): Promise<ReferencePort[]>;
}
export interface FlightRouteProvider {
  info: DatasetInfo;
  load(signal?: AbortSignal): Promise<ReferenceFlightRoute[]>;
}
export interface ShippingLaneProvider {
  info: DatasetInfo;
  load(signal?: AbortSignal): Promise<ShippingLane[]>;
}

type AirportRow = [string, string, string, number, number, number | null, string, string, string, 0 | 1 | 2];
const CLASSES: AirportClass[] = ["LARGE", "MEDIUM", "SMALL"];

export const ourAirportsProvider: AirportProvider = {
  info: { source: "OurAirports", version: "2026 snapshot", license: "Public domain" },
  async load(signal) {
    const rows = await loadStaticJson<AirportRow[]>("/data/airports/airports.json", signal);
    return rows.map((r) => ({
      name: r[0],
      iata: r[1] || undefined,
      icao: r[2] || undefined,
      latitudeDeg: r[3],
      longitudeDeg: r[4],
      elevationFt: r[5],
      municipality: r[6] || undefined,
      region: r[7] || undefined,
      countryIso2: r[8] || undefined,
      airportClass: CLASSES[r[9]]!,
    }));
  },
};

export const naturalEarthPortProvider: PortProvider = {
  info: { source: "Natural Earth 10m ports", version: "5.x", license: "Public domain" },
  async load(signal) {
    const rows = await loadStaticJson<Array<[string, number, number, number]>>("/data/ports/ports.json", signal);
    return rows.map((r) => ({ name: r[0], latitudeDeg: r[1], longitudeDeg: r[2], rank: r[3] }));
  },
};

export const openFlightsRouteProvider: FlightRouteProvider = {
  info: {
    source: "OpenFlights route database",
    version: "June 2014",
    license: "ODbL 1.0",
    disclaimer: "Reference connectivity only — not live ATC routes, flight plans, airways, or current schedules.",
  },
  async load(signal) {
    const rows = await loadStaticJson<Array<[string, string, number, number, number, number, number]>>(
      "/data/routes/routes.json",
      signal,
    );
    return rows.map((r) => ({
      fromIata: r[0],
      toIata: r[1],
      from: { latitudeDeg: r[2], longitudeDeg: r[3] },
      to: { latitudeDeg: r[4], longitudeDeg: r[5] },
      airlineCount: r[6],
    }));
  },
};

export const globalShippingLanesProvider: ShippingLaneProvider = {
  info: { source: "Global Shipping Lanes (Benden, Zenodo)", version: "v1", license: "CC BY 4.0" },
  async load(signal) {
    const data = await loadStaticJson<Record<string, number[][][]>>("/data/lanes/lanes.json", signal);
    const map: Record<string, ShippingLaneClass> = { Major: "MAJOR", Middle: "MIDDLE", Minor: "MINOR" };
    const lanes: ShippingLane[] = [];
    for (const [type, lines] of Object.entries(data)) {
      const laneClass = map[type];
      if (!laneClass) continue;
      for (const coordinates of lines) lanes.push({ laneClass, coordinates });
    }
    return lanes;
  },
};

/** Loose destination-text match against the reference port list (never used to infer origin). */
export async function findPortByName(text: string, signal?: AbortSignal): Promise<ReferencePort | null> {
  const needle = text.trim().toUpperCase();
  if (needle.length < 3) return null;
  const ports = await naturalEarthPortProvider.load(signal);
  return (
    ports.find((p) => p.name.toUpperCase() === needle) ??
    ports.find((p) => p.name.length >= 4 && needle.includes(p.name.toUpperCase())) ??
    null
  );
}
