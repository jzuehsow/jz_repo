# Weather Layers + Hidden Empty Details Panel

Extend the app (no rebuild) with an optional, modular weather subsystem. Everything weather-related is OFF by default and makes zero requests, runs no timers, and creates no imagery layers until the user turns something on.

## What the user will see

- A new **WEATHER** group in the Layers panel, separate from 3D and Live tracking, with one toggle per product, plus a collapsible **Advanced Weather** subsection.
- Each active layer gets an opacity slider (default 60%) and a color legend (variable, units, scale min/max, forecast time, source).
- A compact **WEATHER TIME** control appears only when a forecast layer is on: Current, previous/next frame, play/pause, UTC timestamp, offset (+3h, +6h...). It runs separately from the satellite clock.
- A unit selector (°F/°C, mph/kt/km/h, in/mm, hPa).
- A notice when 3 or more full-screen heatmaps are stacked.
- US-only layers are labelled as US-only (for example "Radar — United States").
- A problem with one layer shows a short message on that layer only (for example "Temperature data temporarily unavailable"). Nothing else in the app is affected.
- **Selected Object panel:** it no longer appears at all when nothing is selected, and it goes away as soon as you deselect. Weather items never open it; weather alerts get their own small popup.

## Products and sources

**Open-Meteo** (global model data, free and open, CC BY 4.0, no key):
- Core: Temperature, Feels-like, Precipitation, Rain, Snowfall, Snow depth, Precip probability, Cloud cover (total/low/mid/high), Wind speed plus direction arrows, Wind gusts, Humidity, Sea-level pressure, Surface pressure, Visibility
- Severe: CAPE, Lifted Index, CIN, Freezing level
- Advanced: Dew point, Wet-bulb (only if the API offers it), UV index, Solar radiation, Sunshine duration, Soil temperature, Soil moisture

**NOAA / NWS** (US government data, public domain):
- Radar — United States: NOAA nowCOAST radar WMS, with animated recent frames where the service offers timestamps
- Weather Alerts — United States: polygons from api.weather.gov
- Sea Surface Temperature — NOAA (nowCOAST WMS)
- Tropical Cyclones — NOAA (nowCOAST)

**Global satellite clouds:** NASA GIBS WMTS (public), used for satellite cloud imagery.

**Not included:** RainViewer and any other source limited to personal use. Any product without a working source is left out of the panel instead of shown as a checkbox that does nothing. Lightning density and marine wave height are included only if a free source that allows this use can be confirmed during the build. Otherwise they are listed as not available.

## Technical details

New `src/weather/` module, following the same pattern as layers and aircraft:

```text
weather/
  models/      WeatherLayerDefinition, WeatherFrame, WeatherProviderCapabilities,
               WeatherAlert (separate type, never a SpaceObject), units, colorScales
  providers/   WeatherDataProvider (interface), OpenMeteoProvider,
               NoaaWeatherProvider (alerts), WmsWeatherProvider, TileWeatherProvider (WMTS/GIBS)
  services/    weatherService (frames/time, cache, abort), weatherLayerManager
               (Cesium imagery lifecycle), weatherRasterService (grid -> canvas)
  state/       useWeather (enabled ids, opacity, units, weather time, statuses)
  components/  WeatherLayerControls, WeatherLegend, WeatherTimeControl, WeatherAlertPopup
```

- **Provider capabilities** describe: id, name, coverage, variables, time range, spatial and time resolution, attribution, license, source URL, whether a key is needed, and what it serves (tiles, WMS, WMTS, raster, vector, point/grid values).
- **How Open-Meteo layers are drawn:** take the visible area from the camera, build a sample grid capped at about 400 points (denser when zoomed in), make one batched multi-location request, draw the values into a canvas with bilinear interpolation, then show it as a `SingleTileImageryProvider` for that area. When the camera moves, a refresh waits 600ms and fires after `moveEnd`, and any older request still in flight is cancelled. Results are cached by provider, variable, forecast hour and rounded area. Wind arrows use one reused BillboardCollection.
- **Weather time:** available frames come from the provider's hourly timestamps, so no future frames are made up. With several layers on, only the range they all share is used, and layers that cannot cover it are flagged. Weather has its own clock, and there is a hook where it could later be tied to the simulation clock.
- **Radar and alerts:** loaded only when turned on. Radar keeps at most 12 frames in memory. Alerts are a GeoJSON DataSource. The pick handler recognises `{kind:"WEATHER_ALERT"}` and opens the alert popup, not the object details panel.
- **CesiumGlobe** only creates the WeatherLayerManager next to the existing LayerManager and forwards sync, scene-mode and pick events. No weather logic lives in the globe file. Weather imagery layers sit above the base map and do not affect satellites, aircraft, 3D tiles or terrain.
- **Resilience:** requests use timeouts and back off on errors or rate limits, and each layer reports its own status. If the NWS API needs a server-side relay because of browser restrictions (as the aircraft feed did), a small same-origin relay route will be added, matching `api/aircraft`.
- **Attribution:** an unobtrusive credits line lists the active weather sources.
- **Details panel:** in WorldboxConsole, the right-hand panel is only rendered when a satellite or aircraft is selected.

## Verification

- Type check and dev build pass.
- In the browser: no weather requests while everything is off. Temperature, precipitation, clouds and wind all display. Radar and alerts work over the US. Opacity, legend and weather time behave as described. Satellites, aircraft and 2D/3D still work. The details panel is hidden when nothing is selected.
