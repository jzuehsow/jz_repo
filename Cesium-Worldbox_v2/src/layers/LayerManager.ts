import {
  isLayerConfigured,
  readIonToken,
  type LayerDefinition,
  type LayerHandle,
  type LayerProvider,
  type LayerRuntimeStatus,
  type LayerStatusKind,
} from "@/layers/LayerDefinition";

type CesiumModule = typeof import("cesium");

interface Entry {
  definition: LayerDefinition;
  handle: LayerHandle | null;
  /** Incremented on every enable/disable so stale async loads can be dropped. */
  generation: number;
  status: LayerStatusKind;
  message?: string | undefined;
}

/**
 * Owns the Cesium-side lifecycle of optional layers. Deliberately not a React
 * component: it lives in a ref next to the viewer so re-renders never reload a
 * layer, and nothing is loaded until `enable` is called.
 */
export class LayerManager {
  private readonly entries = new Map<string, Entry>();
  private sceneMode: "2D" | "3D" = "3D";
  private ionTokenApplied = false;

  constructor(
    private readonly Cesium: CesiumModule,
    private readonly viewer: import("cesium").Viewer,
    private readonly onStatus: (status: LayerRuntimeStatus) => void,
  ) {}

  get hasIonToken(): boolean {
    return readIonToken() !== null;
  }

  private applyIonToken(): boolean {
    const token = readIonToken();
    if (!token) return false;
    if (!this.ionTokenApplied) {
      this.Cesium.Ion.defaultAccessToken = token;
      this.ionTokenApplied = true;
    }
    return true;
  }

  private emit(id: string, kind: LayerStatusKind, message?: string) {
    const entry = this.entries.get(id);
    if (entry) {
      entry.status = kind;
      entry.message = message;
    }
    this.onStatus({ id, kind, message });
  }

  private async resolveProvider(definition: LayerDefinition): Promise<LayerProvider> {
    switch (definition.providerType) {
      case "cesium-ion-3d-tiles": {
        const mod = await import("@/layers/providers/CesiumIonLayerProvider");
        return mod.cesiumIonLayerProvider;
      }
      case "url-3d-tiles": {
        const mod = await import("@/layers/providers/ThreeDTilesLayerProvider");
        return mod.threeDTilesLayerProvider;
      }
      case "cesium-ion-terrain":
      case "url-terrain": {
        const mod = await import("@/layers/providers/TerrainLayerProvider");
        return mod.terrainLayerProvider;
      }
      default:
        throw new Error(`No Cesium provider for layer type ${definition.providerType}`);
    }
  }

  /** Idempotent: a layer already loaded or loading is left alone. */
  async enable(definition: LayerDefinition): Promise<void> {
    const existing = this.entries.get(definition.id);
    if (existing && (existing.handle || existing.status === "loading")) return;

    if (definition.requiresToken && !this.applyIonToken()) {
      this.entries.set(definition.id, {
        definition,
        handle: null,
        generation: (existing?.generation ?? 0) + 1,
        status: "unavailable",
      });
      this.emit(
        definition.id,
        "unavailable",
        "Needs a Cesium ion token (VITE_CESIUM_ION_TOKEN).",
      );
      return;
    }
    if (!isLayerConfigured(definition, this.hasIonToken)) {
      this.emit(definition.id, "unavailable", "Layer configuration is incomplete.");
      return;
    }

    const generation = (existing?.generation ?? 0) + 1;
    this.entries.set(definition.id, { definition, handle: null, generation, status: "loading" });
    this.emit(definition.id, "loading");

    try {
      const provider = await this.resolveProvider(definition);
      const handle = await provider.load({
        Cesium: this.Cesium,
        viewer: this.viewer,
        definition,
      });
      const current = this.entries.get(definition.id);
      if (!current || current.generation !== generation || this.viewer.isDestroyed()) {
        handle.destroy();
        return;
      }
      current.handle = handle;
      const suspended = this.sceneMode === "2D" && !definition.supportsSceneMode2D;
      handle.setVisible(!suspended);
      this.emit(
        definition.id,
        suspended ? "suspended" : "active",
        suspended ? "Hidden in 2D view." : undefined,
      );
    } catch (cause) {
      const current = this.entries.get(definition.id);
      if (current && current.generation !== generation) return;
      const message = cause instanceof Error ? cause.message : "Layer failed to load";
      console.warn(`[layers] ${definition.id} failed:`, cause);
      this.emit(definition.id, "error", message);
    }
  }

  disable(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) {
      this.emit(id, "idle");
      return;
    }
    entry.generation += 1;
    try {
      entry.handle?.destroy();
    } catch (cause) {
      console.warn(`[layers] ${id} cleanup failed:`, cause);
    }
    entry.handle = null;
    this.entries.delete(id);
    this.emit(id, "idle");
  }

  /** Keeps configuration but hides layers that make no sense in 2D. */
  setSceneMode(mode: "2D" | "3D"): void {
    this.sceneMode = mode;
    for (const entry of this.entries.values()) {
      if (!entry.handle) continue;
      const suspended = mode === "2D" && !entry.definition.supportsSceneMode2D;
      entry.handle.setVisible(!suspended);
      this.emit(
        entry.definition.id,
        suspended ? "suspended" : "active",
        suspended ? "Hidden in 2D view." : undefined,
      );
    }
  }

  /** Diff-driven sync so React re-renders never reload a layer. */
  sync(definitions: LayerDefinition[], enabledIds: ReadonlySet<string>): void {
    for (const id of [...this.entries.keys()]) {
      if (!enabledIds.has(id)) this.disable(id);
    }
    for (const definition of definitions) {
      if (!enabledIds.has(definition.id)) continue;
      const entry = this.entries.get(definition.id);
      if (entry && (entry.handle || entry.status === "loading")) continue;
      if (entry?.status === "unavailable" || entry?.status === "error") continue;
      void this.enable(definition);
    }
  }

  destroyAll(): void {
    for (const id of [...this.entries.keys()]) this.disable(id);
  }
}
