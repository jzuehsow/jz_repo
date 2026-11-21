import type { VesselCategory } from "@/maritime/models/VesselObject";

export interface VesselTypeMetadata {
  category: VesselCategory;
  label: string;
  color: string;
  thumbnailKey: string;
}
