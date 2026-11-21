import type { SpaceObject } from "@/domain/spaceObject";
import { summarizeOrbit } from "@/propagation/sgp4Propagator";
import { ommToElements, type ListOptions, type OmmRecord, type SpaceObjectProvider } from "./types";

/**
 * Live CelesTrak GP (OMM/JSON) provider.
 *
 * CelesTrak does not always send permissive CORS headers, so callers should
 * treat failure as expected and fall back (see ./index.ts).
 */
const DEFAULT_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json";

/** Per-constellation cap so the bounded catalog stays diverse. */
const GROUP_CAP = 110;

export function createCelestrakProvider(url: string = DEFAULT_URL): SpaceObjectProvider {
  return {
    id: "celestrak",
    label: "CelesTrak GP (active)",
    async listSpaceObjects(options?: ListOptions): Promise<SpaceObject[]> {
      const init: RequestInit = { headers: { accept: "application/json" } };
      if (options?.signal) init.signal = options.signal;
      const response = await fetch(url, init);
      if (!response.ok) throw new Error(`CelesTrak responded ${response.status}`);
      const records = (await response.json()) as OmmRecord[];
      if (!Array.isArray(records) || records.length === 0) {
        throw new Error("CelesTrak returned an empty catalog");
      }
      return mapRecords(records, options?.limit ?? 900);
    },
    async getSpaceObject(noradId: number): Promise<SpaceObject | null> {
      const response = await fetch(
        `https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=json`,
        { headers: { accept: "application/json" } },
      );
      if (!response.ok) throw new Error(`CelesTrak responded ${response.status}`);
      const records = (await response.json()) as OmmRecord[];
      return mapRecords(records, 1)[0] ?? null;
    },
  };
}

export function mapRecords(records: OmmRecord[], limit: number): SpaceObject[] {
  const objects: SpaceObject[] = [];
  for (const record of records) {
    const noradId = Number(record.NORAD_CAT_ID);
    if (!Number.isFinite(noradId)) continue;
    const elements = ommToElements(record);
    if (!(elements.meanMotion > 0)) continue;
    const name = record.OBJECT_NAME ?? `UNKNOWN ${noradId}`;
    const object: SpaceObject = {
      id: String(noradId),
      noradId,
      name,
      objectType: normalizeType(record.OBJECT_TYPE, name),
      elements,
      orbit: summarizeOrbit(elements),
      source: "celestrak",
    };
    if (record.OBJECT_ID) object.cosparId = String(record.OBJECT_ID);
    if (record.COUNTRY_CODE) object.countryCode = String(record.COUNTRY_CODE);
    if (record.LAUNCH_DATE) object.launchDate = String(record.LAUNCH_DATE);
    const known = classifyByName(name);
    if (known) {
      object.constellation = known.constellation;
      object.operator = known.operator;
    } else if (record.COUNTRY_CODE) {
      object.operator = String(record.COUNTRY_CODE);
    }
    objects.push(object);
  }
  return selectDiverseSubset(objects, limit);
}

/**
 * Bounded, representative slice of a very large catalog: capped per
 * constellation and evenly strided inside each group so orbital planes stay
 * spread out. Replaceable by server-side selection later.
 */
export function selectDiverseSubset(objects: SpaceObject[], limit: number): SpaceObject[] {
  if (objects.length <= limit) return objects;

  const groups = new Map<string, SpaceObject[]>();
  for (const object of objects) {
    const key = object.constellation ?? `${object.orbit.regime}/${object.objectType}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(object);
    else groups.set(key, [object]);
  }

  const queues = [...groups.values()].map((bucket) => {
    const cap = Math.min(GROUP_CAP, bucket.length);
    const stride = bucket.length / cap;
    const picked: SpaceObject[] = [];
    for (let i = 0; i < cap; i += 1) picked.push(bucket[Math.floor(i * stride)]!);
    return picked;
  });

  const selected: SpaceObject[] = [];
  let cursor = 0;
  while (selected.length < limit) {
    let added = false;
    for (const queue of queues) {
      const item = queue[cursor];
      if (!item) continue;
      selected.push(item);
      added = true;
      if (selected.length >= limit) break;
    }
    if (!added) break;
    cursor += 1;
  }
  return selected;
}

function normalizeType(value: unknown, name: string): SpaceObject["objectType"] {
  const declared = String(value ?? "").toUpperCase();
  if (declared.includes("ROCKET")) return "ROCKET BODY";
  if (declared.includes("DEBRIS")) return "DEBRIS";
  if (declared.includes("PAYLOAD")) return "PAYLOAD";
  const upper = name.toUpperCase();
  if (/\bR\/B\b|ROCKET BODY|\bAKM\b|\bPKM\b/.test(upper)) return "ROCKET BODY";
  if (/\bDEB\b|DEBRIS|\bFRAGMENT\b/.test(upper)) return "DEBRIS";
  return "PAYLOAD";
}

interface KnownGroup {
  constellation: string;
  operator: string;
}

const NAME_TABLE: Array<[RegExp, KnownGroup]> = [
  [/^STARLINK/, { constellation: "Starlink", operator: "SpaceX" }],
  [/^ONEWEB/, { constellation: "OneWeb", operator: "Eutelsat OneWeb" }],
  [/^IRIDIUM/, { constellation: "Iridium NEXT", operator: "Iridium Communications" }],
  [/^FLOCK|^SKYSAT|^DOVE/, { constellation: "Planet", operator: "Planet Labs" }],
  [/^LEMUR/, { constellation: "Lemur-2", operator: "Spire Global" }],
  [/^NAVSTAR|^GPS/, { constellation: "GPS", operator: "US Space Force" }],
  [/^GSAT-0|GALILEO/, { constellation: "Galileo", operator: "EUSPA" }],
  [/GLONASS/, { constellation: "GLONASS", operator: "Roscosmos" }],
  [/^BEIDOU/, { constellation: "BeiDou", operator: "CNSA" }],
  [/^QIANFAN|^GUOWANG|^SPACESAIL/, { constellation: "Qianfan", operator: "SSST" }],
  [/^ISS|^CSS |^TIANGONG|^PROGRESS|^CREW DRAGON|^SOYUZ/, {
    constellation: "Crewed Platforms",
    operator: "Human Spaceflight Programs",
  }],
  [/^SENTINEL|^LANDSAT|^TERRA|^AQUA|^ICESAT|^SWOT|^HST|^HUBBLE/, {
    constellation: "Earth & Space Science",
    operator: "Civil Space Agencies",
  }],
  [/^NOAA|^METOP|^GOES|^FENGYUN|^METEOR|^HIMAWARI/, {
    constellation: "Weather",
    operator: "Meteorological Agencies",
  }],
  [/^INTELSAT|^SES-|^EUTELSAT|^ASTRA|^JCSAT|^ARABSAT|^TURKSAT|^ECHOSTAR|^VIASAT|^INMARSAT/, {
    constellation: "GEO Communications",
    operator: "Commercial GEO Operators",
  }],
  [/^GLOBALSTAR|^ORBCOMM|^SWARM|^KUIPER/, {
    constellation: "Commercial LEO Comms",
    operator: "Commercial LEO Operators",
  }],
];

function classifyByName(name: string): KnownGroup | undefined {
  const upper = name.toUpperCase();
  for (const [pattern, group] of NAME_TABLE) if (pattern.test(upper)) return group;
  return undefined;
}
