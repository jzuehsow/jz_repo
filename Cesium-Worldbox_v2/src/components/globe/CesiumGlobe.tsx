import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";

import {
  AircraftLayerController,
  isAircraftPickId,
} from "@/aircraft/render/aircraftLayerController";
import type { SpaceObject } from "@/domain/spaceObject";
import { AIRCRAFT_LAYER_ID, VESSEL_LAYER_ID } from "@/layers/defaultLayers";
import { ReferenceLayerHost } from "@/reference/ReferenceLayerHost";
import { isVesselPickId, VesselLayerController } from "@/maritime/render/vesselLayerController";
import { isTileLayer, type LayerDefinition, type LayerRuntimeStatus } from "@/layers/LayerDefinition";
import { LayerManager } from "@/layers/LayerManager";
import { loadCesium, type CesiumModule } from "@/lib/cesium/loadCesium";
import { computeOrbitTrack, propagateRaw } from "@/propagation/sgp4Propagator";
import type { SceneModeKind } from "@/state/simulationStore";
import type { WeatherAlert } from "@/weather/models/WeatherFrame";
import type { WeatherLayerDefinition } from "@/weather/models/WeatherLayerDefinition";
import { WeatherLayerManager } from "@/weather/services/weatherLayerManager";

export interface GlobeHandle {
  resetView(): void;
  focus(noradId: number): void;
  focusGeodetic(longitudeDeg: number, latitudeDeg: number, altitudeMeters: number): void;
}

interface CesiumGlobeProps {
  objects: SpaceObject[];
  visibleIds: Set<number>;
  selectedNoradId: number | null;
  sceneMode: SceneModeKind;
  timeRef: React.MutableRefObject<number>;
  onSelect: (noradId: number | null) => void;
  handleRef?: Ref<GlobeHandle>;
  /** Optional geospatial layers; nothing loads until an id is enabled. */
  layerDefinitions?: LayerDefinition[];
  enabledLayerIds?: Set<string>;
  onLayerStatus?: (status: LayerRuntimeStatus) => void;
  selectedAircraftId?: string | null;
  onSelectAircraft?: (icaoHex: string | null) => void;
  /** Optional weather subsystem; inert until an id is enabled. */
  weatherDefinitions?: WeatherLayerDefinition[];
  enabledWeatherIds?: Set<string>;
  weatherOpacity?: Record<string, number>;
  weatherTimeMs?: number | null;
  onWeatherStatus?: (status: LayerRuntimeStatus) => void;
  onWeatherFrames?: (id: string, times: number[] | null) => void;
  onSelectWeatherAlert?: (alert: WeatherAlert | null) => void;
  selectedVesselId?: number | null;
  onSelectVessel?: (mmsi: number | null) => void;
  /** Satellite layer + children; when off, no satellite rendering or propagation runs. */
  satellitesEnabled?: boolean;
  satOrbitsEnabled?: boolean;
  satLabelsEnabled?: boolean;
  /** Sun-driven day/night shading tied to the simulation clock. */
  dayNightEnabled?: boolean;
}

const REGIME_COLORS: Record<string, [number, number, number]> = {
  LEO: [0.36, 0.86, 0.92],
  MEO: [0.55, 0.9, 0.5],
  GEO: [0.99, 0.73, 0.34],
  HEO: [0.98, 0.45, 0.42],
};

const POSITION_UPDATE_MS = 70;
const ORBIT_UPDATE_MS = 1200;

export function CesiumGlobe({
  objects,
  visibleIds,
  selectedNoradId,
  sceneMode,
  timeRef,
  onSelect,
  handleRef,
  layerDefinitions,
  enabledLayerIds,
  onLayerStatus,
  selectedAircraftId = null,
  onSelectAircraft,
  weatherDefinitions,
  enabledWeatherIds,
  weatherOpacity,
  weatherTimeMs = null,
  onWeatherStatus,
  onWeatherFrames,
  onSelectWeatherAlert,
  selectedVesselId = null,
  onSelectVessel,
  satellitesEnabled = true,
  satOrbitsEnabled = true,
  satLabelsEnabled = true,
  dayNightEnabled = false,
}: CesiumGlobeProps) {
  const satFlagsRef = useRef({ satellitesEnabled, satOrbitsEnabled, satLabelsEnabled });
  satFlagsRef.current = { satellitesEnabled, satOrbitsEnabled, satLabelsEnabled };
  const referenceHostRef = useRef<ReferenceLayerHost | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cesiumRef = useRef<CesiumModule | null>(null);
  const viewerRef = useRef<import("cesium").Viewer | null>(null);
  const pointsRef = useRef<import("cesium").PointPrimitiveCollection | null>(null);
  const indexRef = useRef<Map<number, import("cesium").PointPrimitive>>(new Map());
  const objectsRef = useRef<SpaceObject[]>(objects);
  const visibleRef = useRef<Set<number>>(visibleIds);
  const selectedRef = useRef<number | null>(selectedNoradId);
  const onSelectRef = useRef(onSelect);
  const orbitEntityRef = useRef<import("cesium").Entity | null>(null);
  const markerEntityRef = useRef<import("cesium").Entity | null>(null);
  const orbitPositionsRef = useRef<import("cesium").Cartesian3[]>([]);
  const markerPositionRef = useRef<import("cesium").Cartesian3 | null>(null);
  const layerManagerRef = useRef<LayerManager | null>(null);
  const aircraftControllerRef = useRef<AircraftLayerController | null>(null);
  const onSelectAircraftRef = useRef(onSelectAircraft);
  const onLayerStatusRef = useRef(onLayerStatus);
  const weatherManagerRef = useRef<WeatherLayerManager | null>(null);
  const vesselControllerRef = useRef<VesselLayerController | null>(null);
  const onSelectVesselRef = useRef(onSelectVessel);
  onSelectVesselRef.current = onSelectVessel;
  const weatherCallbacksRef = useRef({ onWeatherStatus, onWeatherFrames, onSelectWeatherAlert });
  weatherCallbacksRef.current = { onWeatherStatus, onWeatherFrames, onSelectWeatherAlert };
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  objectsRef.current = objects;
  visibleRef.current = visibleIds;
  selectedRef.current = selectedNoradId;
  onSelectRef.current = onSelect;
  onSelectAircraftRef.current = onSelectAircraft;
  onLayerStatusRef.current = onLayerStatus;

  useImperativeHandle(handleRef, () => ({
    focusGeodetic(longitudeDeg: number, latitudeDeg: number, altitudeMeters: number) {
      const Cesium = cesiumRef.current;
      const viewer = viewerRef.current;
      if (!Cesium || !viewer) return;
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          longitudeDeg,
          latitudeDeg,
          Math.max(30_000, altitudeMeters * 6 + 60_000),
        ),
        duration: 1.1,
      });
    },
    resetView() {
      const Cesium = cesiumRef.current;
      const viewer = viewerRef.current;
      if (!Cesium || !viewer) return;
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(0, 12, 42_000_000),
        duration: 1.2,
      });
    },
    focus(noradId: number) {
      const Cesium = cesiumRef.current;
      const viewer = viewerRef.current;
      if (!Cesium || !viewer) return;
      const object = objectsRef.current.find((o) => o.noradId === noradId);
      if (!object) return;
      const state = propagateRaw(object, new Date(timeRef.current));
      if (!state) return;
      const target = new Cesium.Cartesian3(
        state.positionEcefKm.x * 1000,
        state.positionEcefKm.y * 1000,
        state.positionEcefKm.z * 1000,
      );
      const range = Math.max(2_500_000, state.altitudeKm * 4200);
      const direction = Cesium.Cartesian3.normalize(target, new Cesium.Cartesian3());
      const destination = Cesium.Cartesian3.add(
        target,
        Cesium.Cartesian3.multiplyByScalar(direction, range, new Cesium.Cartesian3()),
        new Cesium.Cartesian3(),
      );
      viewer.camera.flyTo({ destination, duration: 1.1 });
    },
  }));

  // Viewer bootstrap (browser only, once).
  useEffect(() => {
    let disposed = false;
    let removeTick: (() => void) | undefined;
    let clickHandler: import("cesium").ScreenSpaceEventHandler | null = null;

    void (async () => {
      try {
        const Cesium = await loadCesium();
        if (disposed || !containerRef.current) return;
        cesiumRef.current = Cesium;

        const viewer = new Cesium.Viewer(containerRef.current, {
          baseLayer: Cesium.ImageryLayer.fromProviderAsync(
            Cesium.TileMapServiceImageryProvider.fromUrl(
              Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
            ),
            {},
          ),
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          scene3DOnly: false,
          requestRenderMode: false,
        });
        viewerRef.current = viewer;

        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#0a1420");
        if (viewer.scene.skyAtmosphere) {
          viewer.scene.skyAtmosphere.hueShift = -0.06;
          viewer.scene.skyAtmosphere.saturationShift = -0.2;
          viewer.scene.skyAtmosphere.brightnessShift = -0.35;
        }
        viewer.scene.globe.showGroundAtmosphere = true;
        viewer.scene.globe.enableLighting = false;
        viewer.scene.highDynamicRange = false;
        viewer.scene.fog.enabled = false;
        viewer.resolutionScale = Math.min(window.devicePixelRatio ?? 1, 1.5);

        const layer = viewer.imageryLayers.get(0);
        if (layer) {
          layer.brightness = 0.52;
          layer.saturation = 0.55;
          layer.contrast = 1.12;
          layer.gamma = 0.9;
        }

        const points = viewer.scene.primitives.add(
          new Cesium.PointPrimitiveCollection({ blendOption: Cesium.BlendOption.OPAQUE }),
        ) as import("cesium").PointPrimitiveCollection;
        pointsRef.current = points;

        orbitEntityRef.current = viewer.entities.add({
          polyline: {
            positions: new Cesium.CallbackProperty(() => orbitPositionsRef.current, false),
            width: 1.7,
            material: Cesium.Color.fromCssColorString("#5ce1e6").withAlpha(0.85),
            arcType: Cesium.ArcType.NONE,
          },
        });

        markerEntityRef.current = viewer.entities.add({
          position: new Cesium.CallbackPositionProperty(
            () => markerPositionRef.current ?? undefined,
            false,
          ),
          point: {
            pixelSize: 12,
            color: Cesium.Color.TRANSPARENT,
            outlineColor: Cesium.Color.fromCssColorString("#ffffff"),
            outlineWidth: 2,
          },
          label: {
            text: "",
            font: "500 12px Barlow, sans-serif",
            fillColor: Cesium.Color.fromCssColorString("#e8f4ff"),
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString("#0b1622").withAlpha(0.75),
            pixelOffset: new Cesium.Cartesian2(14, -14),
            horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });

        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(0, 12, 42_000_000),
        });

        clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        clickHandler.setInputAction((movement: { position: import("cesium").Cartesian2 }) => {
          const picked = viewer.scene.pick(movement.position);
          const id = picked?.id;
          if (typeof id === "number") {
            onSelectAircraftRef.current?.(null);
            onSelectVesselRef.current?.(null);
            onSelectRef.current(id);
            return;
          }
          const alert = weatherManagerRef.current?.alertForPick(picked);
          if (alert) {
            weatherCallbacksRef.current.onSelectWeatherAlert?.(alert);
            return;
          }
          if (isVesselPickId(id)) {
            onSelectRef.current(null);
            onSelectAircraftRef.current?.(null);
            onSelectVesselRef.current?.(id.mmsi);
            return;
          }
          if (isAircraftPickId(id)) {
            onSelectRef.current(null);
            onSelectVesselRef.current?.(null);
            onSelectAircraftRef.current?.(id.icaoHex);
            return;
          }
          onSelectRef.current(null);
          onSelectAircraftRef.current?.(null);
          onSelectVesselRef.current?.(null);
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Layer + aircraft controllers live next to the viewer, outside React.
        layerManagerRef.current = new LayerManager(Cesium, viewer, (status) =>
          onLayerStatusRef.current?.(status),
        );
        aircraftControllerRef.current = new AircraftLayerController(Cesium, viewer);
        vesselControllerRef.current = new VesselLayerController(Cesium, viewer);
        referenceHostRef.current = new ReferenceLayerHost(Cesium, viewer, (status) =>
          onLayerStatusRef.current?.(status),
        );
        weatherManagerRef.current = new WeatherLayerManager(Cesium, viewer, {
          onStatus: (status) => weatherCallbacksRef.current.onWeatherStatus?.(status),
          onFrames: (id, times) => weatherCallbacksRef.current.onWeatherFrames?.(id, times),
        });

        let lastPositionUpdate = 0;
        let lastOrbitUpdate = 0;
        let lastOrbitKey = "";

        // Keep Cesium's clock (and therefore the sun) on the simulation time.
        viewer.clock.shouldAnimate = false;
        const syncClock = () => {
          Cesium.JulianDate.fromDate(new Date(timeRef.current), viewer.clock.currentTime);
        };
        syncClock();
        viewer.clock.onTick.addEventListener(syncClock);

        const tick = () => {
          const now = performance.now();
          const flags = satFlagsRef.current;
          if (!flags.satellitesEnabled) {
            if (lastOrbitKey !== "off") {
              orbitPositionsRef.current = [];
              markerPositionRef.current = null;
              setLabel(Cesium, "");
              lastOrbitKey = "off";
            }
            return;
          }
          if (now - lastPositionUpdate >= POSITION_UPDATE_MS) {
            lastPositionUpdate = now;
            updatePositions(Cesium, new Date(timeRef.current));
          }
          const selected = selectedRef.current;
          const key = `${selected ?? "none"}:${flags.satOrbitsEnabled}:${flags.satLabelsEnabled}`;
          if (selected === null) {
            orbitPositionsRef.current = [];
            markerPositionRef.current = null;
            setLabel(Cesium, "");
            lastOrbitKey = "";
          } else if (key !== lastOrbitKey || now - lastOrbitUpdate >= ORBIT_UPDATE_MS) {
            lastOrbitKey = key;
            lastOrbitUpdate = now;
            updateOrbit(Cesium, selected, new Date(timeRef.current));
          }
        };

        viewer.scene.preRender.addEventListener(tick);
        removeTick = () => viewer.scene.preRender.removeEventListener(tick);

        setReady(true);
      } catch (cause) {
        console.error("Cesium failed to initialize", cause);
        setError(cause instanceof Error ? cause.message : "Cesium failed to initialize");
      }
    })();

    return () => {
      disposed = true;
      removeTick?.();
      clickHandler?.destroy();
      aircraftControllerRef.current?.disable();
      aircraftControllerRef.current = null;
      vesselControllerRef.current?.disable();
      vesselControllerRef.current = null;
      layerManagerRef.current?.destroyAll();
      referenceHostRef.current?.destroyAll();
      referenceHostRef.current = null;
      layerManagerRef.current = null;
      weatherManagerRef.current?.destroyAll();
      weatherManagerRef.current = null;
      indexRef.current.clear();
      pointsRef.current = null;
      const viewer = viewerRef.current;
      viewerRef.current = null;
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild the point cloud when the catalog changes.
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const points = pointsRef.current;
    if (!ready || !Cesium || !points) return;

    points.removeAll();
    indexRef.current.clear();
    for (const object of objects) {
      const rgb = REGIME_COLORS[object.orbit.regime] ?? REGIME_COLORS["LEO"]!;
      const point = points.add({
        id: object.noradId,
        position: Cesium.Cartesian3.ZERO,
        pixelSize: object.orbit.regime === "GEO" ? 3.4 : 3,
        color: new Cesium.Color(rgb[0], rgb[1], rgb[2], 1),
        show: visibleRef.current.has(object.noradId),
      }) as import("cesium").PointPrimitive;
      indexRef.current.set(object.noradId, point);
    }
  }, [objects, ready]);

  // Filter visibility.
  useEffect(() => {
    if (!ready) return;
    for (const [noradId, point] of indexRef.current) {
      point.show = visibleIds.has(noradId) || noradId === selectedNoradId;
    }
  }, [visibleIds, selectedNoradId, ready]);

  // 2D / 3D morph.
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (!ready || !Cesium || !viewer) return;
    if (sceneMode === "2D") viewer.scene.morphTo2D(1.1);
    else viewer.scene.morphTo3D(1.1);
    layerManagerRef.current?.setSceneMode(sceneMode === "2D" ? "2D" : "3D");
  }, [sceneMode, ready]);

  // Diff-driven layer sync: only genuine enable/disable changes touch Cesium.
  useEffect(() => {
    const manager = layerManagerRef.current;
    if (!ready || !manager || !layerDefinitions || !enabledLayerIds) return;
    manager.sync(layerDefinitions.filter(isTileLayer), enabledLayerIds);
    referenceHostRef.current?.sync(enabledLayerIds);
  }, [layerDefinitions, enabledLayerIds, ready]);

  // Satellites layer: hide the whole point collection (the tick also skips propagation).
  useEffect(() => {
    if (!ready || !pointsRef.current) return;
    pointsRef.current.show = satellitesEnabled;
  }, [satellitesEnabled, ready]);

  // Aircraft layer: nothing runs — no timers, no requests — while disabled.
  const aircraftEnabled = enabledLayerIds?.has(AIRCRAFT_LAYER_ID) ?? false;
  useEffect(() => {
    const controller = aircraftControllerRef.current;
    if (!ready || !controller) return;
    if (aircraftEnabled) controller.enable();
    else controller.disable();
  }, [aircraftEnabled, ready]);

  useEffect(() => {
    aircraftControllerRef.current?.setSelected(selectedAircraftId);
  }, [selectedAircraftId, ready]);

  // Vessels: inert while disabled.
  const vesselsEnabled = enabledLayerIds?.has(VESSEL_LAYER_ID) ?? false;
  useEffect(() => {
    const controller = vesselControllerRef.current;
    if (!ready || !controller) return;
    if (vesselsEnabled) controller.enable();
    else controller.disable();
  }, [vesselsEnabled, ready]);

  useEffect(() => {
    vesselControllerRef.current?.setSelected(selectedVesselId);
  }, [selectedVesselId, ready]);

  // Weather: diff-driven; an empty enabled set means no weather resources at all.
  useEffect(() => {
    const manager = weatherManagerRef.current;
    if (!ready || !manager || !weatherDefinitions || !enabledWeatherIds) return;
    manager.sync(weatherDefinitions, enabledWeatherIds, weatherOpacity ?? {});
  }, [weatherDefinitions, enabledWeatherIds, weatherOpacity, ready]);

  useEffect(() => {
    if (!ready) return;
    weatherManagerRef.current?.setTime(weatherTimeMs);
  }, [weatherTimeMs, ready]);

  function updatePositions(Cesium: CesiumModule, time: Date) {
    const scratch = new Cesium.Cartesian3();
    const selected = selectedRef.current;
    for (const object of objectsRef.current) {
      const point = indexRef.current.get(object.noradId);
      if (!point || !point.show) continue;
      const state = propagateRaw(object, time);
      if (!state) {
        point.show = false;
        continue;
      }
      scratch.x = state.positionEcefKm.x * 1000;
      scratch.y = state.positionEcefKm.y * 1000;
      scratch.z = state.positionEcefKm.z * 1000;
      point.position = scratch;
      if (object.noradId === selected) {
        markerPositionRef.current = Cesium.Cartesian3.clone(scratch, new Cesium.Cartesian3());
        setLabel(Cesium, satFlagsRef.current.satLabelsEnabled ? object.name : "");
      }
    }
  }

  function setLabel(Cesium: CesiumModule, text: string) {
    const entity = markerEntityRef.current;
    if (!entity?.label) return;
    entity.label.text = new Cesium.ConstantProperty(text);
  }

  function updateOrbit(Cesium: CesiumModule, noradId: number, time: Date) {
    const object = objectsRef.current.find((o) => o.noradId === noradId);
    if (!object) {
      orbitPositionsRef.current = [];
      return;
    }
    if (!satFlagsRef.current.satOrbitsEnabled) {
      orbitPositionsRef.current = [];
      return;
    }
    const track = computeOrbitTrack(object, time, 320);
    orbitPositionsRef.current = track.states.map(
      (state) =>
        new Cesium.Cartesian3(
          state.positionEcefKm.x * 1000,
          state.positionEcefKm.y * 1000,
          state.positionEcefKm.z * 1000,
        ),
    );
  }

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!ready || !viewer || viewer.isDestroyed()) return;
    viewer.scene.globe.enableLighting = dayNightEnabled;
    viewer.scene.globe.dynamicAtmosphereLighting = dayNightEnabled;
    viewer.scene.globe.dynamicAtmosphereLightingFromSun = dayNightEnabled;
  }, [ready, dayNightEnabled]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
      {!ready && !error ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="label-caps animate-pulse">Initializing globe…</span>
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
          <p className="max-w-md text-sm text-destructive">Globe failed to load: {error}</p>
        </div>
      ) : null}
    </div>
  );
}
