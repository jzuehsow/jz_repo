import type { LayerDefinition } from "@/layers/LayerDefinition";

/** Built-in optional layers. All heavy layers default to OFF. */
export const DEFAULT_LAYERS: LayerDefinition[] = [
  {
    id: "cesium-osm-buildings",
    name: "Cesium OSM Buildings",
    description: "Global OpenStreetMap building footprints as 3D Tiles.",
    category: "3D_TILES",
    providerType: "cesium-ion-3d-tiles",
    defaultEnabled: false,
    assetId: 96188,
    attribution: "© OpenStreetMap contributors, served via Cesium ion",
    requiresToken: true,
    recommendedRangeMeters: 2_000,
    supportsSceneMode2D: false,
  },
  {
    id: "cesium-world-terrain",
    name: "Cesium World Terrain",
    description: "High-resolution global elevation. Replaces the flat ellipsoid.",
    category: "TERRAIN",
    providerType: "cesium-ion-terrain",
    defaultEnabled: false,
    assetId: 1,
    attribution: "Cesium World Terrain",
    requiresToken: true,
    supportsSceneMode2D: false,
  },
  {
    id: "aircraft-live-adsb",
    name: "Aircraft — Live ADS-B",
    description: "Live aircraft around the current view from a public ADS-B feed.",
    category: "LIVE_TRACKING",
    providerType: "aircraft-adsb",
    defaultEnabled: false,
    requiresToken: false,
    supportsSceneMode2D: true,
  },
  {
    id: "vessels-ais",
    name: "Ships / AIS",
    description: "Live AIS vessel positions around the current view.",
    category: "MARITIME",
    providerType: "vessel-ais",
    defaultEnabled: false,
    requiresToken: false,
    supportsSceneMode2D: true,
  },
  ...referenceLayers(),
];

export const SATELLITES_LAYER_ID = "space-satellites";
export const SAT_ORBITS_LAYER_ID = "space-orbit-paths";
export const SAT_LABELS_LAYER_ID = "space-labels";
export const SAT_DEBRIS_LAYER_ID = "space-debris";
export const SAT_ROCKET_LAYER_ID = "space-rocket-bodies";
export const AIRPORTS_LAYER_ID = "ref-airports";
export const PORTS_LAYER_ID = "ref-ports";
export const FLIGHT_ROUTES_LAYER_ID = "ref-flight-routes";
export const SHIPPING_LANES_LAYER_ID = "ref-shipping-lanes";
export const GEO_LABELS_LAYER_ID = "geo-labels";
export const GEO_COUNTRIES_LAYER_ID = "geo-countries";
export const GEO_CAPITALS_LAYER_ID = "geo-capitals";
export const GEO_ADMIN1_LAYER_ID = "geo-admin1";
export const GEO_CITIES_LAYER_ID = "geo-cities";

function ref(
  id: string,
  name: string,
  description: string,
  category: LayerDefinition["category"],
  defaultEnabled: boolean,
  extra: Partial<LayerDefinition> = {},
): LayerDefinition {
  return {
    id,
    name,
    description,
    category,
    providerType: category === "SPACE" ? "satellites" : "reference",
    defaultEnabled,
    requiresToken: false,
    supportsSceneMode2D: true,
    ...extra,
  };
}

function referenceLayers(): LayerDefinition[] {
  return [
    ref("space-satellites", "Satellites", "Propagated satellite catalog (SGP4).", "SPACE", true),
    ref("space-orbit-paths", "Orbit Paths", "Orbit track of the selected satellite.", "SPACE", true, { parentId: "space-satellites" }),
    ref("space-labels", "Labels", "Name label on the selected satellite.", "SPACE", true, { parentId: "space-satellites" }),
    ref("space-debris", "Debris", "Include catalogued debris objects.", "SPACE", true, { parentId: "space-satellites" }),
    ref("space-rocket-bodies", "Rocket Bodies", "Include spent rocket stages.", "SPACE", true, { parentId: "space-satellites" }),
    ref("ref-airports", "Airports", "Major airports globally; smaller ones appear as you zoom in.", "TRANSPORTATION", false, {
      attribution: "OurAirports (public domain)",
    }),
    ref("ref-ports", "Ports", "Major seaports globally; smaller harbors appear closer in.", "TRANSPORTATION", false, {
      attribution: "Natural Earth ports (public domain)",
    }),
    ref("ref-flight-routes", "Common Flight Routes", "Reference airport-to-airport connectivity — not live ATC routes, flight plans, airways, or current schedules.", "TRANSPORTATION", false, {
      attribution: "OpenFlights route database (ODbL), dataset last updated June 2014",
    }),
    ref("ref-shipping-lanes", "Major Shipping Lanes", "Reference shipping lanes (major / middle / minor by zoom).", "TRANSPORTATION", false, {
      attribution: "Global Shipping Lanes v1 (Benden, CC BY 4.0)",
    }),
    ref("geo-labels", "Geographic Labels", "Borders, capitals, states/provinces and cities.", "MAP_LABELS", false, {
      attribution: "Natural Earth (public domain)",
    }),
    ref("geo-countries", "Countries", "Country borders and names.", "MAP_LABELS", true, { parentId: "geo-labels" }),
    ref("geo-capitals", "Capitals", "National capitals (★).", "MAP_LABELS", true, { parentId: "geo-labels" }),
    ref("geo-admin1", "States / Provinces", "First-level administrative regions.", "MAP_LABELS", true, { parentId: "geo-labels" }),
    ref("fx-day-night", "Day / Night", "Sunlit and night sides of Earth from the sun position at the simulation time.", "EARTH_EFFECTS", false),
    ref("geo-cities", "Cities", "Populated places ranked by importance.", "MAP_LABELS", true, { parentId: "geo-labels" }),
  ];
}

export const VESSEL_LAYER_ID = "vessels-ais";
export const AIRCRAFT_LAYER_ID = "aircraft-live-adsb";

export function makeCustomTilesLayer(name: string, url: string): LayerDefinition {
  return {
    id: `custom-3d-tiles-${Date.now().toString(36)}`,
    name,
    description: "Custom / self-hosted 3D Tiles source.",
    category: "3D_TILES",
    providerType: "url-3d-tiles",
    defaultEnabled: false,
    url,
    requiresToken: false,
    supportsSceneMode2D: false,
    removable: true,
  };
}

export const DAY_NIGHT_LAYER_ID = "fx-day-night";
