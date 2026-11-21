import { COLOR_SCALES, sampleScale, type ColorScaleId } from "@/weather/models/colorScales";
import type { WeatherGrid } from "@/weather/models/WeatherFrame";

const MAX_WIDTH = 512;

/**
 * Bilinear-interpolates one grid frame into a canvas. Runs only when data or
 * the selected frame changes — never in React render or the Cesium tick.
 */
export function rasterizeFrame(
  grid: WeatherGrid,
  timeIndex: number,
  scaleId: ColorScaleId,
): HTMLCanvasElement {
  const { cols, rows, bounds } = grid;
  const spanLon = bounds.east - bounds.west;
  const spanLat = bounds.north - bounds.south;
  const width = MAX_WIDTH;
  const height = Math.max(64, Math.min(MAX_WIDTH, Math.round((MAX_WIDTH * spanLat) / spanLon)));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  const image = context.createImageData(width, height);
  const values = grid.values[timeIndex];
  const scale = COLOR_SCALES[scaleId];
  if (values) {
    for (let y = 0; y < height; y += 1) {
      const gy = (y / (height - 1)) * (rows - 1);
      const r0 = Math.floor(gy);
      const r1 = Math.min(rows - 1, r0 + 1);
      const ty = gy - r0;
      for (let x = 0; x < width; x += 1) {
        const gx = (x / (width - 1)) * (cols - 1);
        const c0 = Math.floor(gx);
        const c1 = Math.min(cols - 1, c0 + 1);
        const tx = gx - c0;
        const v00 = values[r0 * cols + c0]!;
        const v01 = values[r0 * cols + c1]!;
        const v10 = values[r1 * cols + c0]!;
        const v11 = values[r1 * cols + c1]!;
        const offset = (y * width + x) * 4;
        if (Number.isNaN(v00) || Number.isNaN(v01) || Number.isNaN(v10) || Number.isNaN(v11)) {
          image.data[offset + 3] = 0;
          continue;
        }
        const top = v00 + (v01 - v00) * tx;
        const bottom = v10 + (v11 - v10) * tx;
        sampleScale(scale, top + (bottom - top) * ty, image.data, offset);
      }
    }
  }
  context.putImageData(image, 0, 0);

  const directions = grid.directions?.[timeIndex];
  if (directions) drawArrows(context, directions, cols, rows, width, height);
  return canvas;
}

function drawArrows(
  context: CanvasRenderingContext2D,
  directions: Float32Array,
  cols: number,
  rows: number,
  width: number,
  height: number,
) {
  const length = Math.min(width / cols, height / rows) * 0.42;
  context.strokeStyle = "rgba(12, 20, 32, 0.85)";
  context.fillStyle = "rgba(12, 20, 32, 0.85)";
  context.lineWidth = 1.4;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const from = directions[r * cols + c]!;
      if (Number.isNaN(from)) continue;
      // Meteorological direction is "from"; arrows point downwind.
      const angle = ((from + 180) * Math.PI) / 180;
      const cx = (c / (cols - 1)) * (width - 1);
      const cy = (r / (rows - 1)) * (height - 1);
      const dx = Math.sin(angle) * length;
      const dy = -Math.cos(angle) * length;
      context.beginPath();
      context.moveTo(cx - dx, cy - dy);
      context.lineTo(cx + dx, cy + dy);
      context.stroke();
      const head = length * 0.45;
      context.beginPath();
      context.moveTo(cx + dx, cy + dy);
      context.lineTo(cx + dx - head * Math.sin(angle - 0.5), cy + dy + head * Math.cos(angle - 0.5));
      context.lineTo(cx + dx - head * Math.sin(angle + 0.5), cy + dy + head * Math.cos(angle + 0.5));
      context.closePath();
      context.fill();
    }
  }
}
