import { ReferenceLineLayer, withHeight, type ReferenceLineTier } from "@/lib/cesium/referenceLineLayer";
import { ReferencePointLayer, type ReferencePoint } from "@/lib/cesium/referencePointLayer";
import type { GeographyProvider } from "@/geography/providers/GeographyProvider";
import type { ReferenceLayerController } from "@/reference/ReferenceLayerHost";

type CesiumModule = typeof import("cesium");

export interface GeographyOptions {
  countries: boolean;
  capitals: boolean;
  admin1: boolean;
  cities: boolean;
}

/** Distance never hides geography; zoom changes boundary detail only. */
export const GEOGRAPHY_MAX_HEIGHT_M = Number.POSITIVE_INFINITY;
const REGION_LEVEL = 2_500_000;
export const showLowCountryBorders = (heightM: number) => heightM > REGION_LEVEL;
export const showMediumCountryBorders = (heightM: number) => heightM <= REGION_LEVEL;
export const showAdminBorders = (_heightM: number) => true;

export class GeographyLayer implements ReferenceLayerController {
  private lines: ReferenceLineLayer;
  private points: ReferencePointLayer;
  private abort: AbortController | null = null;
  private options: GeographyOptions = { countries: true, capitals: true, admin1: true, cities: true };

  constructor(
    Cesium: CesiumModule,
    viewer: import("cesium").Viewer,
    private readonly provider: GeographyProvider,
    private readonly onStatus: (kind: "loading" | "active" | "error", message?: string) => void,
  ) {
    this.lines = new ReferenceLineLayer(Cesium, viewer, (m) => onStatus("error", m));
    this.points = new ReferencePointLayer(Cesium, viewer, {
      color: "#cfd9e6",
      labelColor: "#e6eef7",
      maxMarkers: 220,
      maxLabels: 90,
    });
  }

  setOptions(options: GeographyOptions) {
    const same = (Object.keys(options) as Array<keyof GeographyOptions>).every((k) => options[k] === this.options[k]);
    this.options = options;
    if (!same && this.abort) this.rebuild();
  }

  enable() {
    if (this.abort) return;
    this.abort = new AbortController();
    this.lines.enable();
    this.points.enable();
    this.rebuild();
  }

  disable() {
    this.abort?.abort();
    this.abort = null;
    this.lines.disable();
    this.points.disable();
  }

  private rebuild() {
    const abort = this.abort;
    if (!abort) return;
    const { countries, capitals, admin1, cities } = this.options;
    const p = this.provider;
    const border = (key: string, visible: (h: number) => boolean, load: () => Promise<number[][][]>, color: string, alpha: number, width: number): ReferenceLineTier => ({
      key,
      visible,
      load: async () => (await load()).map((line) => ({ positions: withHeight(line, 200), color, alpha, width })),
    });
    const tiers: ReferenceLineTier[] = [];
    if (countries) {
      tiers.push(
        border("borders-low", showLowCountryBorders, () => p.countryBoundaries("LOW", abort.signal), "#d9e3ee", 0.45, 1.1),
        border("borders-med", showMediumCountryBorders, () => p.countryBoundaries("MEDIUM", abort.signal), "#d9e3ee", 0.55, 1.3),
      );
    }
    if (admin1) {
      tiers.push(border("admin1", showAdminBorders, () => p.adminBoundaries(abort.signal), "#aab8c8", 0.3, 0.8));
    }
    this.lines.setTiers(tiers);

    this.onStatus("loading");
    Promise.all([
      countries ? p.countries(abort.signal) : [],
      admin1 ? p.adminRegions(abort.signal) : [],
      capitals || cities ? p.populatedPlaces(abort.signal) : [],
    ])
      .then(([countryList, regions, places]) => {
        if (this.abort !== abort) return;
        const items: ReferencePoint[] = [];
        for (const c of countryList) {
          items.push({
            id: `c:${c.name}`,
            latitudeDeg: c.labelLatitudeDeg,
            longitudeDeg: c.labelLongitudeDeg,
            priority: 200 + c.labelRank,
            maxHeightM: GEOGRAPHY_MAX_HEIGHT_M,
            marker: "none",
            label: () => c.name.toUpperCase(),
          });
        }
        for (const r of regions) {
          items.push({
            id: `r:${r.name}`,
            latitudeDeg: r.labelLatitudeDeg,
            longitudeDeg: r.labelLongitudeDeg,
            priority: 500 + r.labelRank,
            maxHeightM: GEOGRAPHY_MAX_HEIGHT_M,
            marker: "none",
            label: () => r.name,
          });
        }
        for (const place of places) {
          const capital = place.role === "NATIONAL_CAPITAL";
          if (capital ? !capitals : !cities) continue;
          const pop = place.population;
          items.push({
            id: `p:${place.name}:${place.latitudeDeg}`,
            latitudeDeg: place.latitudeDeg,
            longitudeDeg: place.longitudeDeg,
            priority: capital ? 100 - Math.min(99, pop / 1e6) : place.role === "REGIONAL_CAPITAL" ? 700 : 400 - Math.min(99, pop / 1e6) + (pop < 1e6 ? 400 : 0),
            maxHeightM: GEOGRAPHY_MAX_HEIGHT_M,
            marker: capital ? "capital" : "city",
            label: () => place.name,
          });
        }
        this.points.setItems(items);
        this.onStatus("active", `${this.provider.info.source} · ${this.provider.info.license}`);
      })
      .catch((e: unknown) => {
        if (!abort.signal.aborted) this.onStatus("error", e instanceof Error ? e.message : "Failed to load");
      });
  }
}
