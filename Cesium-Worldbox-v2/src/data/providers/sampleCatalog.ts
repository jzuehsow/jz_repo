import type { ObjectType, OrbitalElements, SpaceObject } from "@/domain/spaceObject";
import { summarizeOrbit } from "@/propagation/sgp4Propagator";

/**
 * Deterministic, realistic sample catalog (~900 objects).
 *
 * Used when live CelesTrak access is unavailable (CORS, offline preview, tests).
 * Element sets are synthesized from published orbit geometry, so positions are
 * representative rather than operational.
 */

const EARTH_RADIUS_KM = 6378.137;
const MU = 398600.4418;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function meanMotionFromAltitude(altitudeKm: number): number {
  const a = EARTH_RADIUS_KM + altitudeKm;
  const periodSeconds = 2 * Math.PI * Math.sqrt(a ** 3 / MU);
  return 86400 / periodSeconds;
}

interface GroupSpec {
  name: string;
  count: number;
  altitudeKm: number;
  altitudeSpreadKm?: number;
  inclinationDeg: number;
  inclinationSpreadDeg?: number;
  eccentricity?: number;
  objectType?: ObjectType;
  operator: string;
  constellation?: string;
  countryCode: string;
  launchYear: number;
  namer?: (index: number, seq: number) => string;
}

const GROUPS: GroupSpec[] = [
  {
    name: "STARLINK",
    count: 260,
    altitudeKm: 550,
    altitudeSpreadKm: 30,
    inclinationDeg: 53,
    inclinationSpreadDeg: 0.4,
    operator: "SpaceX",
    constellation: "Starlink",
    countryCode: "US",
    launchYear: 2022,
    namer: (_, seq) => `STARLINK-${3000 + seq}`,
  },
  {
    name: "STARLINK-POLAR",
    count: 60,
    altitudeKm: 560,
    altitudeSpreadKm: 20,
    inclinationDeg: 97.6,
    inclinationSpreadDeg: 0.3,
    operator: "SpaceX",
    constellation: "Starlink",
    countryCode: "US",
    launchYear: 2023,
    namer: (_, seq) => `STARLINK-${5200 + seq}`,
  },
  {
    name: "ONEWEB",
    count: 110,
    altitudeKm: 1200,
    altitudeSpreadKm: 12,
    inclinationDeg: 87.9,
    inclinationSpreadDeg: 0.2,
    operator: "Eutelsat OneWeb",
    constellation: "OneWeb",
    countryCode: "GB",
    launchYear: 2022,
    namer: (_, seq) => `ONEWEB-${400 + seq}`,
  },
  {
    name: "IRIDIUM",
    count: 66,
    altitudeKm: 780,
    altitudeSpreadKm: 6,
    inclinationDeg: 86.4,
    operator: "Iridium Communications",
    constellation: "Iridium NEXT",
    countryCode: "US",
    launchYear: 2018,
    namer: (_, seq) => `IRIDIUM ${100 + seq}`,
  },
  {
    name: "FLOCK",
    count: 80,
    altitudeKm: 475,
    altitudeSpreadKm: 25,
    inclinationDeg: 97.4,
    inclinationSpreadDeg: 0.5,
    operator: "Planet Labs",
    constellation: "Flock",
    countryCode: "US",
    launchYear: 2021,
    namer: (i, seq) => `FLOCK 4V-${seq} (0${(i % 9) + 1}${String.fromCharCode(65 + (i % 26))})`,
  },
  {
    name: "SPIRE",
    count: 36,
    altitudeKm: 500,
    altitudeSpreadKm: 30,
    inclinationDeg: 85,
    inclinationSpreadDeg: 8,
    operator: "Spire Global",
    constellation: "Lemur-2",
    countryCode: "US",
    launchYear: 2020,
    namer: (_, seq) => `LEMUR-2-${seq}`,
  },
  {
    name: "GPS",
    count: 31,
    altitudeKm: 20180,
    altitudeSpreadKm: 40,
    inclinationDeg: 55,
    inclinationSpreadDeg: 1.5,
    operator: "US Space Force",
    constellation: "GPS",
    countryCode: "US",
    launchYear: 2016,
    namer: (_, seq) => `NAVSTAR ${60 + seq} (USA ${240 + seq})`,
  },
  {
    name: "GALILEO",
    count: 24,
    altitudeKm: 23222,
    altitudeSpreadKm: 30,
    inclinationDeg: 56,
    inclinationSpreadDeg: 0.6,
    operator: "EUSPA",
    constellation: "Galileo",
    countryCode: "EU",
    launchYear: 2019,
    namer: (_, seq) => `GSAT-02${String(seq).padStart(2, "0")}`,
  },
  {
    name: "GLONASS",
    count: 24,
    altitudeKm: 19130,
    altitudeSpreadKm: 30,
    inclinationDeg: 64.8,
    inclinationSpreadDeg: 0.5,
    operator: "Roscosmos",
    constellation: "GLONASS",
    countryCode: "RU",
    launchYear: 2017,
    namer: (_, seq) => `COSMOS 25${String(seq).padStart(2, "0")} (GLONASS)`,
  },
  {
    name: "BEIDOU-MEO",
    count: 24,
    altitudeKm: 21500,
    altitudeSpreadKm: 40,
    inclinationDeg: 55.2,
    inclinationSpreadDeg: 0.8,
    operator: "CNSA",
    constellation: "BeiDou-3",
    countryCode: "CN",
    launchYear: 2019,
    namer: (_, seq) => `BEIDOU-3 M${seq}`,
  },
  {
    name: "GEO-COMMS",
    count: 90,
    altitudeKm: 35786,
    altitudeSpreadKm: 25,
    inclinationDeg: 0.05,
    inclinationSpreadDeg: 0.8,
    operator: "Commercial GEO Operators",
    countryCode: "US",
    launchYear: 2015,
    namer: (i, seq) => {
      const families = ["INTELSAT", "SES", "EUTELSAT", "JCSAT", "ASTRA", "ARABSAT", "TURKSAT"];
      return `${families[i % families.length]} ${20 + seq}`;
    },
  },
  {
    name: "WEATHER",
    count: 22,
    altitudeKm: 830,
    altitudeSpreadKm: 60,
    inclinationDeg: 98.7,
    inclinationSpreadDeg: 0.4,
    operator: "NOAA / EUMETSAT",
    countryCode: "US",
    launchYear: 2014,
    namer: (i, seq) => (i % 2 === 0 ? `NOAA ${15 + seq}` : `METOP-${["A", "B", "C"][i % 3]}`),
  },
  {
    name: "SCIENCE",
    count: 26,
    altitudeKm: 600,
    altitudeSpreadKm: 180,
    inclinationDeg: 51.6,
    inclinationSpreadDeg: 25,
    operator: "Civil Space Agencies",
    countryCode: "US",
    launchYear: 2012,
    namer: (i, seq) => {
      const families = ["SENTINEL", "LANDSAT", "SWOT", "AQUA", "TERRA", "ICESAT"];
      return `${families[i % families.length]}-${seq}`;
    },
  },
  {
    name: "MOLNIYA",
    count: 12,
    altitudeKm: 20000,
    altitudeSpreadKm: 500,
    inclinationDeg: 63.4,
    inclinationSpreadDeg: 0.8,
    eccentricity: 0.72,
    operator: "Russian Aerospace Forces",
    countryCode: "RU",
    launchYear: 2005,
    namer: (_, seq) => `MOLNIYA 3-${40 + seq}`,
  },
  {
    name: "ROCKET-BODIES",
    count: 60,
    altitudeKm: 780,
    altitudeSpreadKm: 400,
    inclinationDeg: 75,
    inclinationSpreadDeg: 25,
    eccentricity: 0.02,
    objectType: "ROCKET BODY",
    operator: "Various Launch Providers",
    countryCode: "TBD",
    launchYear: 2011,
    namer: (i, seq) => {
      const families = ["FALCON 9 R/B", "CZ-2D R/B", "SL-16 R/B", "ARIANE 5 R/B", "H-2A R/B"];
      return `${families[i % families.length]} ${seq}`;
    },
  },
  {
    name: "DEBRIS",
    count: 70,
    altitudeKm: 900,
    altitudeSpreadKm: 500,
    inclinationDeg: 82,
    inclinationSpreadDeg: 20,
    eccentricity: 0.015,
    objectType: "DEBRIS",
    operator: "Unattributed",
    countryCode: "TBD",
    launchYear: 2009,
    namer: (i, seq) =>
      `${["FENGYUN 1C DEB", "COSMOS 2251 DEB", "IRIDIUM 33 DEB", "CZ-6A DEB"][i % 4]} ${seq}`,
  },
];

function buildElements(
  rand: () => number,
  spec: GroupSpec,
  index: number,
  epoch: Date,
): OrbitalElements {
  const altitude = spec.altitudeKm + (rand() - 0.5) * 2 * (spec.altitudeSpreadKm ?? 0);
  const inclination = Math.max(
    0,
    spec.inclinationDeg + (rand() - 0.5) * 2 * (spec.inclinationSpreadDeg ?? 0),
  );
  const eccentricity = spec.eccentricity ?? 0.0002 + rand() * 0.0012;
  const planeCount = Math.max(1, Math.round(Math.sqrt(spec.count)));
  const plane = index % planeCount;
  const slot = Math.floor(index / planeCount);
  return {
    epoch: epoch.toISOString(),
    meanMotion: meanMotionFromAltitude(altitude),
    eccentricity,
    inclination,
    raOfAscNode: (plane * (360 / planeCount) + rand() * 3) % 360,
    argOfPericenter: spec.eccentricity ? (rand() * 360) % 360 : (rand() * 360) % 360,
    meanAnomaly: (slot * (360 / Math.max(1, Math.ceil(spec.count / planeCount))) + rand() * 5) % 360,
    bstar: 0.00001 + rand() * 0.0003,
    meanMotionDot: 0,
    meanMotionDdot: 0,
    revAtEpoch: Math.floor(1000 + rand() * 20000),
    elementSetNo: 999,
  };
}

let cached: SpaceObject[] | null = null;

export function buildSampleCatalog(limit = 900): SpaceObject[] {
  if (!cached) {
    const rand = mulberry32(20260828);
    const epochBase = Date.now() - 6 * 3600 * 1000;
    const objects: SpaceObject[] = [];
    let norad = 40000;

    for (const spec of GROUPS) {
      for (let i = 0; i < spec.count; i += 1) {
        norad += 1 + Math.floor(rand() * 3);
        const epoch = new Date(epochBase - rand() * 18 * 3600 * 1000);
        const elements = buildElements(rand, spec, i, epoch);
        const seq = i + 1;
        const name = spec.namer ? spec.namer(i, seq) : `${spec.name} ${seq}`;
        const launchNumber = String(10 + ((i * 3) % 89)).padStart(3, "0");
        const object: SpaceObject = {
          id: String(norad),
          noradId: norad,
          name,
          cosparId: `${spec.launchYear}-${launchNumber}${String.fromCharCode(65 + (i % 26))}`,
          objectType: spec.objectType ?? "PAYLOAD",
          operator: spec.operator,
          countryCode: spec.countryCode,
          launchDate: `${spec.launchYear}-${String(1 + (i % 12)).padStart(2, "0")}-${String(
            1 + (i % 27),
          ).padStart(2, "0")}`,
          elements,
          orbit: summarizeOrbit(elements),
          source: "sample",
        };
        if (spec.constellation) object.constellation = spec.constellation;
        objects.push(object);
      }
    }

    // A few well-known reference objects so the catalog reads as real ops data.
    const iss: OrbitalElements = {
      epoch: new Date(epochBase).toISOString(),
      meanMotion: meanMotionFromAltitude(420),
      eccentricity: 0.0005,
      inclination: 51.64,
      raOfAscNode: 120.4,
      argOfPericenter: 88.2,
      meanAnomaly: 271.9,
      bstar: 0.00019,
      meanMotionDot: 0,
      meanMotionDdot: 0,
      elementSetNo: 999,
    };
    objects.unshift({
      id: "25544",
      noradId: 25544,
      name: "ISS (ZARYA)",
      cosparId: "1998-067A",
      objectType: "PAYLOAD",
      operator: "NASA / Roscosmos / ESA",
      constellation: "Crewed Platforms",
      countryCode: "ISS",
      launchDate: "1998-11-20",
      elements: iss,
      orbit: summarizeOrbit(iss),
      source: "sample",
    });

    cached = objects;
  }
  return cached.slice(0, limit);
}
