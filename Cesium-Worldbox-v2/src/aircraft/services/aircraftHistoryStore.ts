import type { AircraftTrack } from "@/aircraft/models/AircraftState";
import type { AircraftTrackPoint } from "@/aircraft/models/AircraftRoute";

const MAX_POINTS = 200;
const MAX_AIRCRAFT = 300;

/** Session-only history built from actual reported positions. Nothing is fabricated. */
class AircraftHistoryStore {
  private readonly points = new Map<string, AircraftTrackPoint[]>();

  record(tracks: Iterable<AircraftTrack>) {
    for (const { object, state } of tracks) {
      let list = this.points.get(object.icaoHex);
      if (!list) {
        if (this.points.size >= MAX_AIRCRAFT) {
          const oldest = this.points.keys().next().value;
          if (oldest !== undefined) this.points.delete(oldest);
        }
        list = [];
        this.points.set(object.icaoHex, list);
      }
      const last = list[list.length - 1];
      if (last && last.observedAtMs >= state.observedAtMs) continue;
      list.push({
        latitudeDeg: state.latitudeDeg,
        longitudeDeg: state.longitudeDeg,
        altitudeFt: state.onGround ? 0 : (state.altitudeFt ?? null),
        observedAtMs: state.observedAtMs,
      });
      if (list.length > MAX_POINTS) list.shift();
    }
  }

  get(icaoHex: string): AircraftTrackPoint[] {
    return this.points.get(icaoHex) ?? [];
  }

  clear() {
    this.points.clear();
  }
}

export const aircraftHistoryStore = new AircraftHistoryStore();
