/** Geographic bounds in degrees. */
export interface GeoBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** Numerical grid for one variable over a region, all provider-supplied timestamps. */
export interface WeatherGrid {
  bounds: GeoBounds;
  cols: number;
  rows: number;
  /** UTC epoch ms of each available frame. */
  times: number[];
  /** values[timeIndex][row * cols + col]; NaN = missing. */
  values: Float32Array[];
  /** Optional companion field (e.g. wind direction) aligned to `values`. */
  directions?: Float32Array[] | undefined;
}

export interface WeatherFrame {
  timeMs: number;
}

/** Severe-weather alert — its own model, never a SpaceObject. */
export interface WeatherAlert {
  id: string;
  event: string;
  severity: string;
  effective?: string | undefined;
  expires?: string | undefined;
  areaDesc?: string | undefined;
  senderName?: string | undefined;
  headline?: string | undefined;
  description?: string | undefined;
}
