import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { DAY_NIGHT_LAYER_ID } from "@/layers/defaultLayers";
import type { LayersState } from "@/state/useLayers";
import type { WeatherState } from "@/weather/state/useWeather";

/** Weather grid that drives the cloud effect (Open-Meteo total cloud cover). */
export const CLOUD_WEATHER_ID = "wx-cloud";

function Toggle({ checked, onChange, title, description, note }: {
  checked: boolean; onChange: () => void; title: string; description: string; note?: string | null;
}) {
  return (
    <div className="rounded-sm border border-border/60 bg-card/50 px-2.5 py-2">
      <label className="flex items-start gap-2">
        <input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 size-3.5 accent-[var(--color-primary)]" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-medium text-foreground">{title}</span>
          <span className="block text-[10px] leading-snug text-muted-foreground">{description}</span>
        </span>
      </label>
      {checked && note ? <p className="mt-1 pl-5 font-mono text-[10px] text-muted-foreground">{note}</p> : null}
    </div>
  );
}

/** EARTH EFFECTS: sun-lit day/night shading and weather-driven clouds. */
export function EarthEffectsControls({ layers, weather }: { layers: LayersState; weather: WeatherState }) {
  const [collapsed, setCollapsed] = useState(false);
  const cloudStatus = weather.statuses[CLOUD_WEATHER_ID];
  const cloudNote = cloudStatus?.kind === "loading" ? "Loading…" : cloudStatus?.kind === "error" ? (cloudStatus.message ?? "error") : "Open-Meteo cloud cover (CC BY 4.0)";
  return (
    <div className="space-y-1.5">
      <button type="button" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed} className="flex w-full items-center gap-1 text-left">
        {collapsed ? <ChevronRight className="size-3" aria-hidden /> : <ChevronDown className="size-3" aria-hidden />}
        <span className="label-caps text-[9px]">Earth effects</span>
      </button>
      {collapsed ? null : (
        <>
          <Toggle
            checked={layers.enabledIds.has(DAY_NIGHT_LAYER_ID)}
            onChange={() => layers.toggleLayer(DAY_NIGHT_LAYER_ID)}
            title="Day / Night"
            description="Sunlit and night sides from the sun position at the current simulation time."
            note="Follows the time slider"
          />
          <Toggle
            checked={weather.enabledIds.has(CLOUD_WEATHER_ID)}
            onChange={() => weather.toggle(CLOUD_WEATHER_ID)}
            title="Clouds"
            description="Cloud cover from live forecast weather data for the area in view."
            note={cloudNote}
          />
        </>
      )}
    </div>
  );
}
