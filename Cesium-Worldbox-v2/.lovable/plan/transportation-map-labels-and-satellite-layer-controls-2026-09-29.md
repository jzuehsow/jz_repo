# Transportation, Map Labels, and Satellite Layer Controls

Extends the existing Layers system. Nothing is rebuilt. Every new layer is OFF by default except Geographic Labels, and each one loads only when turned on.

## Build order (tested after each step)
1. Satellites can be fully turned on and off, with child layers for Orbit Paths, Labels, Debris, and Rocket Bodies
2. Airports reference layer
3. Origin and destination airports for the selected flight
4. Ports reference layer
5. Known origin and destination ports for the selected ship
6. Country borders and country names
7. Capitals, states/provinces, and cities that appear by zoom level
8. Common Flight Routes, shown as reference only
9. Major Shipping Lanes
10. Performance pass and regression check

## Layers panel structure
Collapsible sections: SPACE, AIR, MARITIME, TRANSPORTATION, MAP LABELS, WEATHER, 3D. The panel keeps its current width and style.

## Data sources (open data, bundled as small simplified files)
- **Airports:** OurAirports (public domain). Only large and medium airports plus seaplane/regional airports that have an IATA code, around 4-5k in total, bundled as compact JSON. Tiers: large airports show at global zoom, medium at regional zoom, and small ones only up close.
- **Ports:** World Port Index from NGA (public domain), bundled as a subset of about 3.7k ports ranked by harbor size (Large, Medium, Small, Very small).
- **Common Flight Routes:** OpenFlights routes.dat (ODbL, last updated 2014, with that date shown clearly). Airport pairs are grouped and ranked by how many airlines fly them. Only the top routes are drawn from far away, and more appear as you zoom in. They are drawn as curved lines that follow the Earth. The layer is labelled "Reference Flight Routes — not live ATC routes, flight plans, or airways."
- **Major Shipping Lanes:** Global Shipping Lanes from Zenodo/Benden (CC BY 4.0), simplified to GeoJSON, with Major, Middle, and Minor tiers by zoom. These lines are thin and muted so they don't compete with a selected ship's track.
- **Geography:** Natural Earth (public domain). Country borders at 110m and 50m detail, Admin-1 (states and provinces) at 50m, and populated places filtered by rank. The globe switches to more detailed outlines as you zoom in. The 10m detail level is skipped to keep downloads small; this can be added later if needed.

## Zoom behavior (by camera height)
- Above ~9,000 km: no borders or labels
- ~9,000 to 2,500 km: countries, country names, and ★ national capitals
- ~2,500 to 800 km: states/provinces and major cities
- Below 800 km: more cities and towns
- Labels are ranked in this order: selected object's endpoints > capitals > major airports/ports > cities > regional capitals > others. Overlapping labels are hidden after the camera stops moving.

## Selected-object endpoints
- Flights reuse the adsb.im route lookup. The origin and destination airports are always shown with code labels (for example "IAD / KIAD"). If the Airports layer is on, the matching markers there are highlighted instead of added twice. The markers are removed when the flight is deselected.
- Ships use the AIS destination only, matched to the ports list by UN/LOCODE or name. The origin shows as "Unknown" unless the source actually provides it. The ship's past positions are never used to guess an origin.
- Clicking reference features (airports, ports, labels, routes, lanes) never opens the Selected Object panel.

## Satellites off
- Removes the point collection, orbit line, marker, and label, and clears a selected satellite.
- Skips the propagation step every frame and pauses the CelesTrak refresh. The catalog stays in memory.
- Child toggles are greyed out, and your choices are restored when you turn Satellites back on.

## Technical details
- New modules:
  - `src/transportation/{models,providers,render}`: Airport/Port providers, `ShippingLaneProvider`, `GlobalShippingLanesProvider`, `FlightRouteProvider`, and `OpenFlightsRouteProvider`
  - `src/geography/{models,providers,render}`: Country, AdministrativeRegion, PopulatedPlace, GeographyProvider, and NaturalEarthProvider
- Data is stored under `public/data/{airports,ports,routes,lanes,geo}/*.json`. It is fetched only when a layer is enabled, and the fetch is cancelled when the layer is turned off.
- Rendering uses Cesium `BillboardCollection`/`LabelCollection`/`PolylineCollection` primitives with `distanceDisplayCondition`, `scaleByDistance`, and `translucencyByDistance`. The level-of-detail swap and decluttering run on camera `moveEnd`.
- A reference-layer controller follows the same `enable`/`disable` pattern as the aircraft and vessel layers. `CesiumGlobe` sends the enabled IDs, and nothing new runs inside React render.
- Shipping-lane providers are designed so a future Shipping Traffic Density raster layer can be added separately (not built now).
- Satellite enable is gated in the `CesiumGlobe` tick, and `useCatalog` refresh pauses while satellites are off.
- Each dataset is fetched once in the sandbox, simplified with a script, and committed. Source, version, and license are recorded in a manifest shown in the Layers panel.
