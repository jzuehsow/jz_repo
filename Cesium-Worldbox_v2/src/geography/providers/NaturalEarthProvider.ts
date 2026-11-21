import { loadStaticJson } from "@/lib/staticData";
import type { GeographyProvider } from "@/geography/providers/GeographyProvider";
import type { PopulatedPlaceRole } from "@/geography/models/Geography";

const ROLES: PopulatedPlaceRole[] = ["NATIONAL_CAPITAL", "REGIONAL_CAPITAL", "CITY"];

/** Natural Earth 110m / 50m (public domain), pre-simplified under /data/geo. */
export const naturalEarthProvider: GeographyProvider = {
  info: { source: "Natural Earth", version: "5.x (110m / 50m / 10m places)", license: "Public domain" },
  async countryBoundaries(detail, signal) {
    const scale = detail === "LOW" ? "110" : "50";
    // Shared land borders plus coastlines form the full country outlines.
    // Keep both datasets at the same resolution and under the same toggle.
    const [borders, coastlines] = await Promise.all([
      loadStaticJson<number[][][]>(`/data/geo/borders${scale}.json`, signal),
      loadStaticJson<number[][][]>(`/data/geo/coastlines${scale}.json`, signal),
    ]);
    return [...borders, ...coastlines];
  },
  adminBoundaries: (signal) => loadStaticJson("/data/geo/admin1lines.json", signal),
  async countries(signal) {
    const rows = await loadStaticJson<Array<[string, number, number, number]>>("/data/geo/countries.json", signal);
    return rows.map((r) => ({ name: r[0], labelLatitudeDeg: r[1], labelLongitudeDeg: r[2], labelRank: r[3] }));
  },
  async adminRegions(signal) {
    const rows = await loadStaticJson<Array<[string, number, number, number, string, string]>>(
      "/data/geo/admin1.json",
      signal,
    );
    return rows.map((r) => ({
      name: r[0],
      labelLatitudeDeg: r[1],
      labelLongitudeDeg: r[2],
      labelRank: r[3],
      kind: r[4],
      countryIso2: r[5],
    }));
  },
  async populatedPlaces(signal) {
    const rows = await loadStaticJson<Array<[string, number, number, 0 | 1 | 2, number, number]>>(
      "/data/geo/cities.json",
      signal,
    );
    return rows.map((r) => ({
      name: r[0],
      latitudeDeg: r[1],
      longitudeDeg: r[2],
      role: ROLES[r[3]]!,
      population: r[4],
      scaleRank: r[5],
    }));
  },
};
