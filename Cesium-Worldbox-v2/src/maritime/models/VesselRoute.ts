export interface Port {
  name: string;
  unlocode?: string | undefined;
  country?: string | undefined;
  latitudeDeg?: number | undefined;
  longitudeDeg?: number | undefined;
}

export interface VesselTrackPoint {
  latitudeDeg: number;
  longitudeDeg: number;
  observedAtMs: number;
}

export interface VesselRoute {
  mmsi: number;
  /** Only set when a provider actually reports it — never inferred. */
  origin: Port | null;
  destination: Port | null;
  destinationText?: string | undefined;
  historicalTrackPoints: VesselTrackPoint[];
  /** Always empty until a real maritime routing source exists. */
  estimatedFuturePoints: VesselTrackPoint[];
  detailedRouteAvailable: boolean;
  routeSource: string;
}
