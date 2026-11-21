import { useCallback, useEffect, useMemo, useState } from "react";

import type { LayerRuntimeStatus } from "@/layers/LayerDefinition";
import { WEATHER_LAYERS } from "@/weather/data/weatherLayers";
import type { WeatherAlert } from "@/weather/models/WeatherFrame";
import type { WeatherLayerDefinition } from "@/weather/models/WeatherLayerDefinition";
import { DEFAULT_UNITS, type UnitPreferences } from "@/weather/models/units";

export interface WeatherState {
  definitions: WeatherLayerDefinition[];
  enabledIds: Set<string>;
  opacity: Record<string, number>;
  statuses: Record<string, LayerRuntimeStatus>;
  units: UnitPreferences;
  /** Frames every active forecast layer shares (UTC ms). */
  commonFrames: number[];
  /** Forecast layers whose frames don't cover the shared range. */
  partialIds: Set<string>;
  /** null = "Current" (latest frame at or before now). */
  timeMs: number | null;
  effectiveTimeMs: number | null;
  playing: boolean;
  selectedAlert: WeatherAlert | null;
  toggle(id: string): void;
  setOpacity(id: string, value: number): void;
  setUnits(units: Partial<UnitPreferences>): void;
  setTime(timeMs: number | null): void;
  step(delta: number): void;
  setPlaying(playing: boolean): void;
  reportStatus(status: LayerRuntimeStatus): void;
  reportFrames(id: string, times: number[] | null): void;
  selectAlert(alert: WeatherAlert | null): void;
}

const PLAY_INTERVAL_MS = 1200;

function currentIndex(frames: number[]): number {
  const now = Date.now();
  let best = 0;
  for (let i = 0; i < frames.length; i += 1) if (frames[i]! <= now) best = i;
  return best;
}

export function useWeather(): WeatherState {
  const [enabledIds, setEnabledIds] = useState<Set<string>>(() => new Set());
  const [opacity, setOpacityMap] = useState<Record<string, number>>({});
  const [statuses, setStatuses] = useState<Record<string, LayerRuntimeStatus>>({});
  const [units, setUnitsState] = useState<UnitPreferences>(DEFAULT_UNITS);
  const [frames, setFrames] = useState<Record<string, number[]>>({});
  const [timeMs, setTimeMs] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<WeatherAlert | null>(null);

  const { commonFrames, partialIds } = useMemo(() => {
    const lists = Object.entries(frames).filter(([id]) => enabledIds.has(id));
    if (lists.length === 0) return { commonFrames: [] as number[], partialIds: new Set<string>() };
    let common = new Set(lists[0]![1]);
    for (const [, times] of lists.slice(1)) {
      const next = new Set<number>();
      for (const t of times) if (common.has(t)) next.add(t);
      common = next;
    }
    const sorted = [...common].sort((a, b) => a - b);
    const partial = new Set<string>();
    for (const [id, times] of lists) if (times.length > sorted.length) partial.add(id);
    return { commonFrames: sorted, partialIds: lists.length > 1 ? partial : new Set<string>() };
  }, [frames, enabledIds]);

  const effectiveTimeMs =
    commonFrames.length === 0
      ? null
      : timeMs !== null && commonFrames.includes(timeMs)
        ? timeMs
        : commonFrames[currentIndex(commonFrames)]!;

  const step = useCallback(
    (delta: number) => {
      if (commonFrames.length === 0) return;
      const index = effectiveTimeMs === null ? 0 : commonFrames.indexOf(effectiveTimeMs);
      const next = (index + delta + commonFrames.length) % commonFrames.length;
      setTimeMs(commonFrames[next]!);
    },
    [commonFrames, effectiveTimeMs],
  );

  // The only weather timer — exists solely while playing with frames available.
  const canPlay = playing && commonFrames.length > 1;
  useEffect(() => {
    if (!canPlay) return;
    const id = setInterval(() => step(1), PLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [canPlay, step]);

  useEffect(() => {
    if (commonFrames.length === 0 && playing) setPlaying(false);
  }, [commonFrames.length, playing]);

  const toggle = useCallback((id: string) => {
    setEnabledIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setStatuses((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
    if (id === "wx-alerts-us") setSelectedAlert(null);
  }, []);

  const reportFrames = useCallback((id: string, times: number[] | null) => {
    setFrames((previous) => {
      const next = { ...previous };
      if (times) next[id] = times;
      else delete next[id];
      return next;
    });
  }, []);

  const reportStatus = useCallback((status: LayerRuntimeStatus) => {
    setStatuses((previous) => {
      const current = previous[status.id];
      if (current && current.kind === status.kind && current.message === status.message) return previous;
      return { ...previous, [status.id]: status };
    });
  }, []);

  return {
    definitions: WEATHER_LAYERS,
    enabledIds,
    opacity,
    statuses,
    units,
    commonFrames,
    partialIds,
    timeMs,
    effectiveTimeMs,
    playing: canPlay,
    selectedAlert,
    toggle,
    setOpacity: useCallback((id: string, value: number) => setOpacityMap((p) => ({ ...p, [id]: value })), []),
    setUnits: useCallback((u: Partial<UnitPreferences>) => setUnitsState((p) => ({ ...p, ...u })), []),
    setTime: setTimeMs,
    step,
    setPlaying,
    reportStatus,
    reportFrames,
    selectAlert: setSelectedAlert,
  };
}
