# Cesium Worldbox

Create a new application called **Cesium Worldbox**.

Build an MVP space-domain visualization application using React, TypeScript, and CesiumJS. It should be an original operational UI inspired by modern space-domain-awareness tools, not a copy of another product.

Core MVP:
- 3D Cesium Earth as the primary view plus Cesium-native 2D Earth mode.
- Display roughly 500-1,000 active satellites using public CelesTrak-compatible TLE/OMM orbital-element data. If live access is problematic in preview, implement a provider abstraction plus realistic sample data so the MVP works end to end.
- Use SGP4 propagation (for example satellite.js) to calculate estimated positions.
- Support current position and time simulation from now through +30 days. Future states must be labeled propagated estimates.
- Time controls: UTC time, play/pause, speed, scrub/slider, reset to now.
- Search by satellite name/NORAD ID; filters for LEO/MEO/GEO, object type, and operator/constellation when available.
- Select a satellite to show details including name, NORAD ID, COSPAR ID, type, operator, epoch, lat/lon/altitude, inclination, period, apogee/perigee, and source when available.
- Show orbit/trajectory for the selected object.
- Use lightweight markers/models and design for future scaling to thousands of objects.

Portability is a hard requirement. This application will later integrate into a different parent application. Do NOT tightly couple it to Lovable-specific infrastructure or Supabase and do not enable a database unless persistence is genuinely required. Use clean TypeScript interfaces so Cesium does not care whether data comes from CelesTrak, local sample data, REST APIs, or a future backend.

Separate concerns into reusable components, domain models, data providers, API/service clients, and propagation logic. Model the domain for future evolution as SpaceObject -> OrbitalElements -> PropagatedState -> Observation. Observation can be an interface/placeholder now so radar/optical observations, uncertainty, conjunctions, maneuver detection, sensors, and historical data can be added later.

Design the client boundary as if a future backend could provide GET /api/space-objects, /api/space-objects/{noradId}, /state?time=..., and /trajectory?start=...&end=..., but do not require that backend yet.

UI: dark aerospace/space-operations aesthetic. Globe dominant. Compact top bar with Cesium Worldbox, 2D/3D control, reset view and UTC clock; left search/filter panel; right selected-object details; bottom simulation controls. Desktop-first but responsive.

Engineering: avoid one DOM node per satellite; use appropriate Cesium entities/primitives. Bound propagation work and calculate detailed trajectories primarily for selected objects. Keep architecture ready to move ingestion/propagation to backend workers later.

First-review completion criteria: globe loads; meaningful satellite catalog appears; positions respond to simulation time; search/filter/select work; object details and selected orbit work; 2D/3D switching works; UI is polished; architecture remains portable.

Build the working vertical slice now and prioritize functionality over extra features.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://cesium-worldbox.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6a1c1ba0-d85e-4d84-ae9d-1234fb9a3f62).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
