import type { ColorScaleId } from "@/weather/models/colorScales";
import type { QuantityKind } from "@/weather/models/units";

export type WeatherGroup = "CORE" | "OBSERVED" | "SEVERE" | "ADVANCED";

/** How the layer reaches Cesium; the manager picks the mechanism from this. */
export type WeatherRenderKind = "grid-raster" | "wms" | "wmts" | "alerts";

export interface WeatherLayerDefinition {
  id: string;
  name: string;
  description: string;
  group: WeatherGroup;
  providerId: string;
  kind: WeatherRenderKind;
  /** Provider variable (grid layers). */
  variable?: string | undefined;
  /** Companion direction variable for arrow overlays. */
  directionVariable?: string | undefined;
  /** WMS/WMTS layer name. */
  serviceLayer?: string | undefined;
  quantity?: QuantityKind | undefined;
  scale?: ColorScaleId | undefined;
  /** Human-readable coverage, e.g. "Global" or "United States". */
  coverage: string;
  /** True when frames come from a forecast time series (drives WEATHER TIME). */
  forecast: boolean;
  /** True for opaque full-view heatmaps (for stacking warnings). */
  fullScreenRaster: boolean;
  defaultOpacity: number;
}
