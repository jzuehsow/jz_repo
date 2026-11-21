import type { WeatherAlert } from "@/weather/models/WeatherFrame";
import {
  fetchWithTimeout,
  type AlertGeoJson,
  type AlertWeatherProvider,
} from "@/weather/providers/WeatherDataProvider";

const ALERTS_URL =
  (import.meta.env["VITE_NWS_ALERTS_URL"] as string | undefined) ??
  "https://api.weather.gov/alerts/active?status=actual&message_type=alert";

const MAX_ALERTS = 400;

interface NwsFeature {
  id?: string;
  geometry?: unknown;
  properties?: Record<string, unknown>;
}

const str = (value: unknown) => (typeof value === "string" ? value : undefined);

/** NWS active alerts (U.S. government, public domain). */
export const nwsAlertsProvider: AlertWeatherProvider = {
  capabilities: {
    id: "nws-alerts",
    name: "National Weather Service",
    coverage: "United States",
    variables: ["alerts"],
    timeRange: "Currently active",
    spatialResolution: "Alert polygons",
    temporalResolution: "As issued",
    attribution: "NOAA / National Weather Service",
    license: "U.S. Government work — public domain",
    sourceUrl: "https://www.weather.gov/documentation/services-web-api",
    requiresCredentials: false,
    delivers: ["vector"],
  },
  async fetchAlerts(signal) {
    const response = await fetchWithTimeout(ALERTS_URL, signal, 15_000, {
      headers: { Accept: "application/geo+json" },
    });
    const json = (await response.json()) as { features?: NwsFeature[] };
    const features = (json.features ?? []).filter((f) => f.geometry).slice(0, MAX_ALERTS);
    const alerts: WeatherAlert[] = [];
    const cleaned = features.map((feature, index) => {
      const p = feature.properties ?? {};
      const id = str(p["id"]) ?? feature.id ?? `alert-${index}`;
      alerts.push({
        id,
        event: str(p["event"]) ?? "Weather alert",
        severity: str(p["severity"]) ?? "Unknown",
        effective: str(p["effective"]),
        expires: str(p["expires"]),
        areaDesc: str(p["areaDesc"]),
        senderName: str(p["senderName"]),
        headline: str(p["headline"]),
        description: str(p["description"])?.slice(0, 600),
      });
      return { type: "Feature", geometry: feature.geometry, properties: { alertId: id } };
    });
    const geojson: AlertGeoJson = { type: "FeatureCollection", features: cleaned };
    return { geojson, alerts };
  },
};
