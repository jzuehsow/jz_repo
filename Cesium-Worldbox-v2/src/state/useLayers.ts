import { useCallback, useMemo, useState } from "react";

import { DEFAULT_LAYERS, makeCustomTilesLayer } from "@/layers/defaultLayers";
import { readIonToken, type LayerDefinition, type LayerRuntimeStatus } from "@/layers/LayerDefinition";

const CUSTOM_KEY = "worldbox.customLayers.v1";

function loadCustom(): LayerDefinition[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is LayerDefinition =>
        typeof item === "object" && item !== null && "id" in item && "url" in item,
    );
  } catch {
    return [];
  }
}

function persistCustom(layers: LayerDefinition[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(layers));
  } catch {
    /* storage unavailable — custom sources simply won't persist */
  }
}

export interface LayersState {
  definitions: LayerDefinition[];
  enabledIds: Set<string>;
  statuses: Record<string, LayerRuntimeStatus>;
  hasIonToken: boolean;
  toggleLayer: (id: string) => void;
  addCustomLayer: (name: string, url: string) => void;
  removeCustomLayer: (id: string) => void;
  reportStatus: (status: LayerRuntimeStatus) => void;
}

export function useLayers(): LayersState {
  const [custom, setCustom] = useState<LayerDefinition[]>(() => loadCustom());
  const [enabledIds, setEnabledIds] = useState<Set<string>>(
    () => new Set(DEFAULT_LAYERS.filter((layer) => layer.defaultEnabled).map((layer) => layer.id)),
  );
  const [statuses, setStatuses] = useState<Record<string, LayerRuntimeStatus>>({});

  const definitions = useMemo(() => [...DEFAULT_LAYERS, ...custom], [custom]);
  const hasIonToken = useMemo(() => readIonToken() !== null, []);

  const toggleLayer = useCallback((id: string) => {
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
  }, []);

  const addCustomLayer = useCallback((name: string, url: string) => {
    const definition = makeCustomTilesLayer(name.trim() || "Custom 3D Tiles", url.trim());
    setCustom((previous) => {
      const next = [...previous, definition];
      persistCustom(next);
      return next;
    });
  }, []);

  const removeCustomLayer = useCallback((id: string) => {
    setEnabledIds((previous) => {
      if (!previous.has(id)) return previous;
      const next = new Set(previous);
      next.delete(id);
      return next;
    });
    setCustom((previous) => {
      const next = previous.filter((layer) => layer.id !== id);
      persistCustom(next);
      return next;
    });
  }, []);

  const reportStatus = useCallback((status: LayerRuntimeStatus) => {
    setStatuses((previous) => {
      const current = previous[status.id];
      if (current && current.kind === status.kind && current.message === status.message) {
        return previous;
      }
      return { ...previous, [status.id]: status };
    });
  }, []);

  return {
    definitions,
    enabledIds,
    statuses,
    hasIonToken,
    toggleLayer,
    addCustomLayer,
    removeCustomLayer,
    reportStatus,
  };
}
