/**
 * Generic zoom-aware point + label layer for static reference data
 * (airports, ports, capitals, cities, region names).
 *
 * Nothing is kept on the GPU for off-screen items: on every camera moveEnd
 * the visible, zoom-eligible candidates are ranked by priority, decluttered in
 * screen space, capped, and written into one BillboardCollection and one
 * LabelCollection. Zero per-frame work.
 */
type CesiumModule = typeof import("cesium");

export type ReferenceMarkerKind = "airport" | "port" | "capital" | "city" | "none";

export interface ReferencePoint {
  id: string;
  latitudeDeg: number;
  longitudeDeg: number;
  /** Lower draws first and wins collisions. */
  priority: number;
  /** Hidden when camera height (m) exceeds this. */
  maxHeightM: number;
  marker: ReferenceMarkerKind;
  /** Label text for the current camera height, or null for marker only. */
  label(cameraHeightM: number): string | null;
}

export interface ReferencePointLayerOptions {
  color: string;
  labelColor?: string;
  font?: string;
  maxMarkers: number;
  maxLabels: number;
  /** Items to hide (e.g. already drawn by a selected-object overlay). */
  isSuppressed?: (id: string) => boolean;
}

const EARTH_R = 6_371_000;
const ICON_CACHE = new Map<string, HTMLCanvasElement>();

function icon(kind: ReferenceMarkerKind, color: string): HTMLCanvasElement | null {
  if (kind === "none") return null;
  const key = `${kind}:${color}`;
  const cached = ICON_CACHE.get(key);
  if (cached) return cached;
  const c = document.createElement("canvas");
  c.width = c.height = 16;
  const g = c.getContext("2d")!;
  g.strokeStyle = "rgba(5,10,18,0.9)";
  g.fillStyle = color;
  g.lineWidth = 1.5;
  g.beginPath();
  if (kind === "airport") {
    g.arc(8, 8, 5, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.strokeStyle = "rgba(5,10,18,0.95)";
    g.beginPath();
    g.moveTo(8, 4.5);
    g.lineTo(8, 11.5);
    g.moveTo(4.5, 8);
    g.lineTo(11.5, 8);
    g.stroke();
  } else if (kind === "port") {
    g.rect(3.5, 3.5, 9, 9);
    g.fill();
    g.stroke();
  } else if (kind === "capital") {
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 === 0 ? 6.5 : 2.8;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      if (i === 0) g.moveTo(8 + r * Math.cos(a), 8 + r * Math.sin(a));
      else g.lineTo(8 + r * Math.cos(a), 8 + r * Math.sin(a));
    }
    g.closePath();
    g.fill();
    g.stroke();
  } else {
    g.arc(8, 8, 3, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  ICON_CACHE.set(key, c);
  return c;
}

export class ReferencePointLayer {
  private billboards: import("cesium").BillboardCollection | null = null;
  private labels: import("cesium").LabelCollection | null = null;
  private items: ReferencePoint[] = [];
  private removeMoveEnd: (() => void) | null = null;

  constructor(
    private readonly Cesium: CesiumModule,
    private readonly viewer: import("cesium").Viewer,
    private readonly options: ReferencePointLayerOptions,
  ) {}

  get active() {
    return this.billboards !== null;
  }

  setItems(items: ReferencePoint[]) {
    this.items = [...items].sort((a, b) => a.priority - b.priority);
    this.refresh();
  }

  enable() {
    if (this.billboards) return;
    const scene = this.viewer.scene;
    this.billboards = scene.primitives.add(new this.Cesium.BillboardCollection({ scene })) as import("cesium").BillboardCollection;
    this.labels = scene.primitives.add(new this.Cesium.LabelCollection({ scene })) as import("cesium").LabelCollection;
    const onMoveEnd = () => this.refresh();
    this.viewer.camera.moveEnd.addEventListener(onMoveEnd);
    this.removeMoveEnd = () => this.viewer.camera.moveEnd.removeEventListener(onMoveEnd);
    this.refresh();
  }

  disable() {
    this.removeMoveEnd?.();
    this.removeMoveEnd = null;
    safeRemovePrimitive(this.viewer, this.billboards);
    safeRemovePrimitive(this.viewer, this.labels);
    this.billboards = null;
    this.labels = null;
  }

  refresh() {
    const C = this.Cesium;
    const billboards = this.billboards;
    const labels = this.labels;
    if (!billboards || !labels) return;
    billboards.removeAll();
    labels.removeAll();
    if (this.items.length === 0) return;

    const scene = this.viewer.scene;
    const camera = this.viewer.camera;
    const height = camera.positionCartographic.height;
    const rect = camera.computeViewRectangle(scene.globe.ellipsoid);
    const west = rect ? C.Math.toDegrees(rect.west) : -180;
    const east = rect ? C.Math.toDegrees(rect.east) : 180;
    const south = rect ? C.Math.toDegrees(rect.south) : -90;
    const north = rect ? C.Math.toDegrees(rect.north) : 90;
    const wraps = west > east;
    const is3D = scene.mode === C.SceneMode.SCENE3D;
    const camDir = C.Cartesian3.normalize(camera.positionWC, new C.Cartesian3());
    const horizon = EARTH_R / (EARTH_R + Math.max(0, height));
    const canvas = scene.canvas;
    const width = canvas.clientWidth;
    const heightPx = canvas.clientHeight;
    const occupied = new Set<string>();
    const placed: Array<[number, number, number, number]> = [];
    const scratch = new C.Cartesian2();
    const unit = new C.Cartesian3();
    // Coarser declutter grid when far away keeps the global view sparse.
    const cellPx = height > 15_000_000 ? 34 : height > 5_000_000 ? 20 : 12;
    let markers = 0;
    let labelCount = 0;
    const { maxMarkers, maxLabels, isSuppressed } = this.options;
    const markerColor = this.options.color;
    const labelColor = C.Color.fromCssColorString(this.options.labelColor ?? "#dce8f4");
    const outline = C.Color.fromCssColorString("#050a12").withAlpha(0.9);
    const font = this.options.font ?? "500 11px Barlow, sans-serif";

    for (const item of this.items) {
      if (markers >= maxMarkers && labelCount >= maxLabels) break;
      if (item.maxHeightM < height) continue;
      const { latitudeDeg: lat, longitudeDeg: lon } = item;
      if (lat < south || lat > north) continue;
      if (wraps ? lon < west && lon > east : lon < west || lon > east) continue;
      if (isSuppressed?.(item.id)) continue;
      const position = C.Cartesian3.fromDegrees(lon, lat, 0);
      if (is3D) {
        C.Cartesian3.normalize(position, unit);
        if (C.Cartesian3.dot(unit, camDir) < horizon) continue;
      }
      const screen = C.SceneTransforms.worldToWindowCoordinates(scene, position, scratch);
      if (!screen || screen.x < 0 || screen.y < 0 || screen.x > width || screen.y > heightPx) continue;

      const cell = `${Math.floor(screen.x / cellPx)}:${Math.floor(screen.y / cellPx)}`;
      const image = icon(item.marker, markerColor);
      if (image) {
        if (occupied.has(cell) || markers >= maxMarkers) continue;
        occupied.add(cell);
        markers += 1;
        billboards.add({ position, image, scale: item.marker === "city" ? 0.8 : 0.85 });
      }
      if (labelCount >= maxLabels) continue;
      const text = item.label(height);
      if (!text) continue;
      const lines = text.split("\n");
      const w = Math.max(...lines.map((l) => l.length)) * 6.2 + 4;
      const h = lines.length * 13;
      const x0 = screen.x + (image ? 8 : -w / 2);
      const y0 = screen.y - h / 2;
      if (placed.some(([x, y, pw, ph]) => x0 < x + pw && x0 + w > x && y0 < y + ph && y0 + h > y)) continue;
      placed.push([x0, y0, w, h]);
      labelCount += 1;
      labels.add({
        position,
        text,
        font,
        fillColor: labelColor,
        outlineColor: outline,
        outlineWidth: 3,
        style: C.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new C.Cartesian2(image ? 9 : 0, 0),
        horizontalOrigin: image ? C.HorizontalOrigin.LEFT : C.HorizontalOrigin.CENTER,
        verticalOrigin: C.VerticalOrigin.CENTER,
      });
      if (!image) occupied.add(cell);
    }
  }
}

/** Removes a primitive only if it is still alive and in the scene (removing a destroyed one throws). */
export function safeRemovePrimitive(viewer: import("cesium").Viewer, primitive: unknown) {
  if (!primitive || viewer.isDestroyed()) return;
  const p = primitive as { isDestroyed?: () => boolean };
  if (p.isDestroyed?.()) return;
  const primitives = viewer.scene.primitives;
  try {
    if (primitives.contains(primitive as never)) primitives.remove(primitive as never);
    else (p as { destroy?: () => void }).destroy?.();
  } catch {
    /* already disposed */
  }
}
