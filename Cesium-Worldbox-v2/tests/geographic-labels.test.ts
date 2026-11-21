import { describe, expect, test } from "bun:test";
import { DEFAULT_LAYERS, GEO_LABELS_LAYER_ID } from "../src/layers/defaultLayers";
import {
  GEOGRAPHY_MAX_HEIGHT_M,
  showLowCountryBorders,
  showMediumCountryBorders,
  showAdminBorders,
} from "../src/geography/render/GeographyLayer";

describe("Geographic Labels preferences", () => {
  test("Geographic Labels are deselected at app startup", () => {
    const layer = DEFAULT_LAYERS.find((item) => item.id === GEO_LABELS_LAYER_ID);
    expect(layer).toBeDefined();
    expect(layer?.defaultEnabled).toBe(false);
  });

  test("enabled geography remains eligible at every camera distance", () => {
    expect(GEOGRAPHY_MAX_HEIGHT_M).toBe(Number.POSITIVE_INFINITY);
    for (const height of [0, 400_000, 2_500_000, 9_000_000, 42_000_000, 500_000_000]) {
      expect(height <= GEOGRAPHY_MAX_HEIGHT_M).toBe(true);
      expect(showLowCountryBorders(height) || showMediumCountryBorders(height)).toBe(true);
      expect(showLowCountryBorders(height) && showMediumCountryBorders(height)).toBe(false);
      expect(showAdminBorders(height)).toBe(true);
    }
  });
});