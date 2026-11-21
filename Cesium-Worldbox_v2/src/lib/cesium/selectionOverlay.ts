type CesiumModule = typeof import("cesium");

export interface OverlayPoint {
  latitudeDeg: number;
  longitudeDeg: number;
  heightM: number;
}

export interface OverlayMarker {
  latitudeDeg: number;
  longitudeDeg: number;
  title: string;
  subtitle?: string | undefined;
}

export interface OverlayState {
  position: OverlayPoint | null;
  label?: string | undefined;
  /** Draw a vertical line from the object to its ground point. */
  altitudeLine?: boolean | undefined;
  /** Observed track — solid. */
  history?: OverlayPoint[] | undefined;
  /** Estimated remaining route — dashed. */
  future?: OverlayPoint[] | undefined;
  /** Approximate (not observed) past route — faint dotted. */
  approximatePast?: OverlayPoint[] | undefined;
  markers?: OverlayMarker[] | undefined;
  color?: string | undefined;
}

const MAX_MARKERS = 2;

/**
 * Selected-object-only overlay: a handful of reused entities. Nothing exists
 * until the first update; `clear()` removes everything.
 */
export class SelectionOverlay {
  private entities: import("cesium").Entity[] = [];
  private altitude: import("cesium").Entity | null = null;
  private label: import("cesium").Entity | null = null;
  private history: import("cesium").Entity | null = null;
  private future: import("cesium").Entity | null = null;
  private past: import("cesium").Entity | null = null;
  private markers: import("cesium").Entity[] = [];

  constructor(
    private readonly Cesium: CesiumModule,
    private readonly viewer: import("cesium").Viewer,
  ) {}

  private cart(p: OverlayPoint) {
    return this.Cesium.Cartesian3.fromDegrees(p.longitudeDeg, p.latitudeDeg, p.heightM);
  }

  private ensure() {
    if (this.entities.length > 0) return;
    const C = this.Cesium;
    const add = (options: import("cesium").Entity.ConstructorOptions) => {
      const entity = this.viewer.entities.add({ show: false, ...options });
      this.entities.push(entity);
      return entity;
    };
    this.altitude = add({
      polyline: { positions: [], width: 1.5, arcType: C.ArcType.NONE, material: C.Color.WHITE.withAlpha(0.8) },
    });
    this.label = add({
      label: {
        text: "",
        font: "500 11px Barlow, sans-serif",
        fillColor: C.Color.fromCssColorString("#e8f4ff"),
        showBackground: true,
        backgroundColor: C.Color.fromCssColorString("#0b1622").withAlpha(0.8),
        pixelOffset: new C.Cartesian2(14, -12),
        horizontalOrigin: C.HorizontalOrigin.LEFT,
        verticalOrigin: C.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new C.DistanceDisplayCondition(0, 3_000_000),
      },
    });
    this.history = add({ polyline: { positions: [], width: 2.2, arcType: C.ArcType.NONE } });
    this.future = add({ polyline: { positions: [], width: 2, arcType: C.ArcType.NONE } });
    this.past = add({ polyline: { positions: [], width: 1.4, arcType: C.ArcType.NONE } });
    for (let i = 0; i < MAX_MARKERS; i += 1) {
      this.markers.push(
        add({
          point: {
            pixelSize: 8,
            color: C.Color.fromCssColorString("#0b1622"),
            outlineColor: C.Color.fromCssColorString("#5ce1e6"),
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: "",
            font: "500 10px Barlow, sans-serif",
            fillColor: C.Color.fromCssColorString("#e8f4ff"),
            showBackground: true,
            backgroundColor: C.Color.fromCssColorString("#0b1622").withAlpha(0.8),
            pixelOffset: new C.Cartesian2(0, -14),
            verticalOrigin: C.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        }),
      );
    }
  }

  update(state: OverlayState) {
    if (this.viewer.isDestroyed()) return;
    this.ensure();
    const C = this.Cesium;
    const color = C.Color.fromCssColorString(state.color ?? "#5ce1e6");
    const pos = state.position;

    const altitude = this.altitude!;
    if (pos && state.altitudeLine && pos.heightM > 1) {
      altitude.polyline!.positions = new C.ConstantProperty([
        this.cart(pos),
        this.cart({ ...pos, heightM: 0 }),
      ]);
      altitude.show = true;
    } else altitude.show = false;

    const label = this.label!;
    if (pos && state.label) {
      label.position = new C.ConstantPositionProperty(this.cart(pos));
      label.label!.text = new C.ConstantProperty(state.label);
      label.show = true;
    } else label.show = false;

    this.setLine(this.history!, state.history, new C.ColorMaterialProperty(color.withAlpha(0.95)));
    this.setLine(
      this.future!,
      state.future,
      new C.PolylineDashMaterialProperty({ color: color.withAlpha(0.9), dashLength: 14 }),
    );
    this.setLine(
      this.past!,
      state.approximatePast,
      new C.PolylineDashMaterialProperty({ color: color.withAlpha(0.35), dashLength: 5 }),
    );

    this.markers.forEach((marker, index) => {
      const m = state.markers?.[index];
      if (!m) {
        marker.show = false;
        return;
      }
      marker.position = new C.ConstantPositionProperty(
        C.Cartesian3.fromDegrees(m.longitudeDeg, m.latitudeDeg, 0),
      );
      marker.label!.text = new C.ConstantProperty(m.subtitle ? `${m.title}\n${m.subtitle}` : m.title);
      marker.show = true;
    });
  }

  private setLine(
    entity: import("cesium").Entity,
    points: OverlayPoint[] | undefined,
    material: import("cesium").MaterialProperty,
  ) {
    if (!points || points.length < 2) {
      entity.show = false;
      return;
    }
    entity.polyline!.positions = new this.Cesium.ConstantProperty(points.map((p) => this.cart(p)));
    entity.polyline!.material = material;
    entity.show = true;
  }

  clear() {
    if (!this.viewer.isDestroyed()) for (const entity of this.entities) this.viewer.entities.remove(entity);
    this.entities = [];
    this.markers = [];
    this.altitude = this.label = this.history = this.future = this.past = null;
  }
}

/** Screen-space decluttering: returns ids whose markers overlap an earlier one. */
export function computeCrowded<T>(
  Cesium: CesiumModule,
  viewer: import("cesium").Viewer,
  items: Iterable<[T, import("cesium").Cartesian3]>,
  cellPx = 16,
): Set<T> {
  const crowded = new Set<T>();
  const occupied = new Set<string>();
  const scratch = new Cesium.Cartesian2();
  for (const [id, position] of items) {
    const screen = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, position, scratch);
    if (!screen) continue;
    const key = `${Math.floor(screen.x / cellPx)}:${Math.floor(screen.y / cellPx)}`;
    if (occupied.has(key)) crowded.add(id);
    else occupied.add(key);
  }
  return crowded;
}
