export type ThumbnailCategory = "SATELLITE" | "AIRCRAFT" | "VESSEL" | "GENERIC";

/**
 * One representative image shared by every object of a model family. The
 * domain never stores image URLs — it stores a logical key that resolves here.
 */
export interface ObjectThumbnail {
  /** Logical key, e.g. "satellite-starlink" or "aircraft-a320-family". */
  key: string;
  objectCategory: ThumbnailCategory;
  /** Human label for the family the image represents. */
  modelFamily: string;
  /** Local path under /thumbnails, or an absolute URL for not-yet-cached assets. */
  imagePath: string;
  sourceUrl: string;
  sourceName: string;
  attribution: string;
  license: string;
  altText: string;
  /** True when imagePath still points at a third-party host. */
  remote?: boolean;
}
