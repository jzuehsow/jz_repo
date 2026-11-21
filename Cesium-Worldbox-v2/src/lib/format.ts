export function formatUtc(date: Date): string {
  return `${date.toISOString().slice(0, 19).replace("T", " ")}Z`;
}

export function formatUtcTime(date: Date): string {
  return `${date.toISOString().slice(11, 19)}Z`;
}

export function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatLat(value: number): string {
  return `${Math.abs(value).toFixed(3)}° ${value >= 0 ? "N" : "S"}`;
}

export function formatLon(value: number): string {
  return `${Math.abs(value).toFixed(3)}° ${value >= 0 ? "E" : "W"}`;
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes - h * 60;
  return h > 0 ? `${h}h ${m.toFixed(1)}m` : `${m.toFixed(1)} min`;
}

export function relativeToNow(date: Date): string {
  const deltaMs = date.getTime() - Date.now();
  const abs = Math.abs(deltaMs);
  const minutes = abs / 60000;
  const hours = minutes / 60;
  const days = hours / 24;
  const unit = days >= 1 ? `${days.toFixed(1)} d` : hours >= 1 ? `${hours.toFixed(1)} h` : `${minutes.toFixed(0)} min`;
  if (abs < 45_000) return "now";
  return deltaMs > 0 ? `+${unit}` : `-${unit}`;
}

export function formatSpeed(kmS: number): string {
  return `${formatNumber(kmS, 3)} km/s`;
}
