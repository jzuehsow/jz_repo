import { useEffect, useState } from "react";

import { aircraftService, type AircraftServiceStatus } from "@/aircraft/services/aircraftService";
import type { AircraftTrack } from "@/aircraft/models/AircraftState";

export function useAircraftStatus(): AircraftServiceStatus {
  const [status, setStatus] = useState<AircraftServiceStatus>(() => aircraftService.status());
  useEffect(() => aircraftService.subscribe(setStatus), []);
  return status;
}

/** Selected aircraft snapshot, refreshed whenever the service publishes. */
export function useSelectedAircraft(icaoHex: string | null): AircraftTrack | null {
  const status = useAircraftStatus();
  if (!icaoHex || !status.enabled) return null;
  return aircraftService.getTrack(icaoHex);
}
