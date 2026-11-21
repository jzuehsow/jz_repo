import { fetchPointFeed } from "@/aircraft/providers/AdsbLolProvider";
import {
  parseReadsbFeed,
  trimNearest,
  type AircraftDataProvider,
  type AircraftRegionQuery,
} from "@/aircraft/providers/AircraftDataProvider";
import type { AircraftTrack } from "@/aircraft/models/AircraftState";

/** Alternate public feed behind the same interface; swap without touching the UI. */
export const airplanesLiveProvider: AircraftDataProvider = {
  id: "airplanes.live",
  name: "Airplanes.live",
  attribution: "Live ADS-B data courtesy of Airplanes.live",
  minRefreshMs: 12_000,
  maxRadiusKm: 463,

  async fetchRegion(query: AircraftRegionQuery): Promise<AircraftTrack[]> {
    const payload = await fetchPointFeed(airplanesLiveProvider.id, query);
    return trimNearest(parseReadsbFeed(payload, airplanesLiveProvider.id), query);
  },
};
