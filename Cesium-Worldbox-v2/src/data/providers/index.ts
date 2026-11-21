import type { SpaceObject } from "@/domain/spaceObject";
import { createCelestrakProvider } from "./celestrakProvider";
import { createRestProvider } from "./restProvider";
import { sampleProvider } from "./sampleProvider";
import type { ListOptions, SpaceObjectProvider } from "./types";

export type { SpaceObjectProvider, ListOptions } from "./types";
export { sampleProvider } from "./sampleProvider";
export { createCelestrakProvider } from "./celestrakProvider";
export { createRestProvider } from "./restProvider";

export interface CatalogLoadResult {
  objects: SpaceObject[];
  providerId: string;
  providerLabel: string;
  degraded: boolean;
  notice?: string;
}

/**
 * Resolves the active catalog provider from plain environment config, so the
 * host application can point this module anywhere without code changes:
 *   VITE_SPACE_API_BASE_URL -> REST backend
 *   VITE_CELESTRAK_URL      -> custom CelesTrak/proxy URL
 */
export function resolveProviders(): SpaceObjectProvider[] {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  const providers: SpaceObjectProvider[] = [];
  if (env["VITE_SPACE_API_BASE_URL"]) {
    providers.push(createRestProvider({ baseUrl: env["VITE_SPACE_API_BASE_URL"] }));
  }
  providers.push(createCelestrakProvider(env["VITE_CELESTRAK_URL"]));
  providers.push(sampleProvider);
  return providers;
}

/** Tries each provider in order and always yields a usable catalog. */
export async function loadCatalog(options: ListOptions = {}): Promise<CatalogLoadResult> {
  const providers = resolveProviders();
  const failures: string[] = [];

  for (const provider of providers) {
    try {
      const objects = await provider.listSpaceObjects(options);
      if (objects.length === 0) throw new Error("empty catalog");
      const result: CatalogLoadResult = {
        objects,
        providerId: provider.id,
        providerLabel: provider.label,
        degraded: provider.id === "sample",
      };
      if (failures.length) {
        result.notice = `Live feed unavailable (${failures.join("; ")}). Serving representative sample elements.`;
      }
      return result;
    } catch (error) {
      failures.push(`${provider.id}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  throw new Error(`No catalog provider available. ${failures.join("; ")}`);
}
