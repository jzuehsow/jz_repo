import type { LayerHandle, LayerLoadContext, LayerProvider } from "@/layers/LayerDefinition";

/**
 * Swaps the scene terrain provider. Disabling restores the plain ellipsoid,
 * which is the viewer default used by Cesium Worldbox.
 */
export const terrainLayerProvider: LayerProvider = {
  async load({ Cesium, viewer, definition }: LayerLoadContext): Promise<LayerHandle> {
    const terrain =
      typeof definition.assetId === "number"
        ? await Cesium.CesiumTerrainProvider.fromIonAssetId(definition.assetId, {
            requestVertexNormals: false,
          })
        : definition.url
          ? await Cesium.CesiumTerrainProvider.fromUrl(definition.url)
          : null;
    if (!terrain) throw new Error("Terrain layer needs an ion asset id or a URL");

    const ellipsoid = new Cesium.EllipsoidTerrainProvider();
    if (!viewer.isDestroyed()) viewer.scene.terrainProvider = terrain;
    let destroyed = false;

    return {
      setVisible(visible) {
        if (destroyed || viewer.isDestroyed()) return;
        viewer.scene.terrainProvider = visible ? terrain : ellipsoid;
      },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        if (!viewer.isDestroyed()) viewer.scene.terrainProvider = ellipsoid;
      },
    };
  },
};
