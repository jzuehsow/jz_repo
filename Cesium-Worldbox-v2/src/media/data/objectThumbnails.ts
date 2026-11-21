import type { ObjectThumbnail } from "@/media/models/ObjectThumbnail";

const OWN_WORK = {
  sourceUrl: "https://cesium-worldbox.lovable.app",
  sourceName: "Cesium Worldbox",
  attribution: "Original schematic illustration produced for Cesium Worldbox",
  license: "CC0 1.0 (public domain dedication)",
} as const;

/**
 * Seed manifest. Every entry here is first-party artwork, so redistribution is
 * unconditionally safe; entries sourced from third parties must carry their own
 * real sourceUrl/attribution/license and never a fabricated one.
 */
export const OBJECT_THUMBNAILS: ObjectThumbnail[] = [
  {
    key: "satellite-starlink",
    objectCategory: "SATELLITE",
    modelFamily: "Starlink v1.5/v2 mini",
    imagePath: "/thumbnails/satellites/starlink.jpg",
    altText: "Flat-panel Starlink satellite with a single solar array in low Earth orbit",
    ...OWN_WORK,
  },
  {
    key: "satellite-oneweb",
    objectCategory: "SATELLITE",
    modelFamily: "OneWeb Gen-1",
    imagePath: "/thumbnails/satellites/oneweb.jpg",
    altText: "Compact OneWeb communications satellite with twin solar wings",
    ...OWN_WORK,
  },
  {
    key: "satellite-iridium-next",
    objectCategory: "SATELLITE",
    modelFamily: "Iridium NEXT",
    imagePath: "/thumbnails/satellites/iridium-next.jpg",
    altText: "Iridium NEXT satellite with cross-linked antenna panels",
    ...OWN_WORK,
  },
  {
    key: "satellite-gps",
    objectCategory: "SATELLITE",
    modelFamily: "GPS Block IIF/III",
    imagePath: "/thumbnails/satellites/gps.jpg",
    altText: "GPS navigation satellite with helical antenna array facing Earth",
    ...OWN_WORK,
  },
  {
    key: "satellite-gnss",
    objectCategory: "SATELLITE",
    modelFamily: "GNSS navigation platform",
    imagePath: "/thumbnails/satellites/gnss.jpg",
    altText: "Medium Earth orbit navigation satellite with boxed bus and two solar arrays",
    ...OWN_WORK,
  },
  {
    key: "satellite-iss",
    objectCategory: "SATELLITE",
    modelFamily: "International Space Station",
    imagePath: "/thumbnails/satellites/iss.jpg",
    altText: "International Space Station truss with pressurised modules and solar arrays",
    ...OWN_WORK,
  },
  {
    key: "satellite-weather",
    objectCategory: "SATELLITE",
    modelFamily: "Polar weather satellite (NOAA/MetOp class)",
    imagePath: "/thumbnails/satellites/weather.jpg",
    altText: "Polar-orbiting weather satellite with radiometer instruments and one solar array",
    ...OWN_WORK,
  },
  {
    key: "satellite-geo-comms",
    objectCategory: "SATELLITE",
    modelFamily: "GEO communications bus",
    imagePath: "/thumbnails/satellites/geo-comms.jpg",
    altText: "Large geostationary communications satellite with two dish reflectors",
    ...OWN_WORK,
  },
  {
    key: "satellite-imaging",
    objectCategory: "SATELLITE",
    modelFamily: "Earth-imaging smallsat",
    imagePath: "/thumbnails/satellites/imaging.jpg",
    altText: "Small Earth-observation satellite with a telescope aperture pointing at Earth",
    ...OWN_WORK,
  },
  {
    key: "satellite-rocket-body",
    objectCategory: "SATELLITE",
    modelFamily: "Spent rocket body",
    imagePath: "/thumbnails/satellites/rocket-body.jpg",
    altText: "Tumbling spent upper stage rocket body in orbit",
    ...OWN_WORK,
  },
  {
    key: "aircraft-a320-family",
    objectCategory: "AIRCRAFT",
    modelFamily: "Airbus A320 family",
    imagePath: "/thumbnails/aircraft/a320-family.jpg",
    altText: "Airbus A320 family narrow-body airliner in cruise",
    ...OWN_WORK,
  },
  {
    key: "aircraft-b737-family",
    objectCategory: "AIRCRAFT",
    modelFamily: "Boeing 737 family",
    imagePath: "/thumbnails/aircraft/b737-family.jpg",
    altText: "Boeing 737 narrow-body airliner in cruise",
    ...OWN_WORK,
  },
  {
    key: "aircraft-widebody",
    objectCategory: "AIRCRAFT",
    modelFamily: "Wide-body twin-aisle airliner",
    imagePath: "/thumbnails/aircraft/widebody.jpg",
    altText: "Wide-body twin-engine airliner in cruise",
    ...OWN_WORK,
  },
  {
    key: "aircraft-regional-jet",
    objectCategory: "AIRCRAFT",
    modelFamily: "Regional jet",
    imagePath: "/thumbnails/aircraft/regional-jet.jpg",
    altText: "Regional jet airliner in cruise",
    ...OWN_WORK,
  },
  {
    key: "generic-satellite",
    objectCategory: "GENERIC",
    modelFamily: "Unidentified space object",
    imagePath: "/thumbnails/generic/space-object.jpg",
    altText: "Generic satellite silhouette placeholder",
    ...OWN_WORK,
  },
  {
    key: "generic-aircraft",
    objectCategory: "GENERIC",
    modelFamily: "Unidentified aircraft",
    imagePath: "/thumbnails/generic/aircraft.jpg",
    altText: "Generic aircraft silhouette placeholder",
    ...OWN_WORK,
  },
  {
    key: "vessel-container-ship",
    objectCategory: "VESSEL",
    modelFamily: "Container ship",
    imagePath: "/thumbnails/vessels/container.jpg",
    altText: "Container ship stacked with shipping containers",
    ...OWN_WORK,
  },
  {
    key: "vessel-tanker",
    objectCategory: "VESSEL",
    modelFamily: "Tanker",
    imagePath: "/thumbnails/vessels/tanker.jpg",
    altText: "Oil and chemical tanker with deck pipework",
    ...OWN_WORK,
  },
  {
    key: "vessel-cargo",
    objectCategory: "VESSEL",
    modelFamily: "General cargo / bulk carrier",
    imagePath: "/thumbnails/vessels/cargo.jpg",
    altText: "Bulk cargo ship with deck cranes",
    ...OWN_WORK,
  },
  {
    key: "vessel-cruise",
    objectCategory: "VESSEL",
    modelFamily: "Cruise ship",
    imagePath: "/thumbnails/vessels/cruise.jpg",
    altText: "Large multi-deck cruise ship",
    ...OWN_WORK,
  },
  {
    key: "vessel-ferry",
    objectCategory: "VESSEL",
    modelFamily: "Ferry / passenger",
    imagePath: "/thumbnails/vessels/ferry.jpg",
    altText: "Roll-on roll-off passenger car ferry",
    ...OWN_WORK,
  },
  {
    key: "vessel-fishing",
    objectCategory: "VESSEL",
    modelFamily: "Fishing vessel",
    imagePath: "/thumbnails/vessels/fishing.jpg",
    altText: "Fishing trawler with outrigger nets",
    ...OWN_WORK,
  },
  {
    key: "vessel-tug",
    objectCategory: "VESSEL",
    modelFamily: "Tug",
    imagePath: "/thumbnails/vessels/tug.jpg",
    altText: "Harbour tugboat with fenders",
    ...OWN_WORK,
  },
  {
    key: "generic-vessel",
    objectCategory: "VESSEL",
    modelFamily: "Vessel (generic)",
    imagePath: "/thumbnails/generic/vessel.jpg",
    altText: "Generic ship hull outline placeholder",
    ...OWN_WORK,
  },
];

export const THUMBNAIL_INDEX: Record<string, ObjectThumbnail> = Object.fromEntries(
  OBJECT_THUMBNAILS.map((thumbnail) => [thumbnail.key, thumbnail]),
);

export const GENERIC_SATELLITE_KEY = "generic-satellite";
export const GENERIC_AIRCRAFT_KEY = "generic-aircraft";
export const GENERIC_VESSEL_KEY = "generic-vessel";
