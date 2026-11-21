export type WeatherDelivery = "tiles" | "wms" | "wmts" | "raster" | "vector" | "grid-values";

/** Self-description every weather provider publishes; plain data, no Cesium. */
export interface WeatherProviderCapabilities {
  id: string;
  name: string;
  coverage: string;
  variables: string[];
  timeRange: string;
  spatialResolution: string;
  temporalResolution: string;
  attribution: string;
  license: string;
  sourceUrl: string;
  requiresCredentials: boolean;
  delivers: WeatherDelivery[];
}
