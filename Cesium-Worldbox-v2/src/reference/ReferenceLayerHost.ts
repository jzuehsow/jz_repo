/**
 * Owns the static reference layers (transportation + geography) next to the
 * Cesium viewer. Controllers are created only when first enabled and fully
 * disposed when disabled — an empty enabled set means zero resources.
 */
import { GeographyLayer } from "@/geography/render/GeographyLayer";
import { naturalEarthProvider } from "@/geography/providers/NaturalEarthProvider";
import {
  AIRPORTS_LAYER_ID,
  FLIGHT_ROUTES_LAYER_ID,
  GEO_ADMIN1_LAYER_ID,
  GEO_CAPITALS_LAYER_ID,
  GEO_CITIES_LAYER_ID,
  GEO_COUNTRIES_LAYER_ID,
  GEO_LABELS_LAYER_ID,
  PORTS_LAYER_ID,
  SHIPPING_LANES_LAYER_ID,
} from "@/layers/defaultLayers";
import type { LayerRuntimeStatus } from "@/layers/LayerDefinition";
import {
  createAirportLayer,
  createFlightRouteLayer,
  createPortLayer,
  createShippingLaneLayer,
} from "@/transportation/render/transportationLayers";

export interface ReferenceLayerController {
  enable(): void;
  disable(): void;
}

type CesiumModule = typeof import("cesium");
type StatusFn = (kind: "loading" | "active" | "error", message?: string) => void;

const FACTORIES: Record<string, (C: CesiumModule, v: import("cesium").Viewer, s: StatusFn) => ReferenceLayerController> = {
  [AIRPORTS_LAYER_ID]: createAirportLayer,
  [PORTS_LAYER_ID]: createPortLayer,
  [FLIGHT_ROUTES_LAYER_ID]: createFlightRouteLayer,
  [SHIPPING_LANES_LAYER_ID]: createShippingLaneLayer,
  [GEO_LABELS_LAYER_ID]: (C, v, s) => new GeographyLayer(C, v, naturalEarthProvider, s),
};

export class ReferenceLayerHost {
  private active = new Map<string, ReferenceLayerController>();

  constructor(
    private readonly Cesium: CesiumModule,
    private readonly viewer: import("cesium").Viewer,
    private readonly onStatus: (status: LayerRuntimeStatus) => void,
  ) {}

  sync(enabledIds: Set<string>) {
    for (const [id, factory] of Object.entries(FACTORIES)) {
      const want = enabledIds.has(id);
      let controller = this.active.get(id);
      if (want && !controller) {
        controller = factory(this.Cesium, this.viewer, (kind, message) => this.onStatus({ id, kind, message }));
        this.active.set(id, controller);
        this.applyOptions(controller, enabledIds);
        controller.enable();
      } else if (!want && controller) {
        controller.disable();
        this.active.delete(id);
        this.onStatus({ id, kind: "idle" });
      }
      if (controller) this.applyOptions(controller, enabledIds);
    }
  }

  private applyOptions(controller: ReferenceLayerController, enabledIds: Set<string>) {
    {
      if (controller instanceof GeographyLayer) {
        controller.setOptions({
          countries: enabledIds.has(GEO_COUNTRIES_LAYER_ID),
          capitals: enabledIds.has(GEO_CAPITALS_LAYER_ID),
          admin1: enabledIds.has(GEO_ADMIN1_LAYER_ID),
          cities: enabledIds.has(GEO_CITIES_LAYER_ID),
        });
      }
    }
  }

  destroyAll() {
    for (const controller of this.active.values()) controller.disable();
    this.active.clear();
  }
}
