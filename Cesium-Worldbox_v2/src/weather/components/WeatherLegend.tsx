import { COLOR_SCALES, cssGradient } from "@/weather/models/colorScales";
import type { WeatherLayerDefinition } from "@/weather/models/WeatherLayerDefinition";
import { convertValue, formatConverted, type UnitPreferences } from "@/weather/models/units";
import { getWeatherProvider } from "@/weather/services/weatherService";
import { formatUtc } from "@/lib/format";

interface WeatherLegendProps {
  definition: WeatherLayerDefinition;
  units: UnitPreferences;
  timeMs: number | null;
}

export function WeatherLegend({ definition, units, timeMs }: WeatherLegendProps) {
  if (!definition.scale || !definition.quantity) return null;
  const scale = COLOR_SCALES[definition.scale];
  const stops = scale.stops;
  const min = stops[0]![0];
  const max = stops[stops.length - 1]![0];
  const mid = stops[Math.floor(stops.length / 2)]![0];
  const unit = convertValue(0, definition.quantity, units).unit;
  const provider = getWeatherProvider(definition.providerId);
  return (
    <div className="mt-1.5 space-y-0.5 pl-5">
      <div className="h-2 rounded-sm border border-border/60" style={{ background: cssGradient(scale) }} />
      <div className="flex justify-between font-mono text-[9px] text-muted-foreground">
        <span>{formatConverted(min, definition.quantity, units)}</span>
        <span>{formatConverted(mid, definition.quantity, units)}</span>
        <span>
          {formatConverted(max, definition.quantity, units)} {unit}
        </span>
      </div>
      <p className="font-mono text-[9px] text-muted-foreground">
        {definition.forecast && timeMs !== null ? `Forecast ${formatUtc(new Date(timeMs))} · ` : ""}
        {provider?.capabilities.name ?? definition.providerId}
      </p>
    </div>
  );
}
