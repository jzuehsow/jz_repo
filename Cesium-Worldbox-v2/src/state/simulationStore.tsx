import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { EMPTY_FILTERS, type CatalogFilters } from "@/domain/spaceObject";

export const MAX_HORIZON_MS = 30 * 24 * 3600 * 1000;
export const SPEED_OPTIONS = [1, 10, 60, 300, 1800, 7200] as const;

export type SceneModeKind = "3D" | "2D";

interface SimulationContextValue {
  /** Simulation epoch in ms (UTC). */
  simTimeMs: number;
  /** Offset from wall-clock now, ms (0 .. +30 days). */
  offsetMs: number;
  isPlaying: boolean;
  speed: number;
  isEstimate: boolean;
  sceneMode: SceneModeKind;
  filters: CatalogFilters;
  selectedNoradId: number | null;
  timeRef: React.MutableRefObject<number>;
  setPlaying: (playing: boolean) => void;
  togglePlaying: () => void;
  setSpeed: (speed: number) => void;
  setOffsetMs: (offset: number) => void;
  resetToNow: () => void;
  setSceneMode: (mode: SceneModeKind) => void;
  setFilters: (updater: (previous: CatalogFilters) => CatalogFilters) => void;
  selectObject: (noradId: number | null) => void;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [offsetMs, setOffsetMsState] = useState(0);
  const [isPlaying, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<number>(1);
  const [sceneMode, setSceneMode] = useState<SceneModeKind>("3D");
  const [filters, setFiltersState] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [selectedNoradId, setSelectedNoradId] = useState<number | null>(null);
  const [simTimeMs, setSimTimeMs] = useState(() => Date.now());

  const offsetRef = useRef(0);
  const timeRef = useRef(Date.now());
  const playingRef = useRef(true);
  const speedRef = useRef(1);

  playingRef.current = isPlaying;
  speedRef.current = speed;

  const setOffsetMs = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(MAX_HORIZON_MS, next));
    offsetRef.current = clamped;
    setOffsetMsState(clamped);
    timeRef.current = Date.now() + clamped;
    setSimTimeMs(timeRef.current);
  }, []);

  const resetToNow = useCallback(() => {
    setOffsetMs(0);
  }, [setOffsetMs]);

  // Single animation loop advances simulated time; components read timeRef for
  // per-frame work and simTimeMs for React-rate updates.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    let lastPublish = 0;

    const tick = (now: number) => {
      const deltaMs = now - last;
      last = now;
      if (playingRef.current) {
        // Advance offset only while ahead of real time; at offset 0 we simply
        // ride the wall clock so "now" stays truthful.
        const advance = deltaMs * (speedRef.current - 1);
        const next = Math.max(0, Math.min(MAX_HORIZON_MS, offsetRef.current + advance));
        if (next !== offsetRef.current) {
          offsetRef.current = next;
        }
      }
      timeRef.current = Date.now() + offsetRef.current;
      if (now - lastPublish > 200) {
        lastPublish = now;
        setSimTimeMs(timeRef.current);
        setOffsetMsState(offsetRef.current);
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const setFilters = useCallback((updater: (previous: CatalogFilters) => CatalogFilters) => {
    setFiltersState((previous) => updater(previous));
  }, []);

  const value = useMemo<SimulationContextValue>(
    () => ({
      simTimeMs,
      offsetMs,
      isPlaying,
      speed,
      isEstimate: offsetMs > 60_000,
      sceneMode,
      filters,
      selectedNoradId,
      timeRef,
      setPlaying,
      togglePlaying: () => setPlaying((p) => !p),
      setSpeed,
      setOffsetMs,
      resetToNow,
      setSceneMode,
      setFilters,
      selectObject: setSelectedNoradId,
    }),
    [
      simTimeMs,
      offsetMs,
      isPlaying,
      speed,
      sceneMode,
      filters,
      selectedNoradId,
      setOffsetMs,
      resetToNow,
      setFilters,
    ],
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation(): SimulationContextValue {
  const context = useContext(SimulationContext);
  if (!context) throw new Error("useSimulation must be used within SimulationProvider");
  return context;
}
