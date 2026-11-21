import { useState } from "react";
import { Layers, Plane, Plus, Ship, Trash2 } from "lucide-react";

import type { AircraftServiceStatus } from "@/aircraft/services/aircraftService";
import { AIRCRAFT_LAYER_ID, VESSEL_LAYER_ID } from "@/layers/defaultLayers";
import { MARITIME_PROVIDERS, maritimeService, type MaritimeServiceStatus } from "@/maritime/services/maritimeService";
import type { LayerDefinition, LayerRuntimeStatus } from "@/layers/LayerDefinition";
import { formatUtc } from "@/lib/format";
import type { LayersState } from "@/state/useLayers";
import type { SceneModeKind } from "@/state/simulationStore";
import { ReferenceLayerControls } from "@/components/console/ReferenceLayerControls";
import { EarthEffectsControls } from "@/components/console/EarthEffectsControls";
import { isTileLayer } from "@/layers/LayerDefinition";
import { WeatherLayerControls } from "@/weather/components/WeatherLayerControls";
import type { WeatherState } from "@/weather/state/useWeather";

interface LayersPanelProps {
  layers: LayersState;
  sceneMode: SceneModeKind;
  aircraft: AircraftServiceStatus;
  weather: WeatherState;
  maritime: MaritimeServiceStatus;
}

function statusLabel(
  definition: LayerDefinition,
  status: LayerRuntimeStatus | undefined,
  enabled: boolean,
  hasIonToken: boolean,
  sceneMode: SceneModeKind,
): { text: string; tone: string } | null {
  if (definition.requiresToken && !hasIonToken) {
    return { text: "Needs Cesium ion token", tone: "text-warning" };
  }
  if (!enabled) return null;
  if (sceneMode === "2D" && !definition.supportsSceneMode2D) {
    return { text: "Hidden in 2D view", tone: "text-muted-foreground" };
  }
  switch (status?.kind) {
    case "loading":
      return { text: "Loading…", tone: "text-muted-foreground" };
    case "active":
      return { text: "Active", tone: "text-success" };
    case "suspended":
      return { text: status.message ?? "Suspended", tone: "text-muted-foreground" };
    case "unavailable":
      return { text: status.message ?? "Unavailable", tone: "text-warning" };
    case "error":
      return { text: status.message ?? "Failed to load", tone: "text-destructive" };
    default:
      return { text: "Enabled", tone: "text-muted-foreground" };
  }
}

export function LayersPanel({ layers, sceneMode, aircraft, weather, maritime }: LayersPanelProps) {
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const tileLayers = layers.definitions.filter(isTileLayer);
  const onCount = layers.definitions.filter((l) => !l.parentId && layers.enabledIds.has(l.id)).length;
  const vesselLayer = layers.definitions.find((layer) => layer.id === VESSEL_LAYER_ID);
  const vesselsEnabled = layers.enabledIds.has(VESSEL_LAYER_ID);
  const aircraftLayer = layers.definitions.find((layer) => layer.id === AIRCRAFT_LAYER_ID);
  const aircraftEnabled = layers.enabledIds.has(AIRCRAFT_LAYER_ID);

  return (
    <div className="border-b border-panel-border">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-secondary/40"
      >
        <Layers className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="label-caps flex-1">Layers</span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {onCount + weather.enabledIds.size} on
        </span>
      </button>

      {open ? (
        <div className="max-h-[60vh] flex flex-col gap-3 overflow-y-auto px-3 pb-3">
          <ReferenceLayerControls layers={layers} only={["SPACE"]} />
          <EarthEffectsControls layers={layers} weather={weather} />
          <div className="order-last space-y-1.5">
            <p className="label-caps text-[9px]">3D layers</p>
            {tileLayers.map((layer) => {
              const enabled = layers.enabledIds.has(layer.id);
              const blocked = layer.requiresToken && !layers.hasIonToken;
              const status = statusLabel(
                layer,
                layers.statuses[layer.id],
                enabled,
                layers.hasIonToken,
                sceneMode,
              );
              return (
                <div
                  key={layer.id}
                  className="rounded-sm border border-border/60 bg-card/50 px-2.5 py-2"
                >
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={blocked}
                      onChange={() => layers.toggleLayer(layer.id)}
                      className="mt-0.5 size-3.5 accent-[var(--color-primary)] disabled:opacity-40"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-medium text-foreground">
                        {layer.name}
                      </span>
                      <span className="block text-[10px] leading-snug text-muted-foreground">
                        {layer.description}
                      </span>
                    </span>
                    {layer.removable ? (
                      <button
                        type="button"
                        aria-label={`Remove ${layer.name}`}
                        onClick={() => layers.removeCustomLayer(layer.id)}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : null}
                  </label>
                  {status ? (
                    <p className={`mt-1 pl-5 font-mono text-[10px] ${status.tone}`}>{status.text}</p>
                  ) : null}
                </div>
              );
            })}

            {addOpen ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!url.trim()) return;
                  layers.addCustomLayer(name, url);
                  setName("");
                  setUrl("");
                  setAddOpen(false);
                }}
                className="space-y-1.5 rounded-sm border border-border/60 bg-card/50 p-2.5"
              >
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Layer name"
                  className="w-full rounded-sm border border-border bg-input px-2 py-1 text-[11px] text-foreground outline-none focus:border-primary"
                />
                <input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://host/tileset.json"
                  className="w-full rounded-sm border border-border bg-input px-2 py-1 font-mono text-[10px] text-foreground outline-none focus:border-primary"
                />
                <div className="flex gap-1.5">
                  <button
                    type="submit"
                    className="flex-1 rounded-sm bg-primary/90 px-2 py-1 font-mono text-[10px] tracking-wider text-primary-foreground hover:bg-primary"
                  >
                    ADD SOURCE
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddOpen(false)}
                    className="rounded-sm border border-border px-2 py-1 font-mono text-[10px] tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-border/70 px-2 py-1.5 font-mono text-[10px] tracking-wider text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                <Plus className="size-3" />
                SELF-HOSTED 3D TILES
              </button>
            )}
          </div>

          {aircraftLayer ? (
            <div className="space-y-1.5">
              <p className="label-caps text-[9px]">Air</p>
              <div className="rounded-sm border border-border/60 bg-card/50 px-2.5 py-2">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={aircraftEnabled}
                    onChange={() => layers.toggleLayer(aircraftLayer.id)}
                    className="mt-0.5 size-3.5 accent-[var(--color-primary)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                      <Plane className="size-3" aria-hidden />
                      {aircraftLayer.name}
                    </span>
                    <span className="block text-[10px] leading-snug text-muted-foreground">
                      {aircraftLayer.description}
                    </span>
                  </span>
                </label>
                {aircraftEnabled ? (
                  <div className="mt-1.5 space-y-0.5 pl-5 font-mono text-[10px]">
                    <p className={aircraft.error ? "text-destructive" : "text-success"}>
                      {aircraft.error
                        ? aircraft.error
                        : `${aircraft.count} aircraft · ${aircraft.providerName}`}
                    </p>
                    <p className={aircraft.stale ? "text-warning" : "text-muted-foreground"}>
                      {aircraft.loading
                        ? "Refreshing…"
                        : aircraft.lastRefreshMs
                          ? `${aircraft.stale ? "Stale · " : ""}Updated ${formatUtc(new Date(aircraft.lastRefreshMs))}`
                          : "Waiting for first response…"}
                    </p>
                    <p className="text-[9px] leading-snug text-muted-foreground">
                      {aircraft.attribution}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {vesselLayer ? (
            <div className="space-y-1.5">
              <p className="label-caps text-[9px]">Maritime</p>
              <div className="rounded-sm border border-border/60 bg-card/50 px-2.5 py-2">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={vesselsEnabled}
                    onChange={() => layers.toggleLayer(vesselLayer.id)}
                    className="mt-0.5 size-3.5 accent-[var(--color-primary)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                      <Ship className="size-3" aria-hidden />
                      {vesselLayer.name}
                    </span>
                    <span className="block text-[10px] leading-snug text-muted-foreground">
                      {vesselLayer.description}
                    </span>
                  </span>
                </label>
                <div className="mt-1.5 pl-5">
                  <select
                    value={maritime.providerId}
                    onChange={(event) => maritimeService.setProvider(event.target.value)}
                    aria-label="AIS source"
                    className="w-full rounded-sm border border-border bg-input px-1 py-0.5 font-mono text-[10px] text-foreground"
                  >
                    {MARITIME_PROVIDERS.map((p) => (
                      <option key={p.capabilities.id} value={p.capabilities.id}>
                        {p.capabilities.name} — {p.capabilities.coverage}
                        {p.capabilities.requiresCredentials ? " (needs API key)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {vesselsEnabled ? (
                  <div className="mt-1.5 space-y-0.5 pl-5 font-mono text-[10px]">
                    <p className={maritime.error ? "text-destructive" : "text-success"}>
                      {maritime.error ?? `${maritime.count} vessels · ${maritime.providerName}`}
                    </p>
                    <p className={maritime.stale ? "text-warning" : "text-muted-foreground"}>
                      {maritime.loading
                        ? "Refreshing…"
                        : maritime.lastRefreshMs
                          ? `${maritime.stale ? "Stale · " : ""}Updated ${formatUtc(new Date(maritime.lastRefreshMs))}`
                          : "Waiting for first response…"}
                    </p>
                    <p className="text-[9px] leading-snug text-muted-foreground">
                      Coverage: {maritime.coverage} · {maritime.attribution}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <ReferenceLayerControls layers={layers} only={["TRANSPORTATION", "MAP_LABELS"]} />
          <WeatherLayerControls weather={weather} />
        </div>
      ) : null}
    </div>
  );
}
