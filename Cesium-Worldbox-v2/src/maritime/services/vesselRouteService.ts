import type { VesselTrack } from "@/maritime/models/VesselObject";
import type { VesselRoute, VesselTrackPoint } from "@/maritime/models/VesselRoute";
import { resolveDestination } from "@/maritime/services/vesselMetadataService";

const MAX_POINTS = 240;
const MAX_VESSELS = 600;

/** Session history from actual AIS reports only. */
class VesselHistoryStore {
  private readonly points = new Map<number, VesselTrackPoint[]>();

  record(tracks: Iterable<VesselTrack>) {
    for (const { state } of tracks) {
      let list = this.points.get(state.mmsi);
      if (!list) {
        if (this.points.size >= MAX_VESSELS) {
          const oldest = this.points.keys().next().value;
          if (oldest !== undefined) this.points.delete(oldest);
        }
        list = [];
        this.points.set(state.mmsi, list);
      }
      const last = list[list.length - 1];
      if (last && (last.observedAtMs >= state.observedAtMs ||
        (last.latitudeDeg === state.latitudeDeg && last.longitudeDeg === state.longitudeDeg))) continue;
      list.push({ latitudeDeg: state.latitudeDeg, longitudeDeg: state.longitudeDeg, observedAtMs: state.observedAtMs });
      if (list.length > MAX_POINTS) list.shift();
    }
  }

  get(mmsi: number): VesselTrackPoint[] {
    return this.points.get(mmsi) ?? [];
  }

  clear() {
    this.points.clear();
  }
}

export const vesselHistoryStore = new VesselHistoryStore();

/**
 * Builds the selected vessel's route. Origin is never inferred; the remaining
 * route is omitted because no sea-routing source is configured (a straight
 * line could cross land).
 */
export function buildVesselRoute(track: VesselTrack): VesselRoute {
  return {
    mmsi: track.object.mmsi,
    origin: null,
    destination: resolveDestination(track.object.destination),
    destinationText: track.object.destination,
    historicalTrackPoints: vesselHistoryStore.get(track.object.mmsi),
    estimatedFuturePoints: [],
    detailedRouteAvailable: false,
    routeSource: track.state.source,
  };
}
