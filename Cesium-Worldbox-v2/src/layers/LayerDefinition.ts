/**
 * Framework-agnostic description of an optional 3D layer.
 *
 * No Cesium imports here on purpose: definitions are plain data so they can be
 * authored in config, fetched from a backend later, or unit-tested standalone.
 */

export type LayerCategory =
  | "3D_TILES"
  | "TERRAIN"
  | "LIVE_TRACKING"
  | "MARITIME"
  | "SPACE"
  | "TRANSPORTATION"
  | "MAP_LABELS"
  | "EARTH_EFFECTS";

export type LayerProviderType =
  | "cesium-ion-3d-tiles"
  | "url-3d-tiles"
  | "cesium-ion-terrain"
  | "url-terrain"
  | "aircraft-adsb"
  | "vessel-ais"
  | "satellites"
  | "reference";

export interface LayerDefinition {
  id: string;
  name: string;
  description: string;
  category: LayerCategory;
  providerType: LayerProviderType;
  defaultEnabled: boolean;
  /** Cesium ion asset id (ion-backed layers only). */
  assetId?: number | undefined;
  /** Tileset / terrain endpoint for self-hosted or open sources. */
  url?: string | undefined;
  attribution?: string | undefined;
  /** True when the layer cannot load without a Cesium ion token. */
  requiresToken: boolean;
  /** Recommended camera range in meters (used for a "fly to" hint). */
  recommendedRangeMeters?: number | undefined;
  /** False for layers that make no sense in a 2D projection. */
  supportsSceneMode2D: boolean;
  /** User-created custom sources can be removed from the panel. */
  removable?: boolean | undefined;
  /** Child layers only take effect while their parent is enabled. */
  parentId?: string | undefined;
}

/** Only these categories are handled by the generic 3D tile/terrain LayerManager. */
export function isTileLayer(definition: LayerDefinition): boolean {
  return definition.category === "3D_TILES" || definition.category === "TERRAIN";
}

export type LayerStatusKind =
  | "idle"
  | "loading"
  | "active"
  | "suspended"
  | "unavailable"
  | "error";

export interface LayerRuntimeStatus {
  id: string;
  kind: LayerStatusKind;
  message?: string | undefined;
}

/** Live handle to whatever the provider added to the scene. */
export interface LayerHandle {
  setVisible(visible: boolean): void;
  destroy(): void;
}

export interface LayerLoadContext {
  Cesium: typeof import("cesium");
  viewer: import("cesium").Viewer;
  definition: LayerDefinition;
}

export interface LayerProvider {
  load(context: LayerLoadContext): Promise<LayerHandle>;
}

/** Optional ion token; the app must keep working without it. */
export function readIonToken(): string | null {
  const token = import.meta.env["VITE_CESIUM_ION_TOKEN"];
  return typeof token === "string" && token.trim().length > 0 ? token.trim() : null;
}

export function isLayerConfigured(definition: LayerDefinition, hasIonToken: boolean): boolean {
  if (definition.requiresToken && !hasIonToken) return false;
  if (definition.providerType === "url-3d-tiles" || definition.providerType === "url-terrain") {
    return Boolean(definition.url);
  }
  if (definition.providerType === "cesium-ion-3d-tiles" || definition.providerType === "cesium-ion-terrain") {
    return typeof definition.assetId === "number";
  }
  return true;
}
