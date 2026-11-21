import { useQuery } from "@tanstack/react-query";

import { loadCatalog, type CatalogLoadResult } from "@/data/providers";

/** Catalog size cap for the MVP; the architecture scales past this. */
export const CATALOG_LIMIT = 900;

export function useCatalog(enabled = true) {
  return useQuery<CatalogLoadResult>({
    queryKey: ["space-objects", CATALOG_LIMIT],
    queryFn: ({ signal }) => loadCatalog({ limit: CATALOG_LIMIT, signal }),
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    // Paused while the Satellites layer is off; cached data stays in memory.
    enabled,
  });
}
