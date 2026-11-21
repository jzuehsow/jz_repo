import type { SpaceObject } from "@/domain/spaceObject";
import { buildSampleCatalog } from "./sampleCatalog";
import type { ListOptions, SpaceObjectProvider } from "./types";

export const sampleProvider: SpaceObjectProvider = {
  id: "sample",
  label: "Sample catalog (offline)",
  async listSpaceObjects(options?: ListOptions): Promise<SpaceObject[]> {
    return buildSampleCatalog(options?.limit ?? 900);
  },
  async getSpaceObject(noradId: number): Promise<SpaceObject | null> {
    return buildSampleCatalog(2000).find((o) => o.noradId === noradId) ?? null;
  },
};
