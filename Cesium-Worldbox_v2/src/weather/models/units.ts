/** Quantity kinds carried in provider-native units (Open-Meteo metric defaults). */
export type QuantityKind =
  | "temperature" // °C
  | "speed" // km/h
  | "precip" // mm
  | "snowfall" // cm
  | "depth" // m
  | "percent"
  | "pressure" // hPa
  | "visibility" // m
  | "energy" // J/kg
  | "index"
  | "radiation" // W/m²
  | "duration" // s
  | "moisture" // m³/m³
  | "height" // m
  | "reflectivity"; // dBZ

export interface UnitPreferences {
  temperature: "C" | "F";
  speed: "kmh" | "mph" | "kt";
  precip: "mm" | "in";
  pressure: "hPa" | "mb";
}

export const DEFAULT_UNITS: UnitPreferences = {
  temperature: "F",
  speed: "mph",
  precip: "in",
  pressure: "hPa",
};

export function convertValue(
  value: number,
  kind: QuantityKind,
  units: UnitPreferences,
): { value: number; unit: string } {
  switch (kind) {
    case "temperature":
      return units.temperature === "F"
        ? { value: value * 1.8 + 32, unit: "°F" }
        : { value, unit: "°C" };
    case "speed":
      if (units.speed === "mph") return { value: value * 0.621371, unit: "mph" };
      if (units.speed === "kt") return { value: value * 0.539957, unit: "kt" };
      return { value, unit: "km/h" };
    case "precip":
      return units.precip === "in" ? { value: value / 25.4, unit: "in" } : { value, unit: "mm" };
    case "snowfall":
      return units.precip === "in" ? { value: value / 2.54, unit: "in" } : { value, unit: "cm" };
    case "depth":
      return units.precip === "in" ? { value: value * 39.37, unit: "in" } : { value, unit: "m" };
    case "percent":
      return { value, unit: "%" };
    case "pressure":
      return { value, unit: units.pressure };
    case "visibility":
      return units.speed === "kmh" ? { value: value / 1000, unit: "km" } : { value: value / 1609.34, unit: "mi" };
    case "energy":
      return { value, unit: "J/kg" };
    case "index":
      return { value, unit: "" };
    case "radiation":
      return { value, unit: "W/m²" };
    case "duration":
      return { value: value / 60, unit: "min/h" };
    case "moisture":
      return { value, unit: "m³/m³" };
    case "height":
      return units.temperature === "F" ? { value: value * 3.28084, unit: "ft" } : { value, unit: "m" };
    case "reflectivity":
      return { value, unit: "dBZ" };
  }
}

export function formatConverted(value: number, kind: QuantityKind, units: UnitPreferences): string {
  const converted = convertValue(value, kind, units);
  const abs = Math.abs(converted.value);
  const digits = abs !== 0 && abs < 1 ? 2 : abs < 10 ? 1 : 0;
  return converted.value.toFixed(digits);
}
