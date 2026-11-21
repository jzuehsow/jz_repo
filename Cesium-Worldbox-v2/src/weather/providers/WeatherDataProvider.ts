import type { GeoBounds, WeatherAlert, WeatherGrid } from "@/weather/models/WeatherFrame";
import type { WeatherProviderCapabilities } from "@/weather/models/WeatherProviderCapabilities";

/** Base contract: every provider describes itself. */
export interface WeatherDataProvider {
  capabilities: WeatherProviderCapabilities;
}

/** Providers returning numerical point/grid values. */
export interface GridWeatherProvider extends WeatherDataProvider {
  fetchGrid(request: {
    variable: string;
    directionVariable?: string | undefined;
    bounds: GeoBounds;
    cols: number;
    rows: number;
    signal: AbortSignal;
  }): Promise<WeatherGrid>;
}

/** Providers returning ready-made imagery (WMS / WMTS / XYZ tiles). */
export interface ImageryWeatherProvider extends WeatherDataProvider {
  createImageryProvider(
    Cesium: typeof import("cesium"),
    serviceLayer: string,
  ): import("cesium").ImageryProvider;
}

export interface AlertGeoJson {
  type: "FeatureCollection";
  features: unknown[];
}

/** Providers returning vector alert areas. */
export interface AlertWeatherProvider extends WeatherDataProvider {
  fetchAlerts(signal: AbortSignal): Promise<{ geojson: AlertGeoJson; alerts: WeatherAlert[] }>;
}

export class WeatherHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function fetchWithTimeout(
  url: string,
  signal: AbortSignal,
  timeoutMs: number,
  init?: RequestInit,
): Promise<Response> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = AbortSignal.any([signal, timeout]);
  const response = await fetch(url, { ...init, signal: combined });
  if (response.status === 429) throw new WeatherHttpError("Rate limited by provider", 429);
  if (!response.ok) throw new WeatherHttpError(`Provider returned ${response.status}`, response.status);
  return response;
}
