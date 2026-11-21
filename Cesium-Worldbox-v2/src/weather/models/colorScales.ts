/** Colour stops in provider-native units: [value, hex, alpha]. */
export type ColorStop = readonly [number, string, number];

export interface ColorScale {
  id: string;
  stops: readonly ColorStop[];
}

const s = (id: string, stops: ColorStop[]): ColorScale => ({ id, stops });

export const COLOR_SCALES = {
  temperature: s("temperature", [
    [-40, "#3b2a8c", 1], [-20, "#2c62c9", 1], [0, "#4fb3e8", 1], [10, "#6fd1a0", 1],
    [20, "#f2d65b", 1], [30, "#f08a3c", 1], [40, "#c9302c", 1], [50, "#7a1030", 1],
  ]),
  precip: s("precip", [
    [0, "#9fd8ff", 0], [0.1, "#9fd8ff", 0.55], [1, "#3a8ee6", 0.85], [5, "#2bb24c", 0.9],
    [10, "#f2d13b", 0.95], [25, "#e8612c", 1], [50, "#b0126b", 1],
  ]),
  snowfall: s("snowfall", [
    [0, "#cfe8ff", 0], [0.1, "#cfe8ff", 0.6], [1, "#7fb0ff", 0.85], [5, "#3a50c0", 1],
  ]),
  snowDepth: s("snowDepth", [
    [0, "#cfe8ff", 0], [0.02, "#cfe8ff", 0.6], [0.5, "#7fb0ff", 0.85], [2, "#3a50c0", 1],
  ]),
  probability: s("probability", [
    [0, "#3a8ee6", 0], [20, "#3a8ee6", 0.35], [60, "#2c62c9", 0.75], [100, "#3b2a8c", 1],
  ]),
  cloud: s("cloud", [
    [0, "#ffffff", 0], [20, "#dfe7ef", 0.15], [60, "#eef3f8", 0.55], [100, "#ffffff", 0.9],
  ]),
  humidity: s("humidity", [
    [0, "#8a5a2c", 1], [30, "#d9c27a", 1], [60, "#6fd18a", 1], [100, "#2c62c9", 1],
  ]),
  wind: s("wind", [
    [0, "#2b4a7a", 1], [20, "#3fa7d6", 1], [40, "#6fd18a", 1], [60, "#f2d65b", 1],
    [90, "#f08a3c", 1], [120, "#c9302c", 1], [160, "#7a1030", 1],
  ]),
  pressure: s("pressure", [
    [960, "#6b2ca8", 1], [990, "#2c62c9", 1], [1005, "#4fb3e8", 1], [1013, "#e8eef4", 1],
    [1022, "#f2d65b", 1], [1035, "#f08a3c", 1], [1050, "#c9302c", 1],
  ]),
  surfacePressure: s("surfacePressure", [
    [500, "#3b2a8c", 1], [700, "#2c62c9", 1], [850, "#6fd1a0", 1], [950, "#f2d65b", 1],
    [1013, "#f08a3c", 1], [1050, "#c9302c", 1],
  ]),
  visibility: s("visibility", [
    [0, "#7a1030", 0.95], [1000, "#e8612c", 0.85], [5000, "#f2d65b", 0.6], [10000, "#6fd18a", 0.3],
    [24000, "#6fd18a", 0],
  ]),
  cape: s("cape", [
    [0, "#6fd18a", 0], [250, "#6fd18a", 0.6], [1000, "#f2d65b", 0.85], [2500, "#f08a3c", 1],
    [4000, "#c9302c", 1],
  ]),
  liftedIndex: s("liftedIndex", [
    [-10, "#7a1030", 1], [-6, "#c9302c", 1], [-3, "#f08a3c", 1], [0, "#f2d65b", 0.8],
    [4, "#6fd18a", 0.4], [10, "#2b4a7a", 0.2],
  ]),
  cin: s("cin", [
    [-500, "#4a1d7a", 1], [-100, "#8a5cc9", 0.8], [-10, "#c9b8f0", 0.3], [0, "#c9b8f0", 0],
  ]),
  freezing: s("freezing", [
    [0, "#2c62c9", 1], [1000, "#4fb3e8", 1], [3000, "#6fd1a0", 1], [5000, "#f2d65b", 1],
  ]),
  uv: s("uv", [
    [0, "#2bb24c", 0.2], [3, "#f2d13b", 0.8], [6, "#f08a3c", 1], [8, "#c9302c", 1], [11, "#8a2ca8", 1],
  ]),
  radiation: s("radiation", [
    [0, "#f2d65b", 0], [200, "#f2d65b", 0.6], [600, "#f08a3c", 0.85], [1000, "#c9302c", 1],
  ]),
  sunshine: s("sunshine", [[0, "#f2d13b", 0], [1800, "#f2d13b", 0.5], [3600, "#f2a13b", 0.9]]),
  soilMoisture: s("soilMoisture", [
    [0, "#8a5a2c", 1], [0.2, "#d9c27a", 1], [0.35, "#6fd18a", 1], [0.5, "#2c62c9", 1],
  ]),
  radar: s("radar", [
    [5, "#04e9e7", 1], [20, "#02fd02", 1], [35, "#fdf802", 1], [50, "#fd0000", 1], [65, "#bc00ff", 1],
  ]),
  lightning: s("lightning", [[0, "#f2d13b", 0.3], [5, "#f08a3c", 0.8], [20, "#fd0000", 1]]),
} satisfies Record<string, ColorScale>;

export type ColorScaleId = keyof typeof COLOR_SCALES;

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const rgbCache = new Map<string, [number, number, number]>();
function rgb(hex: string) {
  let value = rgbCache.get(hex);
  if (!value) {
    value = hexToRgb(hex);
    rgbCache.set(hex, value);
  }
  return value;
}

/** Writes RGBA (0-255) into `out` for a value. */
export function sampleScale(scale: ColorScale, value: number, out: Uint8ClampedArray, offset: number) {
  const stops = scale.stops;
  const first = stops[0]!;
  const last = stops[stops.length - 1]!;
  let a: ColorStop = first;
  let b: ColorStop = first;
  if (value <= first[0]) a = b = first;
  else if (value >= last[0]) a = b = last;
  else {
    for (let i = 1; i < stops.length; i += 1) {
      if (value <= stops[i]![0]) {
        a = stops[i - 1]!;
        b = stops[i]!;
        break;
      }
    }
  }
  const t = a === b ? 0 : (value - a[0]) / (b[0] - a[0]);
  const ca = rgb(a[1]);
  const cb = rgb(b[1]);
  out[offset] = ca[0] + (cb[0] - ca[0]) * t;
  out[offset + 1] = ca[1] + (cb[1] - ca[1]) * t;
  out[offset + 2] = ca[2] + (cb[2] - ca[2]) * t;
  out[offset + 3] = (a[2] + (b[2] - a[2]) * t) * 255;
}

export function cssGradient(scale: ColorScale): string {
  const min = scale.stops[0]![0];
  const max = scale.stops[scale.stops.length - 1]![0];
  const span = max - min || 1;
  const parts = scale.stops.map(([value, hex, alpha]) => {
    const [r, g, b] = rgb(hex);
    return `rgba(${r},${g},${b},${Math.max(alpha, 0.15)}) ${(((value - min) / span) * 100).toFixed(1)}%`;
  });
  return `linear-gradient(to right, ${parts.join(", ")})`;
}
