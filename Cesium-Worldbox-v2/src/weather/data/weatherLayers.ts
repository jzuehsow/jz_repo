import type { WeatherLayerDefinition } from "@/weather/models/WeatherLayerDefinition";

type GridSpec = Omit<WeatherLayerDefinition, "providerId" | "kind" | "coverage" | "forecast" | "fullScreenRaster" | "defaultOpacity"> &
  Partial<Pick<WeatherLayerDefinition, "fullScreenRaster" | "defaultOpacity">>;

const grid = (spec: GridSpec): WeatherLayerDefinition => ({
  providerId: "open-meteo",
  kind: "grid-raster",
  coverage: "Global",
  forecast: true,
  fullScreenRaster: true,
  defaultOpacity: 0.6,
  ...spec,
});

/**
 * Every entry here has a working, openly licensed provider. Products without
 * one (e.g. wave height) are intentionally absent rather than shown disabled.
 */
export const WEATHER_LAYERS: WeatherLayerDefinition[] = [
  // Core
  grid({ id: "wx-temperature", name: "Temperature", description: "2 m air temperature.", group: "CORE", variable: "temperature_2m", quantity: "temperature", scale: "temperature" }),
  grid({ id: "wx-apparent", name: "Feels-like temperature", description: "Apparent temperature.", group: "CORE", variable: "apparent_temperature", quantity: "temperature", scale: "temperature" }),
  grid({ id: "wx-precip", name: "Precipitation", description: "Total precipitation, previous hour.", group: "CORE", variable: "precipitation", quantity: "precip", scale: "precip", fullScreenRaster: false, defaultOpacity: 0.75 }),
  grid({ id: "wx-rain", name: "Rain", description: "Large-scale rain, previous hour.", group: "CORE", variable: "rain", quantity: "precip", scale: "precip", fullScreenRaster: false, defaultOpacity: 0.75 }),
  grid({ id: "wx-showers", name: "Showers", description: "Convective showers, previous hour.", group: "CORE", variable: "showers", quantity: "precip", scale: "precip", fullScreenRaster: false, defaultOpacity: 0.75 }),
  grid({ id: "wx-precip-prob", name: "Precipitation probability", description: "Chance of precipitation.", group: "CORE", variable: "precipitation_probability", quantity: "percent", scale: "probability", fullScreenRaster: false }),
  grid({ id: "wx-snowfall", name: "Snowfall", description: "Snowfall, previous hour.", group: "CORE", variable: "snowfall", quantity: "snowfall", scale: "snowfall", fullScreenRaster: false, defaultOpacity: 0.8 }),
  grid({ id: "wx-snow-depth", name: "Snow depth", description: "Snow on the ground.", group: "CORE", variable: "snow_depth", quantity: "depth", scale: "snowDepth", fullScreenRaster: false, defaultOpacity: 0.8 }),
  grid({ id: "wx-cloud", name: "Cloud cover", description: "Total cloud cover.", group: "CORE", variable: "cloud_cover", quantity: "percent", scale: "cloud", fullScreenRaster: false, defaultOpacity: 0.7 }),
  grid({ id: "wx-cloud-low", name: "Low cloud", description: "Cloud cover below ~3 km.", group: "CORE", variable: "cloud_cover_low", quantity: "percent", scale: "cloud", fullScreenRaster: false, defaultOpacity: 0.7 }),
  grid({ id: "wx-cloud-mid", name: "Mid cloud", description: "Cloud cover ~3–8 km.", group: "CORE", variable: "cloud_cover_mid", quantity: "percent", scale: "cloud", fullScreenRaster: false, defaultOpacity: 0.7 }),
  grid({ id: "wx-cloud-high", name: "High cloud", description: "Cloud cover above ~8 km.", group: "CORE", variable: "cloud_cover_high", quantity: "percent", scale: "cloud", fullScreenRaster: false, defaultOpacity: 0.7 }),
  grid({ id: "wx-wind", name: "Wind", description: "10 m wind speed with direction arrows.", group: "CORE", variable: "wind_speed_10m", directionVariable: "wind_direction_10m", quantity: "speed", scale: "wind" }),
  grid({ id: "wx-gusts", name: "Wind gusts", description: "10 m wind gusts.", group: "CORE", variable: "wind_gusts_10m", quantity: "speed", scale: "wind" }),
  grid({ id: "wx-humidity", name: "Humidity", description: "2 m relative humidity.", group: "CORE", variable: "relative_humidity_2m", quantity: "percent", scale: "humidity" }),
  grid({ id: "wx-pressure", name: "Sea-level pressure", description: "Mean sea-level pressure.", group: "CORE", variable: "pressure_msl", quantity: "pressure", scale: "pressure" }),
  grid({ id: "wx-surface-pressure", name: "Surface pressure", description: "Pressure at ground level.", group: "CORE", variable: "surface_pressure", quantity: "pressure", scale: "surfacePressure" }),
  grid({ id: "wx-visibility", name: "Visibility", description: "Horizontal visibility; low values highlighted.", group: "CORE", variable: "visibility", quantity: "visibility", scale: "visibility", fullScreenRaster: false }),

  // Observed / imagery
  {
    id: "wx-radar-us", name: "Radar — United States", description: "Latest NEXRAD base reflectivity mosaic.",
    group: "OBSERVED", providerId: "noaa-nowcoast", kind: "wms", serviceLayer: "weather_radar:base_reflectivity_mosaic",
    quantity: "reflectivity", scale: "radar", coverage: "United States", forecast: false, fullScreenRaster: false, defaultOpacity: 0.75,
  },
  {
    id: "wx-alerts-us", name: "Weather Alerts — United States", description: "Active NWS warnings, watches and advisories.",
    group: "OBSERVED", providerId: "nws-alerts", kind: "alerts", coverage: "United States", forecast: false, fullScreenRaster: false, defaultOpacity: 0.45,
  },
  {
    id: "wx-lightning-us", name: "Lightning density — NOAA", description: "Recent lightning strike density.",
    group: "OBSERVED", providerId: "noaa-nowcoast", kind: "wms", serviceLayer: "lightning_detection:ldn_lightning_strike_density",
    coverage: "United States & adjacent waters", forecast: false, fullScreenRaster: false, defaultOpacity: 0.8,
  },
  {
    id: "wx-satellite-ir", name: "Satellite clouds (infrared)", description: "Global geostationary longwave IR mosaic.",
    group: "OBSERVED", providerId: "noaa-nowcoast", kind: "wms", serviceLayer: "satellite:global_longwave_imagery_mosaic",
    coverage: "Global", forecast: false, fullScreenRaster: true, defaultOpacity: 0.6,
  },
  {
    id: "wx-satellite-truecolor", name: "Satellite true colour — NASA", description: "Previous-day MODIS Terra imagery.",
    group: "OBSERVED", providerId: "nasa-gibs", kind: "wmts", serviceLayer: "MODIS_Terra_CorrectedReflectance_TrueColor",
    coverage: "Global", forecast: false, fullScreenRaster: true, defaultOpacity: 0.7,
  },
  {
    id: "wx-tropical", name: "Tropical Cyclones — NOAA", description: "Active storms, forecast cones and tracks.",
    group: "OBSERVED", providerId: "noaa-nowcoast", kind: "wms",
    serviceLayer: "tropical_cyclones:tropical_cyclone_cone_of_uncertainty_forecast,tropical_cyclones:tropical_cyclone_track_forecast,tropical_cyclones:active_tropical_cyclones",
    coverage: "Atlantic & Pacific basins (NHC)", forecast: false, fullScreenRaster: false, defaultOpacity: 0.9,
  },
  {
    id: "wx-sst", name: "Sea Surface Temperature — NOAA", description: "Global SST analysis.",
    group: "OBSERVED", providerId: "noaa-nowcoast", kind: "wms", serviceLayer: "sea_surface_temperature:global_sea_surface_temperature",
    coverage: "Global oceans", forecast: false, fullScreenRaster: true, defaultOpacity: 0.65,
  },

  // Severe
  grid({ id: "wx-cape", name: "CAPE", description: "Convective available potential energy.", group: "SEVERE", variable: "cape", quantity: "energy", scale: "cape", fullScreenRaster: false, defaultOpacity: 0.7 }),
  grid({ id: "wx-lifted", name: "Lifted Index", description: "Negative = unstable air.", group: "SEVERE", variable: "lifted_index", quantity: "index", scale: "liftedIndex" }),
  grid({ id: "wx-cin", name: "Convective inhibition", description: "Energy resisting convection.", group: "SEVERE", variable: "convective_inhibition", quantity: "energy", scale: "cin", fullScreenRaster: false }),
  grid({ id: "wx-freezing", name: "Freezing level", description: "Height of the 0 °C level.", group: "SEVERE", variable: "freezing_level_height", quantity: "height", scale: "freezing" }),

  // Advanced
  grid({ id: "wx-dewpoint", name: "Dew point", description: "2 m dew point.", group: "ADVANCED", variable: "dew_point_2m", quantity: "temperature", scale: "temperature" }),
  grid({ id: "wx-wetbulb", name: "Wet-bulb temperature", description: "2 m wet-bulb temperature.", group: "ADVANCED", variable: "wet_bulb_temperature_2m", quantity: "temperature", scale: "temperature" }),
  grid({ id: "wx-uv", name: "UV index", description: "Ultraviolet index.", group: "ADVANCED", variable: "uv_index", quantity: "index", scale: "uv" }),
  grid({ id: "wx-radiation", name: "Solar radiation", description: "Shortwave radiation.", group: "ADVANCED", variable: "shortwave_radiation", quantity: "radiation", scale: "radiation", fullScreenRaster: false }),
  grid({ id: "wx-sunshine", name: "Sunshine duration", description: "Sunshine within the hour.", group: "ADVANCED", variable: "sunshine_duration", quantity: "duration", scale: "sunshine", fullScreenRaster: false }),
  grid({ id: "wx-soil-temp", name: "Soil temperature", description: "Surface soil temperature.", group: "ADVANCED", variable: "soil_temperature_0cm", quantity: "temperature", scale: "temperature" }),
  grid({ id: "wx-soil-moisture", name: "Soil moisture", description: "Soil moisture 0–1 cm.", group: "ADVANCED", variable: "soil_moisture_0_to_1cm", quantity: "moisture", scale: "soilMoisture" }),
];

export const WEATHER_GROUP_LABELS: Record<WeatherLayerDefinition["group"], string> = {
  CORE: "Forecast",
  OBSERVED: "Observations & imagery",
  SEVERE: "Severe weather",
  ADVANCED: "Advanced weather",
};
