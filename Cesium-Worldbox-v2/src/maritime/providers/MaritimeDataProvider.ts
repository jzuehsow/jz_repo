import type { VesselTrack } from "@/maritime/models/VesselObject";

export interface MaritimeBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface MaritimeProviderCapabilities {
  id: string;
  name: string;
  coverage: string;
  attribution: string;
  license: string;
  sourceUrl: string;
  requiresCredentials: boolean;
  minRefreshMs: number;
}

/** Swappable AIS source. Cesium rendering never imports a concrete provider. */
export interface MaritimeDataProvider {
  capabilities: MaritimeProviderCapabilities;
  fetchRegion(request: { bounds: MaritimeBounds; limit: number; signal: AbortSignal }): Promise<VesselTrack[]>;
}

export function inBounds(lat: number, lon: number, b: MaritimeBounds): boolean {
  if (lat < b.south || lat > b.north) return false;
  if (b.west <= b.east) return lon >= b.west && lon <= b.east;
  return lon >= b.west || lon <= b.east;
}
