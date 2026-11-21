import type { SpaceObject, Trajectory } from "@/domain/spaceObject";
import { mapRecords } from "./celestrakProvider";
import type { ListOptions, OmmRecord, SpaceObjectProvider } from "./types";

/**
 * Client for the future backend contract:
 *   GET /api/space-objects
 *   GET /api/space-objects/{noradId}
 *   GET /api/space-objects/{noradId}/state?time=...
 *   GET /api/space-objects/{noradId}/trajectory?start=...&end=...
 *
 * No backend is required today — this exists so switching data sources is a
 * one-line provider swap, not a refactor.
 */
export interface RestProviderConfig {
  baseUrl: string;
  headers?: Record<string, string>;
}

export function createRestProvider(config: RestProviderConfig): SpaceObjectProvider {
  const base = config.baseUrl.replace(/\/$/, "");

  async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
    const init: RequestInit = { headers: { accept: "application/json", ...config.headers } };
    if (signal) init.signal = signal;
    const response = await fetch(`${base}${path}`, init);
    if (!response.ok) throw new Error(`${path} responded ${response.status}`);
    return (await response.json()) as T;
  }

  return {
    id: "rest-api",
    label: `REST API (${base})`,
    async listSpaceObjects(options?: ListOptions): Promise<SpaceObject[]> {
      const limit = options?.limit ?? 900;
      const payload = await get<SpaceObject[] | OmmRecord[]>(
        `/api/space-objects?limit=${limit}`,
        options?.signal,
      );
      return normalize(payload, limit);
    },
    async getSpaceObject(noradId: number): Promise<SpaceObject | null> {
      const payload = await get<SpaceObject | OmmRecord>(`/api/space-objects/${noradId}`);
      return normalize([payload] as SpaceObject[] | OmmRecord[], 1)[0] ?? null;
    },
  };
}

export async function fetchRemoteTrajectory(
  baseUrl: string,
  noradId: number,
  start: string,
  end: string,
): Promise<Trajectory> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/space-objects/${noradId}/trajectory?start=${encodeURIComponent(
    start,
  )}&end=${encodeURIComponent(end)}`;
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`trajectory responded ${response.status}`);
  return (await response.json()) as Trajectory;
}

function normalize(payload: SpaceObject[] | OmmRecord[], limit: number): SpaceObject[] {
  if (!Array.isArray(payload) || payload.length === 0) return [];
  const first = payload[0] as Record<string, unknown>;
  if (first && "elements" in first && "noradId" in first) {
    return (payload as SpaceObject[]).slice(0, limit).map((o) => ({ ...o, source: "rest-api" }));
  }
  return mapRecords(payload as OmmRecord[], limit).map((o) => ({ ...o, source: "rest-api" }));
}
