import { useEffect, useMemo, useRef, useState } from "react";
import {
  SAT_DEBRIS_LAYER_ID,
  SAT_LABELS_LAYER_ID,
  DAY_NIGHT_LAYER_ID,
  SAT_ORBITS_LAYER_ID,
  SAT_ROCKET_LAYER_ID,
  SATELLITES_LAYER_ID,
} from "@/layers/defaultLayers";

import { AIRCRAFT_MAX_RENDERED, aircraftService } from "@/aircraft/services/aircraftService";
import { useAircraftStatus } from "@/aircraft/state/useAircraft";
import { CesiumGlobe, type GlobeHandle } from "@/components/globe/CesiumGlobe";
import { AircraftDetailsPanel } from "@/components/console/AircraftDetailsPanel";
import { CatalogPanel } from "@/components/console/CatalogPanel";
import { DetailsPanel } from "@/components/console/DetailsPanel";
import { LayersPanel } from "@/components/console/LayersPanel";
import { TimeControls } from "@/components/console/TimeControls";
import { TopBar } from "@/components/console/TopBar";
import { matchesFilters } from "@/domain/spaceObject";
import { propagateState } from "@/propagation/sgp4Propagator";
import { useSimulation } from "@/state/simulationStore";
import { useCatalog } from "@/state/useCatalog";
import { useLayers } from "@/state/useLayers";
import { WeatherAlertPopup } from "@/weather/components/WeatherAlertPopup";
import { useWeather } from "@/weather/state/useWeather";
import { VesselDetailsPanel } from "@/components/console/VesselDetailsPanel";
import { maritimeService } from "@/maritime/services/maritimeService";
import { useMaritimeStatus } from "@/maritime/state/useMaritime";

aircraftService.setMaxRendered(AIRCRAFT_MAX_RENDERED);

export function WorldboxConsole() {
  const layers = useLayers();
  const satellitesOn = layers.enabledIds.has(SATELLITES_LAYER_ID);
  const debrisOn = layers.enabledIds.has(SAT_DEBRIS_LAYER_ID);
  const rocketsOn = layers.enabledIds.has(SAT_ROCKET_LAYER_ID);
  const { data, isLoading, error } = useCatalog(satellitesOn);
  const { filters, selectedNoradId, selectObject, sceneMode, simTimeMs, timeRef } = useSimulation();
  const globeRef = useRef<GlobeHandle>(null);
  if (import.meta.env.DEV && typeof window !== "undefined") {
    (window as unknown as { __worldboxGlobe?: typeof globeRef }).__worldboxGlobe = globeRef;
  }
  const [catalogMinimized, setCatalogMinimized] = useState(false);
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null);
  const aircraftStatus = useAircraftStatus();
  const weather = useWeather();
  const maritimeStatus = useMaritimeStatus();
  const [selectedVesselId, setSelectedVesselId] = useState<number | null>(null);

  const objects = data?.objects ?? [];

  const results = useMemo(
    () =>
      satellitesOn
        ? objects.filter(
            (object) =>
              matchesFilters(object, filters) &&
              (debrisOn || object.objectType !== "DEBRIS") &&
              (rocketsOn || object.objectType !== "ROCKET BODY"),
          )
        : [],
    [objects, filters, satellitesOn, debrisOn, rocketsOn],
  );

  // Turning Satellites off deselects a selected satellite.
  useEffect(() => {
    if (!satellitesOn && selectedNoradId !== null) selectObject(null);
  }, [satellitesOn, selectedNoradId, selectObject]);

  const visibleIds = useMemo(() => new Set(results.map((object) => object.noradId)), [results]);

  const operators = useMemo(() => {
    const set = new Set<string>();
    for (const object of objects) set.add(object.constellation ?? object.operator ?? "Unknown");
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [objects]);

  const selected = useMemo(
    () => (satellitesOn ? (objects.find((object) => object.noradId === selectedNoradId) ?? null) : null),
    [objects, selectedNoradId, satellitesOn],
  );

  // React-rate state readout (~5 Hz); the globe propagates independently.
  const selectedState = useMemo(
    () => (selected ? propagateState(selected, new Date(simTimeMs)) : null),
    [selected, simTimeMs],
  );

  // Live observation, re-read whenever the aircraft service publishes.
  const selectedAircraft = selectedAircraftId
    ? aircraftService.getTrack(selectedAircraftId)
    : null;
  const showAircraftDetails = selectedAircraftId !== null && aircraftStatus.enabled;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <CesiumGlobe
        objects={objects}
        visibleIds={visibleIds}
        selectedNoradId={selectedNoradId}
        sceneMode={sceneMode}
        timeRef={timeRef}
        onSelect={(noradId) => {
          if (noradId !== null) {
            setSelectedAircraftId(null);
            setSelectedVesselId(null);
          }
          selectObject(noradId);
        }}
        handleRef={globeRef}
        satellitesEnabled={satellitesOn}
        satOrbitsEnabled={layers.enabledIds.has(SAT_ORBITS_LAYER_ID)}
        satLabelsEnabled={layers.enabledIds.has(SAT_LABELS_LAYER_ID)}
        dayNightEnabled={layers.enabledIds.has(DAY_NIGHT_LAYER_ID)}
        layerDefinitions={layers.definitions}
        enabledLayerIds={layers.enabledIds}
        onLayerStatus={layers.reportStatus}
        selectedAircraftId={selectedAircraftId}
        onSelectAircraft={(icaoHex) => {
          if (icaoHex !== null) {
            selectObject(null);
            setSelectedVesselId(null);
          }
          setSelectedAircraftId(icaoHex);
        }}
        weatherDefinitions={weather.definitions}
        enabledWeatherIds={weather.enabledIds}
        weatherOpacity={weather.opacity}
        weatherTimeMs={weather.effectiveTimeMs}
        onWeatherStatus={weather.reportStatus}
        onWeatherFrames={weather.reportFrames}
        onSelectWeatherAlert={weather.selectAlert}
        selectedVesselId={selectedVesselId}
        onSelectVessel={(mmsi) => {
          if (mmsi !== null) {
            selectObject(null);
            setSelectedAircraftId(null);
          }
          setSelectedVesselId(mmsi);
        }}
      />

      <div className="pointer-events-none absolute inset-0 flex flex-col gap-3 p-3">
        <TopBar
          objectCount={objects.length}
          visibleCount={results.length}
          providerLabel={data?.providerLabel ?? "connecting…"}
          degraded={data?.degraded ?? false}
          onResetView={() => globeRef.current?.resetView()}
        />

        <div className="flex min-h-0 flex-1 items-stretch justify-between gap-3">
          <div
            className={`flex min-h-0 flex-col gap-3 transition-all ${
              catalogMinimized ? "w-auto" : "max-w-[19rem] flex-1"
            }`}
          >
            {catalogMinimized ? null : (
              <div className="panel-surface pointer-events-auto shrink-0 overflow-hidden rounded-md">
                <LayersPanel layers={layers} sceneMode={sceneMode} aircraft={aircraftStatus} weather={weather} maritime={maritimeStatus} />
              </div>
            )}

            <CatalogPanel
              results={results}
              operators={operators}
              isLoading={isLoading}
              minimized={catalogMinimized}
              onToggleMinimize={() => setCatalogMinimized((previous) => !previous)}
              notice={
                error instanceof Error
                  ? `Catalog error: ${error.message}`
                  : (data?.notice ?? undefined)
              }
            />
          </div>

          <div className="hidden min-h-0 flex-col items-end gap-3 lg:flex">
            {weather.selectedAlert ? (
              <WeatherAlertPopup alert={weather.selectedAlert} onClose={() => weather.selectAlert(null)} />
            ) : null}
            {selectedVesselId !== null && maritimeStatus.enabled ? (
              <VesselDetailsPanel
                track={maritimeService.getTrack(selectedVesselId)}
                attribution={maritimeStatus.attribution}
                coverage={maritimeStatus.coverage}
                onClear={() => setSelectedVesselId(null)}
                onFocus={(track) =>
                  globeRef.current?.focusGeodetic(track.state.longitudeDeg, track.state.latitudeDeg, 2_000)
                }
              />
            ) : showAircraftDetails ? (
              <AircraftDetailsPanel
                track={selectedAircraft}
                attribution={aircraftStatus.attribution}
                onClear={() => setSelectedAircraftId(null)}
                onFocus={(track) =>
                  globeRef.current?.focusGeodetic(
                    track.state.longitudeDeg,
                    track.state.latitudeDeg,
                    (track.state.altitudeFt ?? 0) * 0.3048,
                  )
                }
              />
            ) : selected ? (
              <DetailsPanel
                object={selected}
                state={selectedState}
                onFocus={(noradId) => globeRef.current?.focus(noradId)}
              />
            ) : null}
          </div>
        </div>

        <TimeControls />
      </div>
    </div>
  );
}
