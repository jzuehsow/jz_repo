import { safeRemovePrimitive } from "@/lib/cesium/referencePointLayer";
import type { LayerHandle, LayerLoadContext, LayerProvider } from "@/layers/LayerDefinition";

/** Loads any open / self-hosted 3D Tiles endpoint (tileset.json URL). */
export const threeDTilesLayerProvider: LayerProvider = {
  async load({ Cesium, viewer, definition }: LayerLoadContext): Promise<LayerHandle> {
    if (!definition.url) throw new Error("Layer is missing a tileset URL");
    const tileset = await Cesium.Cesium3DTileset.fromUrl(definition.url, {
      showCreditsOnScreen: true,
    });
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
