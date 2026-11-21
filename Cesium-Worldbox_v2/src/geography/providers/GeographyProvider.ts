import type { DatasetInfo } from "@/transportation/models/Transportation";
import type {
  AdministrativeRegion,
  BoundaryDetail,
  BoundaryLines,
  Country,
  PopulatedPlace,
} from "@/geography/models/Geography";

/**
 * Geographic reference source. Boundaries are used exactly as supplied —
 * swap providers (or worldview variants) here rather than editing geometry.
 */
export interface GeographyProvider {
  info: DatasetInfo;
  countryBoundaries(detail: BoundaryDetail, signal?: AbortSignal): Promise<BoundaryLines>;
  adminBoundaries(signal?: AbortSignal): Promise<BoundaryLines>;
  countries(signal?: AbortSignal): Promise<Country[]>;
  adminRegions(signal?: AbortSignal): Promise<AdministrativeRegion[]>;
  populatedPlaces(signal?: AbortSignal): Promise<PopulatedPlace[]>;
}
