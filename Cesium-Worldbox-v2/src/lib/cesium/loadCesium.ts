export type CesiumModule = typeof import("cesium");

let promise: Promise<CesiumModule> | null = null;

/**
 * Loads CesiumJS in the browser only. Static assets are served from
 * /cesium (copied from the npm package) so nothing depends on a hosted CDN or
 * an Ion access token.
 */
export function loadCesium(): Promise<CesiumModule> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Cesium can only be loaded in the browser"));
  }
  if (!promise) {
    (window as unknown as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = "/cesium/";
    promise = import("cesium");
  }
  return promise;
}
