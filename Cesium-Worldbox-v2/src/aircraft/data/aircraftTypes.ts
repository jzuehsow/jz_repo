import type { AircraftTypeMetadata } from "@/aircraft/models/AircraftTypeMetadata";

type Row = [string[], string, string, number, number, string | undefined];

// [ICAO type codes], manufacturer, model, cruise ft, cruise kt, thumbnailKey
const ROWS: Row[] = [
  [["A318", "A319", "A320", "A321", "A19N", "A20N", "A21N"], "Airbus", "A320 family", 36_000, 450, "aircraft-a320-family"],
  [["B735", "B736", "B737", "B738", "B739", "B37M", "B38M", "B39M"], "Boeing", "737 family", 36_000, 450, "aircraft-b737-family"],
  [["B752", "B753"], "Boeing", "757", 38_000, 460, "aircraft-b737-family"],
  [["A332", "A333", "A338", "A339", "A343", "A346"], "Airbus", "A330/A340", 39_000, 470, "aircraft-widebody"],
  [["A359", "A35K"], "Airbus", "A350", 40_000, 490, "aircraft-widebody"],
  [["A388"], "Airbus", "A380", 39_000, 490, "aircraft-widebody"],
  [["B744", "B748", "B74F"], "Boeing", "747", 37_000, 490, "aircraft-widebody"],
  [["B762", "B763", "B764"], "Boeing", "767", 37_000, 460, "aircraft-widebody"],
  [["B772", "B773", "B77L", "B77W", "B778", "B779"], "Boeing", "777", 39_000, 490, "aircraft-widebody"],
  [["B788", "B789", "B78X"], "Boeing", "787", 40_000, 490, "aircraft-widebody"],
  [["E170", "E175", "E75L", "E75S", "E190", "E195", "E290", "E295"], "Embraer", "E-Jet", 35_000, 430, "aircraft-regional-jet"],
  [["CRJ2", "CRJ7", "CRJ9", "CRJX"], "Bombardier", "CRJ", 35_000, 430, "aircraft-regional-jet"],
  [["BCS1", "BCS3"], "Airbus", "A220", 38_000, 450, "aircraft-a320-family"],
  [["AT43", "AT45", "AT72", "AT75", "AT76"], "ATR", "ATR 42/72", 23_000, 270, "aircraft-regional-jet"],
  [["DH8A", "DH8B", "DH8C", "DH8D"], "De Havilland", "Dash 8", 25_000, 300, "aircraft-regional-jet"],
  [["C56X", "C68A", "C700", "CL35", "CL60", "GLF5", "GLF6", "GLEX", "F2TH", "F900", "E55P", "PC24"], "Various", "Business jet", 41_000, 450, undefined],
  [["C172", "C182", "PA28", "SR22", "DA40", "P28A"], "Various", "Light piston", 7_000, 120, undefined],
];

export const AIRCRAFT_TYPES: Record<string, AircraftTypeMetadata> = {};
for (const [codes, manufacturer, model, cruiseAltitudeFt, cruiseSpeedKt, thumbnailKey] of ROWS) {
  for (const icaoType of codes) {
    AIRCRAFT_TYPES[icaoType] = { icaoType, manufacturer, model, cruiseAltitudeFt, cruiseSpeedKt, thumbnailKey };
  }
}

/** Generic airliner fallback, used only for aircraft clearly at cruise speed. */
export const GENERIC_AIRLINER: AircraftTypeMetadata = {
  icaoType: "—",
  manufacturer: "Unknown",
  model: "Commercial aircraft (generic)",
  cruiseAltitudeFt: 35_000,
  cruiseSpeedKt: 450,
};
