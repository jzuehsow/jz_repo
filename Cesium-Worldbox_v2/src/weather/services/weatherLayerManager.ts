import type { LayerRuntimeStatus, LayerStatusKind } from "@/layers/LayerDefinition";
import type { GeoBounds, WeatherAlert, WeatherGrid } from "@/weather/models/WeatherFrame";
import type { WeatherLayerDefinition } from "@/weather/models/WeatherLayerDefinition";
import { WeatherHttpError } from "@/weather/providers/WeatherDataProvider";
import { rasterizeFrame } from "@/weather/services/weatherRasterService";
import { ALERT_PROVIDERS, getGrid, IMAGERY_PROVIDERS } from "@/weather/services/weatherService";

type CesiumModule = typeof import("cesium");
type Viewer = import("cesium").Viewer;

const TARGET_POINTS = 260;
const CAMERA_DEBOUNCE_MS = 600;
const ALERT_REFRESH_MS = 5 * 60_000;

interface Entry {
  definition: WeatherLayerDefinition;
  opacity: number;
  generation: number;
  abort: AbortController | null;
  imagery: import("cesium").ImageryLayer | null;
  dataSource: import("cesium").GeoJsonDataSource | null;
  grid: WeatherGrid | null;
  frameUrls: Map<number, string>;
  shownIndex: number;
  timer: ReturnType<typeof setInterval> | null;
}

export interface WeatherManagerCallbacks {
  onStatus(status: LayerRuntimeStatus): void;
  onFrames(id: string, times: number[] | null): void;
}

function severityColor(Cesium: CesiumModule, severity: string) {
  switch (severity) {
    case "Extreme":
      return Cesium.Color.fromCssColorString("#b0126b");
    case "Severe":
      return Cesium.Color.fromCssColorString("#e8412c");
    case "Moderate":
      return Cesium.Color.fromCssColorString("#f08a3c");
    case "Minor":
      return Cesium.Color.fromCssColorString("#f2d13b");
    default:
      return Cesium.Color.fromCssColorString("#7fb0ff");
  }
}

/**
 * Owns every weather Cesium resource. Holds nothing — no listeners, timers
 * or requests — until a weather layer is enabled.
 */
export class WeatherLayerManager {
  private readonly entries = new Map<string, Entry>();
  private readonly alerts = new Map<string, WeatherAlert>();
  private timeMs: number | null = null;
  private removeCameraListener: (() => void) | null = null;
  private debounce: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly Cesium: CesiumModule,
    private readonly viewer: Viewer,
    private readonly callbacks: WeatherManagerCallbacks,
  ) {}

  private emit(id: string, kind: LayerStatusKind, message?: string) {
    this.callbacks.onStatus({ id, kind, message });
  }

  sync(definitions: WeatherLayerDefinition[], enabled: ReadonlySet<string>, opacity: Record<string, number>) {
    for (const id of [...this.entries.keys()]) if (!enabled.has(id)) this.disable(id);
    for (const definition of definitions) {
      if (!enabled.has(definition.id)) continue;
      const alpha = opacity[definition.id] ?? definition.defaultOpacity;
      const existing = this.entries.get(definition.id);
      if (existing) {
        if (existing.opacity !== alpha) this.applyOpacity(existing, alpha);
        continue;
      }
      this.enable(definition, alpha);
    }
    this.updateCameraListener();
  }

  setTime(timeMs: number | null) {
    this.timeMs = timeMs;
    for (const entry of this.entries.values()) if (entry.grid) void this.showFrame(entry);
  }

  alertForPick(picked: unknown): WeatherAlert | null {
    const id = (picked as { id?: { properties?: { alertId?: { getValue(): unknown } } } } | undefined)?.id;
    const alertId = id?.properties?.alertId?.getValue();
    return typeof alertId === "string" ? (this.alerts.get(alertId) ?? null) : null;
  }

  destroyAll() {
    for (const id of [...this.entries.keys()]) this.disable(id);
    this.updateCameraListener();
  }

  // ---- lifecycle ----------------------------------------------------------

  private enable(definition: WeatherLayerDefinition, opacity: number) {
    const entry: Entry = {
      definition,
      opacity,
      generation: 1,
      abort: null,
      imagery: null,
      dataSource: null,
      grid: null,
      frameUrls: new Map(),
      shownIndex: -1,
      timer: null,
    };
    this.entries.set(definition.id, entry);
    if (definition.kind === "grid-raster") void this.loadGrid(entry);
    else if (definition.kind === "alerts") {
      void this.loadAlerts(entry);
      entry.timer = setInterval(() => void this.loadAlerts(entry), ALERT_REFRESH_MS);
    } else this.loadImagery(entry);
  }

  private disable(id: string) {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.generation += 1;
    entry.abort?.abort();
    if (entry.timer) clearInterval(entry.timer);
    if (entry.imagery && !this.viewer.isDestroyed()) this.viewer.imageryLayers.remove(entry.imagery, true);
    if (entry.dataSource && !this.viewer.isDestroyed()) {
      for (const e of entry.dataSource.entities.values) {
        const alertId = e.properties?.["alertId"]?.getValue() as string | undefined;
        if (alertId) this.alerts.delete(alertId);
      }
      void this.viewer.dataSources.remove(entry.dataSource, true);
    }
    this.entries.delete(id);
    this.callbacks.onFrames(id, null);
    this.emit(id, "idle");
  }

  private applyOpacity(entry: Entry, opacity: number) {
    entry.opacity = opacity;
    if (entry.imagery) entry.imagery.alpha = opacity;
    if (entry.dataSource) this.styleAlerts(entry);
  }

  private failure(entry: Entry, cause: unknown) {
    if ((cause as Error)?.name === "AbortError") return;
    console.warn(`[weather] ${entry.definition.id} failed:`, cause);
    const message =
      cause instanceof WeatherHttpError && cause.status === 429
        ? "Provider rate limit reached — try again shortly."
        : `${entry.definition.name} data temporarily unavailable.`;
    this.emit(entry.definition.id, "error", message);
  }

  // ---- imagery (WMS / WMTS) ----------------------------------------------

  private loadImagery(entry: Entry) {
    const { definition } = entry;
    const provider = IMAGERY_PROVIDERS[definition.providerId];
    if (!provider || !definition.serviceLayer) {
      this.emit(definition.id, "unavailable", "No provider configured.");
      return;
    }
    try {
      const imageryProvider = provider.createImageryProvider(this.Cesium, definition.serviceLayer);
      let reported = false;
      imageryProvider.errorEvent.addEventListener((error: { timesRetried: number }) => {
        if (!reported && error.timesRetried > 1) {
          reported = true;
          this.emit(definition.id, "error", `${definition.name} data temporarily unavailable.`);
        }
      });
      const layer = this.viewer.imageryLayers.addImageryProvider(imageryProvider);
      layer.alpha = entry.opacity;
      entry.imagery = layer;
      this.emit(definition.id, "active", `Latest · ${definition.coverage}`);
    } catch (cause) {
      this.failure(entry, cause);
    }
  }

  // ---- alerts --------------------------------------------------------------

  private async loadAlerts(entry: Entry) {
    const provider = ALERT_PROVIDERS[entry.definition.providerId];
    if (!provider) return;
    const generation = entry.generation;
    entry.abort?.abort();
    const abort = new AbortController();
    entry.abort = abort;
    if (!entry.dataSource) this.emit(entry.definition.id, "loading");
    try {
      const { geojson, alerts } = await provider.fetchAlerts(abort.signal);
      if (entry.generation !== generation || this.viewer.isDestroyed()) return;
      const source = await this.Cesium.GeoJsonDataSource.load(geojson, { clampToGround: false });
      if (entry.generation !== generation || this.viewer.isDestroyed()) return;
      if (entry.dataSource) void this.viewer.dataSources.remove(entry.dataSource, true);
      for (const alert of alerts) this.alerts.set(alert.id, alert);
      entry.dataSource = source;
      this.styleAlerts(entry);
      await this.viewer.dataSources.add(source);
      this.emit(entry.definition.id, "active", `${alerts.length} active alerts`);
    } catch (cause) {
      this.failure(entry, cause);
    }
  }

  private styleAlerts(entry: Entry) {
    const source = entry.dataSource;
    if (!source) return;
    for (const e of source.entities.values) {
      const alertId = e.properties?.["alertId"]?.getValue() as string | undefined;
      const color = severityColor(this.Cesium, this.alerts.get(alertId ?? "")?.severity ?? "");
      if (e.polygon) {
        e.polygon.material = new this.Cesium.ColorMaterialProperty(color.withAlpha(entry.opacity));
        e.polygon.outline = new this.Cesium.ConstantProperty(true);
        e.polygon.outlineColor = new this.Cesium.ConstantProperty(color);
        e.polygon.height = new this.Cesium.ConstantProperty(0);
      }
    }
  }

  // ---- numerical grids -----------------------------------------------------

  private viewBounds(): GeoBounds {
    const C = this.Cesium;
    const rect = this.viewer.camera.computeViewRectangle(this.viewer.scene.globe.ellipsoid);
    let west = -180;
    let east = 180;
    let south = -80;
    let north = 80;
    if (rect) {
      west = C.Math.toDegrees(rect.west);
      east = C.Math.toDegrees(rect.east);
      south = C.Math.toDegrees(rect.south);
      north = C.Math.toDegrees(rect.north);
      if (east < west) east += 360;
      const padLon = (east - west) * 0.1;
      const padLat = (north - south) * 0.1;
      west -= padLon;
      east += padLon;
      south -= padLat;
      north += padLat;
    }
    if (east - west >= 300) {
      west = -180;
      east = 180;
    }
    const step = east - west > 40 ? 2 : 0.5;
    const snap = (v: number, dir: "floor" | "ceil") => Math[dir](v / step) * step;
    return {
      west: Math.max(-180, snap(west, "floor")),
      east: Math.min(540, snap(east, "ceil")),
      south: Math.max(-85, snap(south, "floor")),
      north: Math.min(85, snap(north, "ceil")),
    };
  }

  private async loadGrid(entry: Entry) {
    const { definition } = entry;
    if (!definition.variable || !definition.scale) return;
    const generation = entry.generation;
    entry.abort?.abort();
    const abort = new AbortController();
    entry.abort = abort;
    const bounds = this.viewBounds();
    const aspect = (bounds.east - bounds.west) / Math.max(1, bounds.north - bounds.south);
    const cols = Math.max(4, Math.min(30, Math.round(Math.sqrt(TARGET_POINTS * aspect))));
    const rows = Math.max(4, Math.min(24, Math.floor(TARGET_POINTS / cols)));
    this.emit(definition.id, "loading");
    try {
      const grid = await getGrid(
        definition.providerId,
        definition.variable,
        definition.directionVariable,
        bounds,
        cols,
        rows,
        abort.signal,
      );
      if (entry.generation !== generation || this.viewer.isDestroyed()) return;
      if (grid.times.length === 0) throw new Error("Provider returned no frames");
      entry.grid = grid;
      entry.frameUrls.clear();
      entry.shownIndex = -1;
      this.callbacks.onFrames(definition.id, grid.times);
      await this.showFrame(entry);
      this.emit(definition.id, "active");
    } catch (cause) {
      if (entry.generation === generation) this.failure(entry, cause);
    }
  }

  private frameIndex(times: number[]): number {
    const target = this.timeMs ?? Date.now();
    let best = 0;
    for (let i = 0; i < times.length; i += 1) if (times[i]! <= target) best = i;
    return best;
  }

  private async showFrame(entry: Entry) {
    const grid = entry.grid;
    const scale = entry.definition.scale;
    if (!grid || !scale) return;
    const index = this.frameIndex(grid.times);
    if (index === entry.shownIndex && entry.imagery) return;
    entry.shownIndex = index;
    let url = entry.frameUrls.get(index);
    if (!url) {
      url = rasterizeFrame(grid, index, scale).toDataURL("image/png");
      entry.frameUrls.set(index, url);
    }
    const C = this.Cesium;
    const b = grid.bounds;
    const east = b.east > 180 ? b.east - 360 : b.east;
    const generation = entry.generation;
    const provider = await C.SingleTileImageryProvider.fromUrl(url, {
      rectangle: C.Rectangle.fromDegrees(b.west, b.south, east, b.north),
    });
    if (entry.generation !== generation || this.viewer.isDestroyed() || entry.shownIndex !== index) return;
    const previous = entry.imagery;
    const layer = this.viewer.imageryLayers.addImageryProvider(provider);
    layer.alpha = entry.opacity;
    entry.imagery = layer;
    if (previous) this.viewer.imageryLayers.remove(previous, true);
  }

  // ---- camera --------------------------------------------------------------

  private updateCameraListener() {
    const needsCamera = [...this.entries.values()].some((e) => e.definition.kind === "grid-raster");
    if (needsCamera && !this.removeCameraListener) {
      const handler = () => {
        if (this.debounce) clearTimeout(this.debounce);
        this.debounce = setTimeout(() => {
          for (const entry of this.entries.values()) {
            if (entry.definition.kind === "grid-raster") void this.loadGrid(entry);
          }
        }, CAMERA_DEBOUNCE_MS);
      };
      this.viewer.camera.moveEnd.addEventListener(handler);
      this.removeCameraListener = () => this.viewer.camera.moveEnd.removeEventListener(handler);
    } else if (!needsCamera && this.removeCameraListener) {
      this.removeCameraListener();
      this.removeCameraListener = null;
      if (this.debounce) clearTimeout(this.debounce);
      this.debounce = null;
    }
  }
}
