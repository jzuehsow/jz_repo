import { geodesicArc, ReferenceLineLayer, withHeight, type ReferenceLine } from "@/lib/cesium/referenceLineLayer";
import { ReferencePointLayer, type ReferencePoint } from "@/lib/cesium/referencePointLayer";
import type { ReferenceLayerController } from "@/reference/ReferenceLayerHost";
import {
  globalShippingLanesProvider,
  naturalEarthPortProvider,
  openFlightsRouteProvider,
  ourAirportsProvider,
} from "@/transportation/providers/TransportationProviders";
import { selectionHighlights } from "@/transportation/services/selectionHighlights";

type CesiumModule = typeof import("cesium");
type Viewer = import("cesium").Viewer;
type Status = (kind: "loading" | "active" | "error", message?: string) => void;

const AIRPORT_MAX_HEIGHT = [50_000_000, 3_000_000, 600_000];

export function createAirportLayer(Cesium: CesiumModule, viewer: Viewer, status: Status): ReferenceLayerController {
  const layer = new ReferencePointLayer(Cesium, viewer, {
    color: "#f5c46b",
    maxMarkers: 450,
    maxLabels: 70,
    isSuppressed: (id) => selectionHighlights.has("airport", id),
  });
  let abort: AbortController | null = null;
  let unsubscribe: (() => void) | null = null;
  return {
    enable() {
      if (abort) return;
      abort = new AbortController();
      layer.enable();
      unsubscribe = selectionHighlights.subscribe(() => layer.refresh());
      status("loading");
      ourAirportsProvider
        .load(abort.signal)
        .then((airports) => {
          const tier = { LARGE: 0, MEDIUM: 1, SMALL: 2 } as const;
          layer.setItems(
            airports.map((a, i): ReferencePoint => {
              const t = tier[a.airportClass];
              const code = a.iata ?? a.icao ?? "";
              return {
                id: code || a.name,
                latitudeDeg: a.latitudeDeg,
                longitudeDeg: a.longitudeDeg,
                priority: t * 100_000 + i,
                maxHeightM: AIRPORT_MAX_HEIGHT[t]!,
                marker: "airport",
                label: (h) => (h < 1_200_000 ? `${code}\n${a.name}` : code || null),
              };
            }),
          );
          status("active", `${airports.length.toLocaleString()} airports · ${ourAirportsProvider.info.source}`);
        })
        .catch((e: unknown) => {
          if (!abort?.signal.aborted) status("error", e instanceof Error ? e.message : "Failed to load");
        });
    },
    disable() {
      abort?.abort();
      abort = null;
      unsubscribe?.();
      unsubscribe = null;
      layer.disable();
    },
  };
}

export function createPortLayer(Cesium: CesiumModule, viewer: Viewer, status: Status): ReferenceLayerController {
  const layer = new ReferencePointLayer(Cesium, viewer, {
    color: "#6fd3dc",
    maxMarkers: 300,
    maxLabels: 60,
    isSuppressed: (id) => selectionHighlights.has("port", id),
  });
  let abort: AbortController | null = null;
  let unsubscribe: (() => void) | null = null;
  return {
    enable() {
      if (abort) return;
      abort = new AbortController();
      layer.enable();
      unsubscribe = selectionHighlights.subscribe(() => layer.refresh());
      status("loading");
      naturalEarthPortProvider
        .load(abort.signal)
        .then((ports) => {
          layer.setItems(
            ports.map((p, i) => ({
              id: p.name,
              latitudeDeg: p.latitudeDeg,
              longitudeDeg: p.longitudeDeg,
              priority: p.rank * 10_000 + i,
              maxHeightM: p.rank <= 4 ? 50_000_000 : p.rank <= 6 ? 4_000_000 : 1_200_000,
              marker: "port" as const,
              label: () => p.name,
            })),
          );
          status("active", `${ports.length.toLocaleString()} ports · ${naturalEarthPortProvider.info.source}`);
        })
        .catch((e: unknown) => {
          if (!abort?.signal.aborted) status("error", e instanceof Error ? e.message : "Failed to load");
        });
    },
    disable() {
      abort?.abort();
      abort = null;
      unsubscribe?.();
      unsubscribe = null;
      layer.disable();
    },
  };
}

function lineController(layer: ReferenceLineLayer, onEnable: () => void): ReferenceLayerController {
  return {
    enable() {
      layer.enable();
      onEnable();
    },
    disable: () => layer.disable(),
  };
}

export function createFlightRouteLayer(Cesium: CesiumModule, viewer: Viewer, status: Status): ReferenceLayerController {
  const layer = new ReferenceLineLayer(Cesium, viewer, (m) => status("error", m));
  const band = (from: number, to: number, maxHeight: number) => ({
    key: `routes-${from}`,
    visible: (h: number) => h <= maxHeight,
    async load(signal: AbortSignal): Promise<ReferenceLine[]> {
      const routes = (await openFlightsRouteProvider.load(signal)).slice(from, to);
      return routes.map((r) => {
        const weight = Math.min(1, r.airlineCount / 20);
        return {
          positions: geodesicArc(r.from.latitudeDeg, r.from.longitudeDeg, r.to.latitudeDeg, r.to.longitudeDeg, 28),
          width: 0.8 + weight,
          color: "#a9b8ff",
          alpha: Math.round((0.12 + 0.4 * weight) * 20) / 20,
        };
      });
    },
  });
  return lineController(layer, () => {
    layer.setTiers([band(0, 250, 50_000_000), band(250, 1200, 6_000_000), band(1200, 4000, 2_000_000)]);
    status("active", `Reference only · ${openFlightsRouteProvider.info.source} (${openFlightsRouteProvider.info.version})`);
  });
}

export function createShippingLaneLayer(Cesium: CesiumModule, viewer: Viewer, status: Status): ReferenceLayerController {
  const layer = new ReferenceLineLayer(Cesium, viewer, (m) => status("error", m));
  const style = { MAJOR: [1.6, 0.45, 50_000_000], MIDDLE: [1.1, 0.3, 8_000_000], MINOR: [0.8, 0.22, 3_000_000] } as const;
  const tier = (laneClass: keyof typeof style) => ({
    key: laneClass,
    visible: (h: number) => h <= style[laneClass][2],
    async load(signal: AbortSignal): Promise<ReferenceLine[]> {
      const lanes = await globalShippingLanesProvider.load(signal);
      return lanes
        .filter((l) => l.laneClass === laneClass)
        .map((l) => ({
          positions: withHeight(l.coordinates, 300),
          width: style[laneClass][0],
          alpha: style[laneClass][1],
          color: "#7f9bb3",
        }));
    },
  });
  return lineController(layer, () => {
    layer.setTiers([tier("MAJOR"), tier("MIDDLE"), tier("MINOR")]);
    status("active", `${globalShippingLanesProvider.info.source} · ${globalShippingLanesProvider.info.license}`);
  });
}
