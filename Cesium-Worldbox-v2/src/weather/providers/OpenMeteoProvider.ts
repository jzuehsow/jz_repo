import type { WeatherGrid } from "@/weather/models/WeatherFrame";
import { fetchWithTimeout, type GridWeatherProvider } from "@/weather/providers/WeatherDataProvider";

const BASE_URL =
  (import.meta.env["VITE_OPEN_METEO_URL"] as string | undefined) ??
  "https://api.open-meteo.com/v1/forecast";

const FORECAST_HOURS = 48;

interface OpenMeteoLocation {
  hourly?: Record<string, Array<number | null> | undefined> & { time?: number[] };
}

/** Global numerical model data (CC BY 4.0), batched multi-location requests. */
export const openMeteoProvider: GridWeatherProvider = {
  capabilities: {
    id: "open-meteo",
    name: "Open-Meteo",
    coverage: "Global",
    variables: [],
    timeRange: `Current hour to +${FORECAST_HOURS} h`,
    spatialResolution: "Model-native 1–11 km, sampled on a camera-aware grid",
    temporalResolution: "Hourly",
    attribution: "Weather data by Open-Meteo.com",
    license: "CC BY 4.0",
    sourceUrl: "https://open-meteo.com/",
    requiresCredentials: false,
    delivers: ["grid-values"],
  },

  async fetchGrid({ variable, directionVariable, bounds, cols, rows, signal }) {
    const lats: string[] = [];
    const lons: string[] = [];
    for (let r = 0; r < rows; r += 1) {
      const lat = bounds.north - ((bounds.north - bounds.south) * r) / (rows - 1);
      for (let c = 0; c < cols; c += 1) {
        let lon = bounds.west + ((bounds.east - bounds.west) * c) / (cols - 1);
        if (lon > 180) lon -= 360;
        lats.push(lat.toFixed(2));
        lons.push(lon.toFixed(2));
      }
    }
    const hourly = directionVariable ? `${variable},${directionVariable}` : variable;
    const params = new URLSearchParams({
      latitude: lats.join(","),
      longitude: lons.join(","),
      hourly,
      forecast_hours: String(FORECAST_HOURS),
      timeformat: "unixtime",
      timezone: "GMT",
      cell_selection: "nearest",
    });
    const response = await fetchWithTimeout(`${BASE_URL}?${params.toString()}`, signal, 15_000);
    const json = (await response.json()) as OpenMeteoLocation | OpenMeteoLocation[];
    const locations = Array.isArray(json) ? json : [json];
    const times = (locations[0]?.hourly?.time ?? []).map((t) => t * 1000);
    const count = cols * rows;
    const values = times.map(() => new Float32Array(count).fill(Number.NaN));
    const directions = directionVariable ? times.map(() => new Float32Array(count).fill(Number.NaN)) : undefined;
    locations.forEach((location, index) => {
      const series = location.hourly?.[variable];
      const dir = directionVariable ? location.hourly?.[directionVariable] : undefined;
      for (let t = 0; t < times.length; t += 1) {
        const v = series?.[t];
        if (typeof v === "number") values[t]![index] = v;
        const d = dir?.[t];
        if (directions && typeof d === "number") directions[t]![index] = d;
      }
    });
    const grid: WeatherGrid = { bounds, cols, rows, times, values, directions };
    return grid;
  },
};
