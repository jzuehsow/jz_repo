import { safeRemovePrimitive } from "@/lib/cesium/referencePointLayer";
import type { LayerHandle, LayerLoadContext, LayerProvider } from "@/layers/LayerDefinition";

/** Loads a Cesium ion hosted 3D Tiles asset (e.g. OSM Buildings, asset 96188). */
export const cesiumIonLayerProvider: LayerProvider = {
  async load({ Cesium, viewer, definition }: LayerLoadContext): Promise<LayerHandle> {
    if (typeof definition.assetId !== "number") {
      throw new Error("Layer is missing a Cesium ion asset id");
    }
    const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(definition.assetId);
    viewer.scene.primitives.add(tileset);
    let destroyed = false;
    return {
      setVisible(visible) {
        if (!destroyed && !tileset.isDestroyed()) tileset.show = visible;
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        safeRemovePrimitive(viewer, tileset);
      },
    };
  },
};
