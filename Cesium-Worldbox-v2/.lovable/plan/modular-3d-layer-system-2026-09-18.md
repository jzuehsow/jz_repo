# Modular 3D Layer System

Add an optional 3D layer system to Cesium Worldbox so users can switch extra Earth content on and off, without changing how satellites, time controls, or 2D/3D switching work today.

## What the user sees

- A new **Layers** section in the left panel, above the search/filter controls, collapsible like the rest of the panel.
- Inside it, a **3D Layers** subsection with one toggle per layer:
  - Cesium OSM Buildings (off by default, needs a Cesium ion token)
  - Cesium World Terrain (off by default, needs a Cesium ion token; globe stays on the current flat ellipsoid when off)
  - Custom 3D Tiles (a small "Add source" form: name + tileset URL; no token needed)
- Each toggle shows its state: idle, loading, active, or a short note such as "Needs Cesium ion token" / "Failed to load". Toggles that need configuration are disabled with the reason visible, and nothing they do can break the globe.
- In 2D mode, building/terrain layers show a "3D only" note and are visually suspended; their on/off choice is remembered and reapplied when returning to 3D.

## Behaviour

- Nothing heavy loads until a user turns a layer on. Turning it off removes it from the scene and frees its resources.
- Repeated toggling or React rerenders never create duplicate copies of a layer.
- With every 3D layer off, satellite rendering and propagation behave exactly as they do now.
- Custom tileset URLs are kept in browser local storage so they survive a reload; no database or backend is added.

## Technical notes

New files:

```text
src/layers/LayerDefinition.ts     types: LayerDefinition, LayerRuntimeStatus, LayerProvider
src/layers/LayerManager.ts        framework-agnostic class holding Cesium handles per layer id
src/layers/defaultLayers.ts       built-in definitions (OSM Buildings, World Terrain)
src/layers/providers/CesiumIonLayerProvider.ts    Cesium3DTileset.fromIonAssetId
src/layers/providers/ThreeDTilesLayerProvider.ts  Cesium3DTileset.fromUrl
src/layers/providers/TerrainLayerProvider.ts      CesiumTerrainProvider / createWorldTerrainAsync
src/state/useLayers.ts            React state: enabled ids, statuses, custom sources
src/components/console/LayersPanel.tsx            UI section
```

`LayerDefinition` fields: `id`, `name`, `description`, `category`, `providerType`, `defaultEnabled`, `assetId?`, `url?`, `attribution?`, `requiresToken`, `recommendedRange?`, `supportsSceneMode2D`.

- `LayerManager` is constructed once inside `CesiumGlobe` after the viewer exists and stored in a ref, so it lives outside the render and preRender loops. It exposes `enable(def)`, `disable(id)`, `setSceneMode(mode)`, `destroyAll()`, and reports status through a callback. `enable` is idempotent and guards against out-of-order async resolution.
- Providers are code-split: each provider module is dynamically imported on first enable, so Cesium 3D Tiles/terrain code is not in the initial payload.
- Token handling: read `import.meta.env.VITE_CESIUM_ION_TOKEN` once; if present, set `Ion.defaultAccessToken`. If absent, ion-backed definitions report `requiresToken` unmet and their toggles stay disabled with an explanatory message. No credentials in source.
- Terrain layer swaps `viewer.scene.terrainProvider`; disabling restores `new EllipsoidTerrainProvider()` — the current default.
- `CesiumGlobe` gains props for the enabled layer set and a status callback; a `useEffect` diffs enabled ids against the manager's live set so only real changes trigger load/unload. Existing satellite primitives, orbit polyline, click picking, and morph logic are untouched.
- Cleanup on unmount calls `destroyAll()` before `viewer.destroy()`.
- Portability: no Lovable or Supabase dependency; ion is one optional provider among the URL-based ones.

## Verification

Typecheck, production build, then drive the running app in a browser: confirm the globe and satellites still render, toggle a custom 3D Tiles source on and off, confirm ion layers show the configuration message rather than erroring, and confirm 2D/3D switching still works with layers configured.

---

# Live Aircraft Layer (ADS-B)

A second, separate layer built on the same Layers panel: live aircraft from public ADS-B data, off by default.

## What the user sees

- A toggle **Aircraft — Live ADS-B** under 3D Layers, off by default.
- When on: aircraft appear around the current view, plus a small readout with aircraft count, data source name, and last refresh time in UTC.
- Clicking an aircraft opens the existing right-hand details panel with callsign, ICAO hex, registration, type, position, altitude, ground speed, heading, vertical rate, squawk, observation time, and source. Missing values show as "—".
- If the feed can't be reached, a short message appears in the Layers panel and everything else keeps working.

## Behaviour

- While off: no network requests, no timers, no aircraft in the scene.
- While on: one request for the region around the camera, then refresh every 12 seconds, or sooner when the camera moves a meaningful distance. No requests while the user is actively dragging.
- Capped at 1,200 rendered aircraft (configurable), prioritising those nearest the camera centre.
- Aircraft are live observations only — they are not moved by the satellite time simulation, and the details panel labels them with their own observation timestamp.

## Technical notes

```text
src/aircraft/models/AircraftObject.ts     identity + metadata
src/aircraft/models/AircraftState.ts      position/velocity/observation time
src/aircraft/providers/AircraftDataProvider.ts   interface + region query type
src/aircraft/providers/AdsbLolProvider.ts        default (ADSB.lol /v2/point/{lat}/{lon}/{radius})
src/aircraft/providers/AirplanesLiveProvider.ts  alternate, same interface
src/aircraft/services/aircraftService.ts  polling, abort, dedupe, cap, backoff, staleness
src/aircraft/components/AircraftLayer.tsx one component driving one Cesium primitive collection
src/domain/trackable.ts                   TrackableRef = { kind: 'SPACE_OBJECT' | 'AIRCRAFT', id }
```

- OpenSky is not the default provider; ADSB.lol is, with Airplanes.live selectable behind the same interface. Attribution is shown in the panel.
- Rendering: a single billboard collection (small aircraft glyph) rotated by track angle — no entity or DOM node per aircraft. Refreshes update existing billboards by ICAO hex, add new ones, and remove those absent for two cycles; the collection is only destroyed when the layer is turned off.
- Selection: `simulationStore` gains a `selection: TrackableRef | null` alongside the existing `selectedNoradId` behaviour, so satellite and aircraft details stay in distinct models. `DetailsPanel` branches on `selection.kind`.
- Reliability: 8-second request timeout, `AbortController` cancelled on disable/unmount, failure counter with exponential backoff, and a "data stale" note when the last good refresh ages past ~60 seconds.
- Polling state lives in the service (refs/module state), not React state, so refreshes don't rerender the console tree; only the count/status readout updates.

## Verification

Build and typecheck, then in a browser: confirm zero aircraft network requests with the toggle off, enable it and confirm aircraft render and refresh, select one and read its details, confirm satellites and 2D/3D switching are unaffected, and simulate a provider failure to confirm the globe stays operational.

---

# Object Thumbnails

Give every selected object a representative picture at the top of the right-hand details panel, shared across objects of the same family.

## What the user sees

- Selecting a satellite or aircraft shows a landscape (16:9) image above its name and type, then the existing details below.
- All Starlink satellites share one Starlink image; all 737-800s share one 737-800 image, and so on.
- Unknown objects get a clean generic satellite or aircraft placeholder — never a broken image.
- A small "i" control next to the image reveals source, attribution, and licence text without cluttering the panel.

## Behaviour

- Images load only for the currently selected object, lazily; nothing loads for the thousands of objects on the globe.
- A failed image swaps to the generic placeholder; the panel layout never shifts or distorts.

## Technical notes

```text
src/media/models/ObjectThumbnail.ts      key, objectCategory, modelFamily, constellation,
                                         imagePath, sourceUrl, sourceName, attribution,
                                         license, altText
src/media/data/objectThumbnails.ts       the seeded manifest (single source of truth)
src/media/services/thumbnailProvider.ts  resolveThumbnail(subject) with the match hierarchy
src/components/console/ObjectThumbnail.tsx  presentational frame + attribution popover
public/thumbnails/{satellites,aircraft,generic}/
```

- Resolution order: exact model family → constellation/spacecraft family → operator/platform family → object category → generic fallback. Name patterns (e.g. `STARLINK-*`, `A320*`) are normalised into a `modelFamily` key so no per-object entries are stored.
- Domain models gain optional `modelFamily?` and `thumbnailKey?` only; no image URLs enter `SpaceObject` or `AircraftObject`.
- Seed families: Starlink, OneWeb, Iridium NEXT, GPS, Galileo, GLONASS, ISS, NOAA/weather, generic GEO comms; A320/A330/A350, 737/747/777/787 families; plus generic satellite and aircraft placeholders.
- Licensing: only public-domain / NASA / Wikimedia-compatible imagery, each entry carrying its real source URL, attribution, and licence in the manifest. No general image-search scraping or hotlinking of arbitrary images. Files are fetched into `public/thumbnails/` where retrievable; any that cannot be fetched in this environment stay as a properly licensed remote URL and are listed explicitly as "still to cache locally" — no invented licences. Generic placeholders are generated in-house.
- The service is pure TypeScript with no Cesium or data-provider imports, so it stays portable and has no effect on rendering.

## Verification

Typecheck and build, then select several Starlink satellites, a GPS satellite, an aircraft, and an unrecognised object in the browser to confirm shared images, the fallback placeholder, the attribution control, and an unchanged panel layout.
