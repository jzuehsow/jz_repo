import type { ImageryWeatherProvider } from "@/weather/providers/WeatherDataProvider";

const NOWCOAST_URL =
  (import.meta.env["VITE_NOWCOAST_WMS_URL"] as string | undefined) ??
  "https://nowcoast.noaa.gov/geoserver/ows";

/** NOAA nowCOAST WMS (U.S. government, public domain). */
export const nowCoastWmsProvider: ImageryWeatherProvider = {
  capabilities: {
    id: "noaa-nowcoast",
    name: "NOAA nowCOAST",
    coverage: "United States (radar, lightning) · Global (satellite IR, SST)",
    variables: ["radar", "lightning", "satellite", "sst", "tropical-cyclones"],
    timeRange: "Latest analysis / observation",
    spatialResolution: "Product-native",
    temporalResolution: "Minutes to daily",
    attribution: "NOAA / NWS nowCOAST",
    license: "U.S. Government work — public domain",
    sourceUrl: "https://nowcoast.noaa.gov/",
    requiresCredentials: false,
    delivers: ["wms"],
  },
  createImageryProvider(Cesium, serviceLayer) {
    return new Cesium.WebMapServiceImageryProvider({
      url: NOWCOAST_URL,
      layers: serviceLayer,
      parameters: { transparent: true, format: "image/png", version: "1.1.1" },
      tileWidth: 512,
      tileHeight: 512,
    });
  },
};
