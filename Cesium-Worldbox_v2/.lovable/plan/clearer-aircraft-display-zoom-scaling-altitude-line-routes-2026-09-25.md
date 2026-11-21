# Clearer Aircraft Display: Zoom Scaling, Altitude Line, Routes

This builds on the existing aircraft layer rather than replacing it. Nothing here adds work while aircraft are off. Route details and extra lines are fetched and drawn only for the one aircraft you select.

## What you will see

- **Planes that resize with zoom.** From far away, planes are small, faint dots. As you zoom in they grow smoothly into the oriented plane icon, and a size cap stops them getting huge at airport level. Where many planes overlap, the unselected ones shrink and fade so the area stays readable. Every plane is still there and clickable.
- **Labels kept quiet.** Callsigns never appear for every plane. Only the selected plane gets a label, and it hides when zoomed far out.
- **Altitude line.** The selected plane gets a vertical line down to its spot on the ground, with the altitude written beside it.
- **Estimated altitude when the feed has none.**
  - If the plane type is known, the typical cruise altitude for that family is shown, marked clearly, e.g. "~35,000 ft — typical cruise (estimated)".
  - Planes reported on the ground, or slow and low, are never given a cruise altitude.
  - Unknown types use a general airliner value only if the plane is moving at cruise speed; otherwise altitude shows as unavailable.
- **Route in the details panel:** origin and destination airport names with their IATA/ICAO codes (for example IAD / KIAD → LAX / KLAX), plus departure and arrival details where the source provides them. The route source is shown, and the panel says "Route unavailable" when no data comes back.
- **Flight path on the globe:**
  - **Solid line:** the path already flown, drawn only from positions the feed actually reported this session. No points are made up.
  - **Dashed line:** labelled "Estimated remaining route", drawn along the globe's curve from the plane to the destination.
  - **If no history exists yet:** a faint dotted line from the origin to the plane, labelled "approximate, not observed".
- **Airport markers:** the origin and destination airports get a marker with name and code while the flight is selected. They disappear when you deselect.

## Data sources

- **Routes:** ADSB.lol's open route lookup (ODbL, the same provider as the aircraft feed), which takes a callsign and position and returns origin, destination and airport details. It goes through the existing same-origin relay and is cached by callsign. If it fails, only the route area says "Route unavailable".
- **History:** built from the aircraft layer's own refreshes. This session's reported positions for the selected plane are kept, capped at the last 200 points per plane and 300 planes. No extra requests are made for this.
- **Type data:** a small, editable table of common aircraft types: manufacturer, model, typical cruise altitude and speed, and matching picture. The families covered are A320, 737, widebodies, regional jets, turboprops and business jets.

## Technical details

```text
src/aircraft/
  models/     AircraftRoute.ts, AircraftTypeMetadata.ts, AircraftTrackPoint.ts, Airport
  data/       aircraftTypes.ts (ICAO type -> metadata, family fallbacks)
  services/   aircraftMetadataService.ts (resolveAltitude -> {ft, source:"REPORTED"|"ESTIMATED"|"UNAVAILABLE"})
              aircraftRouteService.ts (provider interface + ADSB.lol routeset impl, cache, abort)
              aircraftHistoryStore.ts (bounded per-hex ring buffers fed by aircraftService)
  render/     aircraftRouteLayer.ts, aircraftAltitudeLine.ts (plain classes, like the existing controller)
src/routes/api/aircraft-route.ts  same-origin relay to the ADSB.lol routeset endpoint (validated input)
```

- **AircraftRoute** fields: aircraftId, callsign, originAirport, destinationAirport, historicalTrackPoints, estimatedFuturePoints, routeSource, observedThrough, isEstimated. The route provider interface leaves room for a future source that supplies real flight-plan waypoints.
- **Scaling:** the billboards get `scaleByDistance` (NearFarScalar 5e4→1.0, 8e6→0.25) and `translucencyByDistance` (fade toward 0.55 far away). These run inside Cesium on the graphics card, so there are no per-frame React updates.
- **Decluttering:**
  - The label uses `distanceDisplayCondition` so it only appears within about 3,000 km.
  - A throttled screen-space check (every 1.5 s after the camera stops) shrinks and fades unselected planes whose screen positions overlap. It only changes existing billboards.
- **Selected-flight drawing:** one reused primitive set:
  - the altitude line
  - the flown path (solid, clamped to the plane's reported altitude)
  - the remaining path, drawn along the globe's curve (`PolylineDashMaterialProperty`, `ArcType.GEODESIC`)
  - the two airport markers with labels

  It is rebuilt only when the selection changes or on each refresh, and cleared completely when you deselect.
- **Where the logic lives:** CesiumGlobe only creates the route layer and altitude line next to the existing aircraft controller. The logic lives in the new modules.
- **Details panel:** AircraftDetailsPanel gains a Route block and an altitude row labelled Reported, Estimated or Unavailable. The picture now comes from the type table's matching picture first.

## Verification

- The type check and a development build pass.
- In the browser:
  - planes are small when zoomed far out and larger when zoomed in
  - selecting a plane shows the altitude line, the route in the panel, the solid and dashed paths, and the airport markers
  - deselecting removes all of them
  - satellites, weather, 3D layers, search, pictures and the time controls still work as before

---

# Part 2: Ships / AIS layer

A new **Maritime** section in Layers with a **Ships / AIS** toggle, off by default. While it is off, there are no requests, no timers and nothing drawn. It works like the aircraft layer but is kept fully separate from it.

## Data sources

The app needs AIS sources that are free to use and not scraped.

- **Default, no key needed:** Fintraffic Digitraffic open AIS (CC BY 4.0).
  - Covers the Baltic Sea and Gulf of Finland only, and is labelled "Coverage: Baltic Sea" so it never looks global.
  - Provides live positions, recent position history, destination, ETA, size, draught and ship type.
- **Optional global source:** AISStream.io, which needs a free API key.
  - When you add a key, it is stored as a private setting and used only by the app's server. Without it the option says "Needs API key" and the rest of the app keeps working.
  - I can add the key setup after the build if you want worldwide ships.
- Because providers are swappable, replacing a source doesn't touch the globe code.

## What you will see

- **Ship markers** drawn at sea level:
  - tiny dots when zoomed far out
  - arrow-shaped ship icons in regional views
  - larger symbols up close
  - sizes change smoothly, with the same crowding control as aircraft, so busy ports stay readable
- **Orientation:** icons point by true heading, then course over ground if heading is missing, and face a neutral direction if neither is reported.
- **Colors by category:** Cargo, Container, Tanker, Passenger, Cruise, Ferry, Tug, Fishing, Pleasure craft, Military/Government, Other, Unknown. The categories are ready for filtering later.
- **Selecting a ship** opens the details panel with:
  - name, MMSI, IMO, callsign, type and flag
  - position, speed, heading, course and navigation status
  - draught, length and beam
  - destination, ETA, last updated and source
  - a picture for its ship type

  Missing values show "—", and the panel still hides when nothing is selected.
- **Origin and destination:**
  - The destination comes from the ship's own reported data.
  - Origin shows as "Unknown" unless the source actually reports it. It is never guessed from where the ship was first seen.
  - When a port is known, it gets a temporary marker with name, UN/LOCODE and country while the ship is selected.
- **Track lines:**
  - A solid line shows the ship's real reported positions: the provider's history plus what the app collects this session.
  - The remaining route is not drawn as a straight line. There is no reliable sea-routing source, so the panel shows "Detailed route data unavailable" and only the destination marker, never a line across land.
- **Ship pictures:** 7 new original illustrations: container ship, tanker, cargo, cruise, ferry, fishing and tug, plus a generic ship. Each keeps its attribution, license and description, and goes through the existing picture matching.

## Technical details

```text
src/maritime/
  models/     VesselObject, VesselState, VesselRoute, VesselTypeMetadata, Port
  providers/  MaritimeDataProvider (interface: fetchRegion(bounds), fetchTrack?(mmsi), capabilities)
              DigitrafficAisProvider (default), AisStreamProvider (key-gated, via server)
  services/   maritimeService (polling 60 s, backoff, stale after 15 min, max 2,000 rendered, moveEnd-only)
              vesselRouteService (history + ports; no future line without real routing)
              vesselMetadataService (AIS ship-type code -> category, thumbnailKey)
  render/     vesselLayerController (one BillboardCollection, reused, heightReference NONE at ~2 m)
              vesselRouteLayer (selected-only)
src/routes/api/vessels.ts   same-origin relay (bounds-validated) for providers that block browsers or need a key
```

- **Selection:** the selection types gain `VESSEL`, and the pick id is `{kind:"VESSEL", mmsi}`. Selecting a ship clears satellite and aircraft selection, and selecting either of those clears the ship.
- **New picture files:** `public/thumbnails/vessels/` holds the new ship pictures, with entries in the existing picture list.
