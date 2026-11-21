import type { ImageryWeatherProvider } from "@/weather/providers/WeatherDataProvider";

function yesterdayUtc(): string {
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
}

/** NASA GIBS WMTS (open, no key) — daily true-colour satellite imagery. */
export const gibsTileProvider: ImageryWeatherProvider = {
  capabilities: {
    id: "nasa-gibs",
    name: "NASA GIBS",
    coverage: "Global",
    variables: ["satellite-true-color"],
    timeRange: "Previous UTC day",
    spatialResolution: "250 m",
    temporalResolution: "Daily",
    attribution: "Imagery by NASA EOSDIS GIBS",
    license: "NASA open data — no restrictions on use",
    sourceUrl: "https://earthdata.nasa.gov/gibs",
    requiresCredentials: false,
    delivers: ["wmts", "tiles"],
  },
  createImageryProvider(Cesium, serviceLayer) {
    return new Cesium.UrlTemplateImageryProvider({
      url: `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/${serviceLayer}/default/${yesterdayUtc()}/250m/{z}/{y}/{x}.jpg`,
      tilingScheme: new Cesium.GeographicTilingScheme(),
      maximumLevel: 8,
      tileWidth: 512,
      tileHeight: 512,
    });
  },
};
