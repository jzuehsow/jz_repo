import { safeRemovePrimitive } from "@/lib/cesium/referencePointLayer";
import { findPortByName } from "@/transportation/providers/TransportationProviders";
import { selectionHighlights } from "@/transportation/services/selectionHighlights";
import { computeCrowded, SelectionOverlay } from "@/lib/cesium/selectionOverlay";
import type { MaritimeBounds } from "@/maritime/providers/MaritimeDataProvider";
import { maritimeService } from "@/maritime/services/maritimeService";
import { VESSEL_CATEGORIES } from "@/maritime/services/vesselMetadataService";
import { buildVesselRoute } from "@/maritime/services/vesselRouteService";

type CesiumModule = typeof import("cesium");

export interface VesselPickId {
  kind: "VESSEL";
  mmsi: number;
}

export function isVesselPickId(value: unknown): value is VesselPickId {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === "VESSEL" &&
    typeof (value as { mmsi?: unknown }).mmsi === "number"
  );
}

const SEA_SURFACE_M = 2;
const MOVE_DEBOUNCE_MS = 800;

/** White hull glyph; per-category colour is applied via billboard.color. */
function shipIcon(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 24;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.beginPath();
  ctx.moveTo(12, 1);
  ctx.quadraticCurveTo(21, 10, 20, 30);
  ctx.lineTo(4, 30);
  ctx.quadraticCurveTo(3, 10, 12, 1);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "rgba(12,20,30,0.9)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  return canvas;
}

export class VesselLayerController {
  private collection: import("cesium").BillboardCollection | null = null;
  private billboards = new Map<number, import("cesium").Billboard>();
  private removeMoveEnd: (() => void) | null = null;
  private removePreRender: (() => void) | null = null;
  private moveTimer: ReturnType<typeof setTimeout> | null = null;
  private lastVersion = -1;
  private selected: number | null = null;
  private icon: HTMLCanvasElement | null = null;
  private crowded = new Set<number>();
  private overlay: SelectionOverlay | null = null;

  constructor(
    private readonly Cesium: CesiumModule,
    private readonly viewer: import("cesium").Viewer,
  ) {}

  private viewBounds(): MaritimeBounds {
    const C = this.Cesium;
    const rect = this.viewer.camera.computeViewRectangle(this.viewer.scene.globe.ellipsoid);
    if (!rect) return { west: -180, south: -85, east: 180, north: 85 };
    return {
      west: C.Math.toDegrees(rect.west),
      south: C.Math.toDegrees(rect.south),
      east: C.Math.toDegrees(rect.east),
      north: C.Math.toDegrees(rect.north),
    };
  }

  enable() {
    if (this.collection) return;
    this.icon = shipIcon();
    this.collection = this.viewer.scene.primitives.add(
      new this.Cesium.BillboardCollection({ scene: this.viewer.scene }),
    ) as import("cesium").BillboardCollection;
    maritimeService.start(this.viewBounds());

    const onMoveEnd = () => {
      if (this.moveTimer) clearTimeout(this.moveTimer);
      this.moveTimer = setTimeout(() => {
        this.moveTimer = null;
        maritimeService.updateBounds(this.viewBounds());
        this.declutter();
      }, MOVE_DEBOUNCE_MS);
    };
    this.viewer.camera.moveEnd.addEventListener(onMoveEnd);
    this.removeMoveEnd = () => this.viewer.camera.moveEnd.removeEventListener(onMoveEnd);
    const onPreRender = () => this.sync();
    this.viewer.scene.preRender.addEventListener(onPreRender);
    this.removePreRender = () => this.viewer.scene.preRender.removeEventListener(onPreRender);
  }

  disable() {
    selectionHighlights.set("port", []);
    maritimeService.stop();
    this.removeMoveEnd?.();
    this.removeMoveEnd = null;
    this.removePreRender?.();
    this.removePreRender = null;
    if (this.moveTimer) clearTimeout(this.moveTimer);
    this.moveTimer = null;
    this.billboards.clear();
    this.crowded.clear();
    this.overlay?.clear();
    this.overlay = null;
    this.lastVersion = -1;
    const collection = this.collection;
    this.collection = null;
    safeRemovePrimitive(this.viewer, collection);
    this.icon = null;
  }

  setSelected(mmsi: number | null) {
    if (this.selected === mmsi) return;
    this.selected = mmsi;
    this.lastVersion = -1;
  }

  private declutter() {
    if (!this.collection || this.viewer.isDestroyed()) return;
    const items: Array<[number, import("cesium").Cartesian3]> = [];
    for (const [id, b] of this.billboards) if (id !== this.selected) items.push([id, b.position]);
    this.crowded = computeCrowded(this.Cesium, this.viewer, items, 14);
    this.lastVersion = -1;
  }

  private sync() {
    if (!this.collection || this.viewer.isDestroyed()) return;
    if (maritimeService.version === this.lastVersion) return;
    const firstRender = this.billboards.size === 0;
    this.lastVersion = maritimeService.version;
    const C = this.Cesium;
    const near = new C.NearFarScalar(2.0e4, 1.0, 5.0e6, 0.18);
    const nearSelected = new C.NearFarScalar(2.0e4, 1.0, 5.0e6, 0.6);
    const fade = new C.NearFarScalar(1.5e6, 1.0, 1.0e7, 0.5);
    const seen = new Set<number>();

    for (const track of maritimeService.getTracks()) {
      const { mmsi } = track.object;
      seen.add(mmsi);
      const position = C.Cartesian3.fromDegrees(track.state.longitudeDeg, track.state.latitudeDeg, SEA_SURFACE_M);
      const heading = track.state.headingDeg ?? track.state.courseDeg;
      const rotation = heading === undefined ? 0 : -C.Math.toRadians(heading);
      const isSelected = mmsi === this.selected;
      const crowded = !isSelected && this.crowded.has(mmsi);
      const base = C.Color.fromCssColorString(VESSEL_CATEGORIES[track.object.category].color);
      const color = isSelected ? C.Color.WHITE : base.withAlpha(crowded ? 0.45 : 0.95);
      const scale = isSelected ? 0.9 : crowded ? 0.3 : 0.55;
      const existing = this.billboards.get(mmsi);
      if (existing) {
        existing.position = position;
        existing.rotation = rotation;
        existing.color = color;
        existing.scale = scale;
        existing.scaleByDistance = isSelected ? nearSelected : near;
      } else {
        const billboard = this.collection.add({
          id: { kind: "VESSEL", mmsi } satisfies VesselPickId,
          image: (this.icon ??= shipIcon()),
          position,
          rotation,
          color,
          scale,
          alignedAxis: C.Cartesian3.ZERO,
          scaleByDistance: isSelected ? nearSelected : near,
          translucencyByDistance: fade,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        }) as import("cesium").Billboard;
        this.billboards.set(mmsi, billboard);
      }
    }
    for (const [mmsi, billboard] of [...this.billboards]) {
      if (seen.has(mmsi)) continue;
      this.collection.remove(billboard);
      this.billboards.delete(mmsi);
    }
    if (firstRender && seen.size > 0) setTimeout(() => this.declutter(), 300);
    this.updateOverlay();
  }

  /** Destination text → reference port (null = looked up, not found). */
  private portLookups = new Map<string, { latitudeDeg: number; longitudeDeg: number; name: string } | null>();

  private updateOverlay() {
    const track = this.selected !== null ? maritimeService.getTrack(this.selected) : null;
    if (!track) {
      this.overlay?.clear();
      this.overlay = null;
      selectionHighlights.set("port", []);
      return;
    }
    this.overlay ??= new SelectionOverlay(this.Cesium, this.viewer);
    const route = buildVesselRoute(track);
    const history = route.historicalTrackPoints.map((p) => ({ ...p, heightM: SEA_SURFACE_M }));
    let dest = route.destination;
    // Destination only (never origin): fall back to the reference port list when the AIS text is not in the local table.
    if (dest && (dest.latitudeDeg === undefined || dest.longitudeDeg === undefined)) {
      const key = dest.name.toUpperCase();
      if (!this.portLookups.has(key)) {
        this.portLookups.set(key, null);
        void findPortByName(dest.name)
          .then((port) => {
            this.portLookups.set(key, port);
            if (port) this.updateOverlay();
          })
          .catch(() => undefined);
      }
      const found = this.portLookups.get(key);
      if (found) dest = { ...dest, name: found.name, latitudeDeg: found.latitudeDeg, longitudeDeg: found.longitudeDeg };
    }
    selectionHighlights.set("port", [dest?.latitudeDeg !== undefined ? dest.name : undefined]);
    this.overlay.update({
      position: { latitudeDeg: track.state.latitudeDeg, longitudeDeg: track.state.longitudeDeg, heightM: SEA_SURFACE_M },
      label: track.object.name ?? `MMSI ${track.object.mmsi}`,
      history: history.length >= 2 ? history : undefined,
      markers:
        dest && dest.latitudeDeg !== undefined && dest.longitudeDeg !== undefined
          ? [{
              latitudeDeg: dest.latitudeDeg,
              longitudeDeg: dest.longitudeDeg,
              title: dest.name,
              subtitle: [dest.unlocode, dest.country].filter(Boolean).join(" · "),
            }]
          : [],
      color: "#5ce1e6",
    });
  }
}
