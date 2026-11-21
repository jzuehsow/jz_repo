import { useState } from "react";
import { ChevronDown, ChevronRight, CloudSun } from "lucide-react";

import { WEATHER_GROUP_LABELS } from "@/weather/data/weatherLayers";
import type { WeatherLayerDefinition } from "@/weather/models/WeatherLayerDefinition";
import type { UnitPreferences } from "@/weather/models/units";
import { WeatherLegend } from "@/weather/components/WeatherLegend";
import { WeatherTimeControl } from "@/weather/components/WeatherTimeControl";
import { getWeatherProvider } from "@/weather/services/weatherService";
import type { WeatherState } from "@/weather/state/useWeather";

function statusText(weather: WeatherState, def: WeatherLayerDefinition) {
  const status = weather.statuses[def.id];
  if (weather.partialIds.has(def.id)) return { text: "Frames beyond the shared range hidden", tone: "text-warning" };
  switch (status?.kind) {
    case "loading":
      return { text: "Loading…", tone: "text-muted-foreground" };
    case "active":
      return { text: status.message ?? "Active", tone: "text-success" };
    case "error":
    case "unavailable":
      return { text: status.message ?? "Unavailable", tone: "text-destructive" };
    default:
      return { text: "Enabled", tone: "text-muted-foreground" };
  }
}

function LayerRow({ weather, def }: { weather: WeatherState; def: WeatherLayerDefinition }) {
  const enabled = weather.enabledIds.has(def.id);
  const status = enabled ? statusText(weather, def) : null;
  const opacity = weather.opacity[def.id] ?? def.defaultOpacity;
  return (
    <div className="rounded-sm border border-border/60 bg-card/50 px-2.5 py-1.5">
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={() => weather.toggle(def.id)}
          className="mt-0.5 size-3.5 accent-[var(--color-primary)]"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-medium text-foreground">{def.name}</span>
          <span className="block text-[10px] leading-snug text-muted-foreground">
            {def.description}
            {def.coverage !== "Global" ? ` · ${def.coverage}` : ""}
          </span>
        </span>
      </label>
      {enabled ? (
        <>
          {status ? <p className={`mt-1 pl-5 font-mono text-[10px] ${status.tone}`}>{status.text}</p> : null}
          <label className="mt-1 flex items-center gap-2 pl-5 font-mono text-[9px] text-muted-foreground">
            Opacity
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(event) => weather.setOpacity(def.id, Number(event.target.value))}
              className="flex-1 accent-[var(--color-primary)]"
              aria-label={`${def.name} opacity`}
            />
            <span className="w-7 text-right">{Math.round(opacity * 100)}%</span>
          </label>
          <WeatherLegend definition={def} units={weather.units} timeMs={weather.effectiveTimeMs} />
        </>
      ) : null}
    </div>
  );
}

function UnitSelect<K extends keyof UnitPreferences>({
  weather,
  field,
  options,
}: {
  weather: WeatherState;
  field: K;
  options: Array<[UnitPreferences[K], string]>;
}) {
  return (
    <select
      value={weather.units[field]}
      onChange={(event) =>
        weather.setUnits({ [field]: event.target.value } as Partial<UnitPreferences>)
      }
      className="rounded-sm border border-border bg-input px-1 py-0.5 font-mono text-[9px] text-foreground"
      aria-label={`${field} units`}
    >
      {options.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function WeatherLayerControls({ weather }: { weather: WeatherState }) {
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const groups = (["CORE", "OBSERVED", "SEVERE"] as const).map((group) => ({
    group,
    layers: weather.definitions.filter((d) => d.group === group),
  }));
  const advanced = weather.definitions.filter((d) => d.group === "ADVANCED");
  const active = weather.definitions.filter((d) => weather.enabledIds.has(d.id));
  const heatmaps = active.filter((d) => d.fullScreenRaster).length;
  const providers = [...new Set(active.map((d) => d.providerId))]
    .map((id) => getWeatherProvider(id)?.capabilities)
    .filter((c) => c !== undefined);

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 text-left"
      >
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        <CloudSun className="size-3 text-muted-foreground" aria-hidden />
        <span className="label-caps flex-1 text-[9px]">Weather</span>
        <span className="font-mono text-[10px] text-muted-foreground">{active.length} on</span>
      </button>

      {open ? (
        <div className="space-y-2">
          <WeatherTimeControl weather={weather} />
          {heatmaps >= 3 ? (
            <p className="rounded-sm border border-warning/50 px-2 py-1 text-[10px] text-warning">
              {heatmaps} full-view heatmaps are stacked and may obscure each other — lower opacity or turn some off.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-1 font-mono text-[9px] text-muted-foreground">
            Units
            <UnitSelect weather={weather} field="temperature" options={[["F", "°F"], ["C", "°C"]]} />
            <UnitSelect weather={weather} field="speed" options={[["mph", "mph"], ["kt", "kt"], ["kmh", "km/h"]]} />
            <UnitSelect weather={weather} field="precip" options={[["in", "in"], ["mm", "mm"]]} />
            <UnitSelect weather={weather} field="pressure" options={[["hPa", "hPa"], ["mb", "mb"]]} />
          </div>
          {groups.map(({ group, layers }) => (
            <div key={group} className="space-y-1">
              <p className="text-[9px] tracking-wider text-muted-foreground uppercase">{WEATHER_GROUP_LABELS[group]}</p>
              {layers.map((def) => (
                <LayerRow key={def.id} weather={weather} def={def} />
              ))}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex items-center gap-1 text-[9px] tracking-wider text-muted-foreground uppercase hover:text-foreground"
          >
            {advancedOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            {WEATHER_GROUP_LABELS.ADVANCED}
          </button>
          {advancedOpen ? advanced.map((def) => <LayerRow key={def.id} weather={weather} def={def} />) : null}
          {providers.length > 0 ? (
            <div className="space-y-0.5 border-t border-border/50 pt-1.5">
              {providers.map((c) => (
                <p key={c.id} className="text-[9px] leading-snug text-muted-foreground">
                  <a href={c.sourceUrl} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                    {c.attribution}
                  </a>{" "}
                  · {c.license} · {c.coverage}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
