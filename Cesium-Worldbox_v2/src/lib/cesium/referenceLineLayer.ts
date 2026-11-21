import { safeRemovePrimitive } from "@/lib/cesium/referencePointLayer";
/**
 * Generic tiered polyline layer for static reference geometry (borders,
 * shipping lanes, reference flight routes). Each tier is lazily loaded the
 * first time the camera height makes it visible, then only shown/hidden on
 * camera moveEnd. Nothing runs per frame.
 */
type CesiumModule = typeof import("cesium");

export interface ReferenceLine {
  /** Flat [lon, lat, heightM, lon, lat, heightM, ...]. */
  positions: number[];
  width: number;
  color: string;
  alpha: number;
}

export interface ReferenceLineTier {
  key: string;
  visible(cameraHeightM: number): boolean;
  load(signal: AbortSignal): Promise<ReferenceLine[]>;
}

export class ReferenceLineLayer {
  private collections = new Map<string, import("cesium").PolylineCollection>();
  private loading = new Set<string>();
  private abort: AbortController | null = null;
  private removeMoveEnd: (() => void) | null = null;
  private tiers: ReferenceLineTier[] = [];

  constructor(
    private readonly Cesium: CesiumModule,
    private readonly viewer: import("cesium").Viewer,
    private readonly onError?: (message: string) => void,
  ) {}

  setTiers(tiers: ReferenceLineTier[]) {
    const keys = new Set(tiers.map((t) => t.key));
    for (const [key, collection] of this.collections) {
      if (!keys.has(key)) {
        safeRemovePrimitive(this.viewer, collection);
        this.collections.delete(key);
      }
    }
    this.tiers = tiers;
    this.update();
  }

  enable() {
    if (this.abort) return;
    this.abort = new AbortController();
    const onMoveEnd = () => this.update();
    this.viewer.camera.moveEnd.addEventListener(onMoveEnd);
    this.removeMoveEnd = () => this.viewer.camera.moveEnd.removeEventListener(onMoveEnd);
    this.update();
  }

  disable() {
    this.abort?.abort();
    this.abort = null;
    this.removeMoveEnd?.();
    this.removeMoveEnd = null;
    for (const collection of this.collections.values()) safeRemovePrimitive(this.viewer, collection);
    this.collections.clear();
    this.loading.clear();
  }

  private update() {
    const abort = this.abort;
    if (!abort) return;
    const height = this.viewer.camera.positionCartographic.height;
    for (const tier of this.tiers) {
      const show = tier.visible(height);
      const existing = this.collections.get(tier.key);
      if (existing) {
        existing.show = show;
        continue;
      }
      if (!show || this.loading.has(tier.key)) continue;
      this.loading.add(tier.key);
      tier
        .load(abort.signal)
        .then((lines) => {
          if (abort.signal.aborted || this.abort !== abort) return;
          this.loading.delete(tier.key);
          if (!this.tiers.includes(tier)) return;
          this.collections.set(tier.key, this.build(lines));
          this.update();
        })
        .catch((cause: unknown) => {
          this.loading.delete(tier.key);
          if (abort.signal.aborted) return;
          this.onError?.(cause instanceof Error ? cause.message : "Failed to load");
        });
    }
  }

  private build(lines: ReferenceLine[]) {
    const C = this.Cesium;
    const collection = this.viewer.scene.primitives.add(new C.PolylineCollection()) as import("cesium").PolylineCollection;
    const colors = new Map<string, import("cesium").Material>();
    for (const line of lines) {
      if (line.positions.length < 6) continue;
      const key = `${line.color}:${line.alpha}`;
      let material = colors.get(key);
      if (!material) {
        material = C.Material.fromType("Color", { color: C.Color.fromCssColorString(line.color).withAlpha(line.alpha) });
        colors.set(key, material);
      }
      collection.add({ positions: C.Cartesian3.fromDegreesArrayHeights(line.positions), width: line.width, material });
    }
    return collection;
  }
}

/** Flat lon/lat pairs → flat lon/lat/height triples at a constant height. */
export function withHeight(points: number[][], heightM: number): number[] {
  const out: number[] = [];
  for (const [lon, lat] of points) out.push(lon!, lat!, heightM);
  return out;
}

/** Great-circle arc lifted into a gentle bow (visual only). */
export function geodesicArc(lat1: number, lon1: number, lat2: number, lon2: number, samples = 32): number[] {
  const toRad = Math.PI / 180;
  const φ1 = lat1 * toRad, λ1 = lon1 * toRad, φ2 = lat2 * toRad, λ2 = lon2 * toRad;
  const d = 2 * Math.asin(Math.sqrt(Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2));
  const out: number[] = [];
  if (d === 0) return out;
  const peak = Math.min(400_000, d * 6_371_000 * 0.06);
  for (let i = 0; i <= samples; i += 1) {
    const f = i / samples;
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);
    const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
    const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
    const z = a * Math.sin(φ1) + b * Math.sin(φ2);
    out.push(Math.atan2(y, x) / toRad, Math.atan2(z, Math.sqrt(x * x + y * y)) / toRad, 5_000 + peak * Math.sin(Math.PI * f));
  }
  return out;
}
