import type { GeoBounds, WeatherGrid } from "@/weather/models/WeatherFrame";
import { gibsTileProvider } from "@/weather/providers/TileWeatherProvider";
import { nwsAlertsProvider } from "@/weather/providers/NoaaWeatherProvider";
import { openMeteoProvider } from "@/weather/providers/OpenMeteoProvider";
import type {
  AlertWeatherProvider,
  GridWeatherProvider,
  ImageryWeatherProvider,
  WeatherDataProvider,
} from "@/weather/providers/WeatherDataProvider";
import { nowCoastWmsProvider } from "@/weather/providers/WmsWeatherProvider";

/** Registry: swap or add providers here without touching Cesium code. */
export const GRID_PROVIDERS: Record<string, GridWeatherProvider> = {
  [openMeteoProvider.capabilities.id]: openMeteoProvider,
};
export const IMAGERY_PROVIDERS: Record<string, ImageryWeatherProvider> = {
  [nowCoastWmsProvider.capabilities.id]: nowCoastWmsProvider,
  [gibsTileProvider.capabilities.id]: gibsTileProvider,
};
export const ALERT_PROVIDERS: Record<string, AlertWeatherProvider> = {
  [nwsAlertsProvider.capabilities.id]: nwsAlertsProvider,
};

export function getWeatherProvider(id: string): WeatherDataProvider | undefined {
  return GRID_PROVIDERS[id] ?? IMAGERY_PROVIDERS[id] ?? ALERT_PROVIDERS[id];
}

const CACHE_TTL_MS = 20 * 60_000;
const CACHE_MAX = 32;
const cache = new Map<string, { grid: WeatherGrid; at: number }>();
const inflight = new Map<string, Promise<WeatherGrid>>();

export function boundsKey(bounds: GeoBounds): string {
  return [bounds.west, bounds.south, bounds.east, bounds.north].map((v) => v.toFixed(1)).join(",");
}

/** Cached by provider + variable + region; one grid holds every forecast hour. */
export async function getGrid(
  providerId: string,
  variable: string,
  directionVariable: string | undefined,
  bounds: GeoBounds,
  cols: number,
  rows: number,
  signal: AbortSignal,
): Promise<WeatherGrid> {
  const provider = GRID_PROVIDERS[providerId];
  if (!provider) throw new Error(`No grid provider ${providerId}`);
  const hour = Math.floor(Date.now() / 3_600_000);
  const key = `${providerId}|${variable}|${directionVariable ?? ""}|${hour}|${boundsKey(bounds)}|${cols}x${rows}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.grid;
  const pending = inflight.get(key);
  if (pending) return pending;
  const request = provider
    .fetchGrid({ variable, directionVariable, bounds, cols, rows, signal })
    .then((grid) => {
      cache.set(key, { grid, at: Date.now() });
      if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
      return grid;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, request);
  return request;
}
