import { safeRemovePrimitive } from "@/lib/cesium/referencePointLayer";
import { selectionHighlights } from "@/transportation/services/selectionHighlights";
import type { AircraftTrack } from "@/aircraft/models/AircraftState";
import { resolveAltitude } from "@/aircraft/services/aircraftMetadataService";
import { aircraftHistoryStore } from "@/aircraft/services/aircraftHistoryStore";
import { greatCircle, lookupRoute, type RouteLookup } from "@/aircraft/services/aircraftRouteService";
import { aircraftService, type AircraftRegion } from "@/aircraft/services/aircraftService";
import { computeCrowded, SelectionOverlay, type OverlayPoint } from "@/lib/cesium/selectionOverlay";

type CesiumModule = typeof import("cesium");

export interface AircraftPickId {
  kind: "AIRCRAFT";
  icaoHex: string;
}

export function isAircraftPickId(value: unknown): value is AircraftPickId {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === "AIRCRAFT" &&
    typeof (value as { icaoHex?: unknown }).icaoHex === "string"
  );
}

const FEET_TO_METERS = 0.3048;
const BASE_SCALE = 0.6;
const SELECTED_SCALE = 0.95;
const CROWDED_SCALE = 0.35;
const DECLUTTER_THROTTLE_MS = 1_500;

function planeIcon(): HTMLCanvasElement {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.translate(size / 2, size / 2);
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(4, -2);
  ctx.lineTo(14, 6);
  ctx.lineTo(14, 9);
  ctx.lineTo(3, 5);
  ctx.lineTo(2, 12);
  ctx.lineTo(7, 15);
  ctx.lineTo(0, 14);
  ctx.lineTo(-7, 15);
  ctx.lineTo(-2, 12);
  ctx.lineTo(-3, 5);
  ctx.lineTo(-14, 9);
  ctx.lineTo(-14, 6);
  ctx.lineTo(-4, -2);
  ctx.closePath();
  ctx.fillStyle = "#ffd27a";
  ctx.fill();
  ctx.strokeStyle = "rgba(12, 20, 30, 0.85)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  return canvas;
}

function heightMeters(track: AircraftTrack): number {
  const resolved = resolveAltitude(track);
  return Math.max(0, (resolved.altitudeFt ?? 0) * FEET_TO_METERS);
}

/**
 * Imperative bridge between the aircraft service and one Cesium billboard
 * collection. Distance scaling/fading runs on the GPU (scaleByDistance /
 * translucencyByDistance); decluttering runs only after the camera settles.
 */
export class AircraftLayerController {
  private collection: import("cesium").BillboardCollection | null = null;
  private billboards = new Map<string, import("cesium").Billboard>();
  private unsubscribe: (() => void) | null = null;
  private removeMoveEnd: (() => void) | null = null;
  private removePreRender: (() => void) | null = null;
  private lastVersion = -1;
  private selected: string | null = null;
  private icon: HTMLCanvasElement | null = null;
  private crowded = new Set<string>();
  private declutterTimer: ReturnType<typeof setTimeout> | null = null;
  private overlay: SelectionOverlay | null = null;
  private route: RouteLookup | null = null;
  private routeFor: string | null = null;

  constructor(
    private readonly Cesium: CesiumModule,
    private readonly viewer: import("cesium").Viewer,
  ) {}

  private cameraRegion(): AircraftRegion {
    const carto = this.viewer.camera.positionCartographic;
    const altitudeKm = Math.max(1, carto.height / 1000);
    const radiusKm = Math.min(463, Math.max(60, altitudeKm * 0.55));
    return {
      latitudeDeg: this.Cesium.Math.toDegrees(carto.latitude),
      longitudeDeg: this.Cesium.Math.toDegrees(carto.longitude),
      radiusKm,
    };
  }

  enable() {
    if (this.collection) return;
    this.icon = planeIcon();
    this.collection = this.viewer.scene.primitives.add(
      new this.Cesium.BillboardCollection({ scene: this.viewer.scene }),
    ) as import("cesium").BillboardCollection;

    aircraftService.start(this.cameraRegion());

    // Refresh only after the camera settles — never while dragging.
    const onMoveEnd = () => {
      aircraftService.updateRegion(this.cameraRegion());
      this.scheduleDeclutter();
    };
    this.viewer.camera.moveEnd.addEventListener(onMoveEnd);
    this.removeMoveEnd = () => this.viewer.camera.moveEnd.removeEventListener(onMoveEnd);

    const onPreRender = () => this.syncIfChanged();
    this.viewer.scene.preRender.addEventListener(onPreRender);
    this.removePreRender = () => this.viewer.scene.preRender.removeEventListener(onPreRender);

    this.unsubscribe = aircraftService.subscribe(() => {
      /* status changes are consumed by React; rendering diffs on version */
    });
  }

  disable() {
    aircraftService.stop();
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.removeMoveEnd?.();
    this.removeMoveEnd = null;
    this.removePreRender?.();
    this.removePreRender = null;
    if (this.declutterTimer) clearTimeout(this.declutterTimer);
    this.declutterTimer = null;
    this.crowded.clear();
    this.billboards.clear();
    this.lastVersion = -1;
    this.overlay?.clear();
    this.overlay = null;
    const collection = this.collection;
    this.collection = null;
    if (collection && !this.viewer.isDestroyed()) {
      safeRemovePrimitive(this.viewer, collection);
    }
    this.icon = null;
    selectionHighlights.set("airport", []);
  }

  setSelected(icaoHex: string | null) {
    if (this.selected === icaoHex) return;
    this.selected = icaoHex;
    selectionHighlights.set("airport", []);
    this.route = null;
    this.routeFor = null;
    this.lastVersion = -1;
  }

  private scheduleDeclutter() {
    if (this.declutterTimer) return;
    this.declutterTimer = setTimeout(() => {
      this.declutterTimer = null;
      if (!this.collection || this.viewer.isDestroyed()) return;
      const items: Array<[string, import("cesium").Cartesian3]> = [];
      for (const [id, billboard] of this.billboards) if (id !== this.selected) items.push([id, billboard.position]);
      this.crowded = computeCrowded(this.Cesium, this.viewer, items);
      this.lastVersion = -1;
    }, DECLUTTER_THROTTLE_MS);
  }

  private syncIfChanged() {
    if (!this.collection || this.viewer.isDestroyed()) return;
    if (aircraftService.version === this.lastVersion) return;
    this.lastVersion = aircraftService.version;

    const Cesium = this.Cesium;
    const seen = new Set<string>();
    const scaleByDistance = new Cesium.NearFarScalar(5.0e4, 1.0, 8.0e6, 0.25);
    const selectedScale = new Cesium.NearFarScalar(5.0e4, 1.0, 8.0e6, 0.7);
    const translucency = new Cesium.NearFarScalar(1.0e6, 1.0, 1.2e7, 0.55);

    for (const track of aircraftService.getTracks()) {
      const { icaoHex } = track.object;
      seen.add(icaoHex);
      const position = Cesium.Cartesian3.fromDegrees(
        track.state.longitudeDeg,
        track.state.latitudeDeg,
        heightMeters(track),
      );
      const isSelected = icaoHex === this.selected;
      const isCrowded = !isSelected && this.crowded.has(icaoHex);
      const scale = isSelected ? SELECTED_SCALE : isCrowded ? CROWDED_SCALE : BASE_SCALE;
      const color = isSelected
        ? Cesium.Color.WHITE
        : Cesium.Color.WHITE.withAlpha(isCrowded ? 0.5 : 0.92);
      const rotation = -Cesium.Math.toRadians(track.state.trackDeg ?? 0);
      const existing = this.billboards.get(icaoHex);
      if (existing) {
        existing.position = position;
        existing.rotation = rotation;
        existing.scale = scale;
        existing.color = color;
        existing.scaleByDistance = isSelected ? selectedScale : scaleByDistance;
      } else {
        const billboard = this.collection.add({
          id: { kind: "AIRCRAFT", icaoHex } satisfies AircraftPickId,
          image: (this.icon ??= planeIcon()),
          position,
          scale,
          color,
          rotation,
          alignedAxis: Cesium.Cartesian3.ZERO,
          scaleByDistance: isSelected ? selectedScale : scaleByDistance,
          translucencyByDistance: translucency,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        }) as import("cesium").Billboard;
        this.billboards.set(icaoHex, billboard);
      }
    }

    for (const [icaoHex, billboard] of [...this.billboards]) {
      if (seen.has(icaoHex)) continue;
      this.collection.remove(billboard);
      this.billboards.delete(icaoHex);
    }

    this.updateOverlay();
    if (seen.size > 0 && this.crowded.size === 0) this.scheduleDeclutter();
  }

  /** Selected-aircraft-only geometry: altitude line, flown path, estimated route, airports. */
  private updateOverlay() {
    const track = this.selected ? aircraftService.getTrack(this.selected) : null;
    if (!track) {
      this.overlay?.clear();
      this.overlay = null;
      return;
    }
    this.overlay ??= new SelectionOverlay(this.Cesium, this.viewer);
    const callsign = track.object.callsign?.trim();
    if (callsign && this.routeFor !== callsign) {
      this.routeFor = callsign;
      const forHex = track.object.icaoHex;
      void lookupRoute(callsign, track.state.latitudeDeg, track.state.longitudeDeg)
        .then((route) => {
          if (this.selected !== forHex) return;
          this.route = route;
          this.lastVersion = -1;
          selectionHighlights.set("airport", [
            route?.origin ? (route.origin.iata ?? route.origin.icao) : undefined,
            route?.destination ? (route.destination.iata ?? route.destination.icao) : undefined,
          ]);
        })
        .catch(() => undefined);
    }

    const heightM = heightMeters(track);
    const position: OverlayPoint = {
      latitudeDeg: track.state.latitudeDeg,
      longitudeDeg: track.state.longitudeDeg,
      heightM,
    };
    const history: OverlayPoint[] = aircraftHistoryStore.get(track.object.icaoHex).map((p) => ({
      latitudeDeg: p.latitudeDeg,
      longitudeDeg: p.longitudeDeg,
      heightM: p.altitudeFt !== null ? p.altitudeFt * FEET_TO_METERS : heightM,
    }));
    if (history.length > 0) history.push(position);

    const route = this.route;
    const toPoints = (samples: Array<{ latitudeDeg: number; longitudeDeg: number }>, fromH: number, toH: number) =>
      samples.map((s, i) => ({ ...s, heightM: fromH + ((toH - fromH) * i) / Math.max(1, samples.length - 1) }));
    const future = route?.destination ? toPoints(greatCircle(track.state, route.destination), heightM, 0) : undefined;
    const approximatePast =
      route?.origin && history.length < 3 ? toPoints(greatCircle(route.origin, track.state), 0, heightM) : undefined;
    const markers = [route?.origin, route?.destination]
      .filter((a) => a != null)
      .map((a) => ({
        latitudeDeg: a.latitudeDeg,
        longitudeDeg: a.longitudeDeg,
        title: a.name,
        subtitle: [a.iata, a.icao].filter(Boolean).join(" / "),
      }));
    const resolved = resolveAltitude(track);
    const altitudeText =
      resolved.altitudeFt === null
        ? ""
        : resolved.source === "ESTIMATED"
          ? ` · ~${resolved.altitudeFt.toLocaleString()} ft (est.)`
          : resolved.source === "ON_GROUND"
            ? " · on ground"
            : ` · ${resolved.altitudeFt.toLocaleString()} ft`;

    this.overlay.update({
      position,
      label: `${callsign ?? track.object.icaoHex.toUpperCase()}${altitudeText}`,
      altitudeLine: true,
      history: history.length >= 2 ? history : undefined,
      future,
      approximatePast,
      markers,
      color: "#ffd27a",
    });
  }
}
