import type { AircraftObject } from "@/aircraft/models/AircraftObject";
import type { SpaceObject } from "@/domain/spaceObject";
import {
  GENERIC_AIRCRAFT_KEY,
  GENERIC_SATELLITE_KEY,
  GENERIC_VESSEL_KEY,
  THUMBNAIL_INDEX,
} from "@/media/data/objectThumbnails";
import type { ObjectThumbnail } from "@/media/models/ObjectThumbnail";

/** name pattern → model family key, checked in order (most specific first). */
const SATELLITE_PATTERNS: Array<[RegExp, string]> = [
  [/^starlink/i, "satellite-starlink"],
  [/^oneweb/i, "satellite-oneweb"],
  [/^iridium/i, "satellite-iridium-next"],
  [/(^|\b)(navstar|gps)\b/i, "satellite-gps"],
  [/^(galileo|glonass|beidou|qzs|irnss)/i, "satellite-gnss"],
  [/\b(iss|zarya|tiangong)\b/i, "satellite-iss"],
  [/^(noaa|metop|dmsp|fengyun|suomi|jpss|goes|meteosat|himawari)/i, "satellite-weather"],
  [/^(flock|skysat|dove|spire|lemur|planetscope|worldview|sentinel|landsat)/i, "satellite-imaging"],
  [/\b(r\/b|rocket body|akm|pkm|centaur|breeze|fregat)\b/i, "satellite-rocket-body"],
];

const AIRCRAFT_TYPE_PATTERNS: Array<[RegExp, string]> = [
  // Includes the ICAO neo codes A19N/A20N/A21N alongside the ceo A318–A321.
  [/^A3?(1[89]|2[01])[A-Z0-9]?/i, "aircraft-a320-family"],
  // Includes the 737 MAX codes B37M/B38M/B39M alongside the NG series.
  [/^B7?3[5-9][A-Z]?$|^B3[789]M$/i, "aircraft-b737-family"],
  [/^(A3[345]|A38|B7[478]|B76|B77|B78)/i, "aircraft-widebody"],
  [/^(E1[79]|E29|E7[05]|CRJ|AT[47]|DH8|SF3|SU9|RJ\d)/i, "aircraft-regional-jet"],
];

function bySpaceRegime(object: SpaceObject): string {
  if (object.objectType === "ROCKET BODY") return "satellite-rocket-body";
  if (object.orbit.regime === "GEO") return "satellite-geo-comms";
  if (object.orbit.regime === "MEO") return "satellite-gnss";
  return GENERIC_SATELLITE_KEY;
}

/**
 * Matching hierarchy: explicit key → model family → name/type family →
 * constellation/operator → orbit-regime or category image → generic fallback.
 */
export function resolveSpaceObjectThumbnailKey(object: SpaceObject): string {
  const explicit = object.thumbnailKey ?? object.modelFamily;
  if (explicit && THUMBNAIL_INDEX[explicit]) return explicit;

  const haystack = `${object.name} ${object.constellation ?? ""} ${object.operator ?? ""}`;
  for (const [pattern, key] of SATELLITE_PATTERNS) {
    if (pattern.test(haystack) && THUMBNAIL_INDEX[key]) return key;
  }
  const fallback = bySpaceRegime(object);
  return THUMBNAIL_INDEX[fallback] ? fallback : GENERIC_SATELLITE_KEY;
}

export function resolveAircraftThumbnailKey(aircraft: AircraftObject): string {
  const explicit = aircraft.modelFamily;
  if (explicit && THUMBNAIL_INDEX[explicit]) return explicit;

  const candidates = [aircraft.typeCode ?? "", aircraft.typeName ?? ""];
  for (const [pattern, key] of AIRCRAFT_TYPE_PATTERNS) {
    if (candidates.some((candidate) => pattern.test(candidate)) && THUMBNAIL_INDEX[key]) {
      return key;
    }
  }
  return GENERIC_AIRCRAFT_KEY;
}

export function getThumbnail(key: string): ObjectThumbnail | null {
  return THUMBNAIL_INDEX[key] ?? null;
}

export function getThumbnailForSpaceObject(object: SpaceObject): ObjectThumbnail | null {
  return getThumbnail(resolveSpaceObjectThumbnailKey(object));
}

export function getThumbnailForAircraft(aircraft: AircraftObject): ObjectThumbnail | null {
  return getThumbnail(resolveAircraftThumbnailKey(aircraft));
}

/** Vessel family images keyed by logical category thumbnail key. */
export function getThumbnailForVessel(vessel: { thumbnailKey?: string | undefined }, categoryKey: string): ObjectThumbnail | null {
  const explicit = vessel.thumbnailKey;
  if (explicit && THUMBNAIL_INDEX[explicit]) return getThumbnail(explicit);
  return getThumbnail(THUMBNAIL_INDEX[categoryKey] ? categoryKey : GENERIC_VESSEL_KEY);
}
