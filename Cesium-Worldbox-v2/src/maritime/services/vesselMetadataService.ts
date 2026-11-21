import type { VesselCategory } from "@/maritime/models/VesselObject";
import type { Port } from "@/maritime/models/VesselRoute";
import type { VesselTypeMetadata } from "@/maritime/models/VesselTypeMetadata";

export const VESSEL_CATEGORIES: Record<VesselCategory, VesselTypeMetadata> = {
  CARGO: { category: "CARGO", label: "Cargo", color: "#6fd18a", thumbnailKey: "vessel-cargo" },
  CONTAINER: { category: "CONTAINER", label: "Container ship", color: "#4fb3e8", thumbnailKey: "vessel-container-ship" },
  TANKER: { category: "TANKER", label: "Tanker", color: "#f08a3c", thumbnailKey: "vessel-tanker" },
  PASSENGER: { category: "PASSENGER", label: "Passenger", color: "#c79bff", thumbnailKey: "vessel-ferry" },
  CRUISE: { category: "CRUISE", label: "Cruise ship", color: "#e58cff", thumbnailKey: "vessel-cruise" },
  FERRY: { category: "FERRY", label: "Ferry", color: "#b38cff", thumbnailKey: "vessel-ferry" },
  TUG: { category: "TUG", label: "Tug", color: "#5ce1e6", thumbnailKey: "vessel-tug" },
  FISHING: { category: "FISHING", label: "Fishing", color: "#f2d65b", thumbnailKey: "vessel-fishing" },
  PLEASURE: { category: "PLEASURE", label: "Pleasure craft", color: "#ff9fc4", thumbnailKey: "generic-vessel" },
  MILITARY_GOV: { category: "MILITARY_GOV", label: "Military / Government", color: "#e8412c", thumbnailKey: "generic-vessel" },
  OTHER: { category: "OTHER", label: "Other", color: "#a8b8c8", thumbnailKey: "generic-vessel" },
  UNKNOWN: { category: "UNKNOWN", label: "Unknown", color: "#7d8ea0", thumbnailKey: "generic-vessel" },
};

/** AIS ship-type code → logical category (ITU-R M.1371). Name hints refine passenger types. */
export function categorize(code: number | undefined, name?: string): VesselCategory {
  if (code === undefined || code === 0) return "UNKNOWN";
  const upper = name?.toUpperCase() ?? "";
  if (code === 30) return "FISHING";
  if (code === 31 || code === 32 || code === 52) return "TUG";
  if (code === 35 || code === 55) return "MILITARY_GOV";
  if (code === 36 || code === 37) return "PLEASURE";
  if (code >= 60 && code <= 69) {
    if (/CRUISE|SEAS|PRINCESS|QUEEN|SYMPHONY|ODYSSEY/.test(upper)) return "CRUISE";
    return /FERRY|LINE|VIKING|SILJA|STENA|FINN|TALLINK|ECKER/.test(upper) ? "FERRY" : "PASSENGER";
  }
  if (code >= 70 && code <= 79) return /MAERSK|MSC |CMA CGM|EVER |HAPAG|CONTAINER|ONE /.test(upper) ? "CONTAINER" : "CARGO";
  if (code >= 80 && code <= 89) return "TANKER";
  return "OTHER";
}

const NAV_STATUS = [
  "Under way using engine", "At anchor", "Not under command", "Restricted manoeuvrability",
  "Constrained by draught", "Moored", "Aground", "Engaged in fishing", "Under way sailing",
  "Reserved", "Reserved", "Towing astern", "Pushing ahead / towing alongside", "Reserved",
  "AIS-SART active", "Not defined",
];

export function navStatusText(code: number | undefined): string | undefined {
  return code === undefined ? undefined : NAV_STATUS[code];
}

/** MMSI Maritime Identification Digits → flag (common MIDs only; unknown stays undefined). */
const MID: Record<string, string> = {
  "205": "Belgium", "209": "Cyprus", "210": "Cyprus", "211": "Germany", "212": "Cyprus", "215": "Malta",
  "218": "Germany", "219": "Denmark", "220": "Denmark", "224": "Spain", "225": "Spain", "226": "France",
  "227": "France", "228": "France", "229": "Malta", "230": "Finland", "231": "Faroe Islands", "232": "United Kingdom",
  "233": "United Kingdom", "235": "United Kingdom", "236": "Gibraltar", "237": "Greece", "239": "Greece",
  "240": "Greece", "241": "Greece", "244": "Netherlands", "245": "Netherlands", "246": "Netherlands",
  "247": "Italy", "248": "Malta", "249": "Malta", "250": "Ireland", "255": "Portugal (Madeira)", "256": "Malta",
  "257": "Norway", "258": "Norway", "259": "Norway", "261": "Poland", "263": "Portugal", "265": "Sweden",
  "266": "Sweden", "271": "Türkiye", "273": "Russia", "275": "Latvia", "276": "Estonia", "277": "Lithuania",
  "304": "Antigua and Barbuda", "305": "Antigua and Barbuda", "308": "Bahamas", "309": "Bahamas", "311": "Bahamas",
  "338": "United States", "351": "Panama", "352": "Panama", "353": "Panama", "354": "Panama", "355": "Panama",
  "356": "Panama", "357": "Panama", "366": "United States", "367": "United States", "368": "United States",
  "369": "United States", "370": "Panama", "371": "Panama", "372": "Panama", "373": "Panama", "374": "Panama",
  "412": "China", "413": "China", "414": "China", "431": "Japan", "432": "Japan", "440": "South Korea",
  "441": "South Korea", "477": "Hong Kong", "538": "Marshall Islands", "563": "Singapore", "564": "Singapore",
  "565": "Singapore", "566": "Singapore", "636": "Liberia", "637": "Liberia",
};

export function flagFromMmsi(mmsi: number): string | undefined {
  return MID[String(mmsi).slice(0, 3)];
}

/** Small reference table — enough to place markers for common destinations. */
const PORTS: Array<Port & { aliases: string[] }> = [
  { name: "Helsinki", unlocode: "FIHEL", country: "Finland", latitudeDeg: 60.16, longitudeDeg: 24.95, aliases: ["HELSINKI", "HELSINGFORS", "VUOSAARI"] },
  { name: "Turku", unlocode: "FITKU", country: "Finland", latitudeDeg: 60.43, longitudeDeg: 22.22, aliases: ["TURKU", "ABO"] },
  { name: "Kotka", unlocode: "FIKTK", country: "Finland", latitudeDeg: 60.46, longitudeDeg: 26.95, aliases: ["KOTKA", "MUSSALO"] },
  { name: "Hamina", unlocode: "FIHMN", country: "Finland", latitudeDeg: 60.55, longitudeDeg: 27.2, aliases: ["HAMINA", "HAMINAKOTKA"] },
  { name: "Rauma", unlocode: "FIRAU", country: "Finland", latitudeDeg: 61.13, longitudeDeg: 21.46, aliases: ["RAUMA"] },
  { name: "Pori", unlocode: "FIPOR", country: "Finland", latitudeDeg: 61.6, longitudeDeg: 21.47, aliases: ["PORI", "MANTYLUOTO"] },
  { name: "Oulu", unlocode: "FIOUL", country: "Finland", latitudeDeg: 65.0, longitudeDeg: 25.4, aliases: ["OULU"] },
  { name: "Kokkola", unlocode: "FIKOK", country: "Finland", latitudeDeg: 63.86, longitudeDeg: 23.03, aliases: ["KOKKOLA"] },
  { name: "Vaasa", unlocode: "FIVAA", country: "Finland", latitudeDeg: 63.08, longitudeDeg: 21.57, aliases: ["VAASA"] },
  { name: "Mariehamn", unlocode: "FIMHQ", country: "Finland", latitudeDeg: 60.09, longitudeDeg: 19.93, aliases: ["MARIEHAMN"] },
  { name: "Tallinn", unlocode: "EETLL", country: "Estonia", latitudeDeg: 59.45, longitudeDeg: 24.77, aliases: ["TALLINN", "MUUGA"] },
  { name: "Stockholm", unlocode: "SESTO", country: "Sweden", latitudeDeg: 59.33, longitudeDeg: 18.1, aliases: ["STOCKHOLM", "KAPELLSKAR"] },
  { name: "Gothenburg", unlocode: "SEGOT", country: "Sweden", latitudeDeg: 57.7, longitudeDeg: 11.9, aliases: ["GOTHENBURG", "GOTEBORG"] },
  { name: "Malmö", unlocode: "SEMMA", country: "Sweden", latitudeDeg: 55.61, longitudeDeg: 12.99, aliases: ["MALMO"] },
  { name: "St Petersburg", unlocode: "RULED", country: "Russia", latitudeDeg: 59.88, longitudeDeg: 30.2, aliases: ["ST PETERSBURG", "SANKT", "SPB", "PETERSBURG"] },
  { name: "Ust-Luga", unlocode: "RUULU", country: "Russia", latitudeDeg: 59.68, longitudeDeg: 28.4, aliases: ["UST-LUGA", "UST LUGA"] },
  { name: "Primorsk", unlocode: "RUPRI", country: "Russia", latitudeDeg: 60.35, longitudeDeg: 28.67, aliases: ["PRIMORSK"] },
  { name: "Riga", unlocode: "LVRIX", country: "Latvia", latitudeDeg: 56.97, longitudeDeg: 24.1, aliases: ["RIGA"] },
  { name: "Klaipėda", unlocode: "LTKLJ", country: "Lithuania", latitudeDeg: 55.71, longitudeDeg: 21.12, aliases: ["KLAIPEDA"] },
  { name: "Gdańsk", unlocode: "PLGDN", country: "Poland", latitudeDeg: 54.4, longitudeDeg: 18.67, aliases: ["GDANSK"] },
  { name: "Gdynia", unlocode: "PLGDY", country: "Poland", latitudeDeg: 54.53, longitudeDeg: 18.55, aliases: ["GDYNIA"] },
  { name: "Rostock", unlocode: "DERSK", country: "Germany", latitudeDeg: 54.15, longitudeDeg: 12.1, aliases: ["ROSTOCK"] },
  { name: "Travemünde", unlocode: "DETRV", country: "Germany", latitudeDeg: 53.96, longitudeDeg: 10.87, aliases: ["TRAVEMUNDE", "LUBECK"] },
  { name: "Kiel", unlocode: "DEKEL", country: "Germany", latitudeDeg: 54.33, longitudeDeg: 10.15, aliases: ["KIEL"] },
  { name: "Hamburg", unlocode: "DEHAM", country: "Germany", latitudeDeg: 53.54, longitudeDeg: 9.97, aliases: ["HAMBURG"] },
  { name: "Copenhagen", unlocode: "DKCPH", country: "Denmark", latitudeDeg: 55.7, longitudeDeg: 12.6, aliases: ["COPENHAGEN", "KOBENHAVN"] },
  { name: "Rotterdam", unlocode: "NLRTM", country: "Netherlands", latitudeDeg: 51.95, longitudeDeg: 4.1, aliases: ["ROTTERDAM"] },
  { name: "Antwerp", unlocode: "BEANR", country: "Belgium", latitudeDeg: 51.27, longitudeDeg: 4.35, aliases: ["ANTWERP", "ANTWERPEN"] },
];
const PORT_BY_CODE = new Map(PORTS.map((p) => [p.unlocode, p]));

/** Resolve a broadcast destination string; unknown text is kept as-is without a position. */
export function resolveDestination(text: string | undefined): Port | null {
  const raw = text?.trim().toUpperCase();
  if (!raw) return null;
  const compact = raw.replace(/[\s>-]/g, "");
  const code = compact.match(/[A-Z]{5}$/)?.[0];
  const byCode = code ? PORT_BY_CODE.get(code) : undefined;
  const match = byCode ?? PORTS.find((p) => p.aliases.some((alias) => raw.includes(alias)));
  if (match) {
    const { aliases: _aliases, ...port } = match;
    return port;
  }
  return { name: text!.trim() };
}
