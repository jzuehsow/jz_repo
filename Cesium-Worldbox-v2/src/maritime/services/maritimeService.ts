import type { VesselTrack } from "@/maritime/models/VesselObject";
import { aisStreamProvider } from "@/maritime/providers/AisStreamProvider";
import { digitrafficAisProvider } from "@/maritime/providers/DigitrafficAisProvider";
import type { MaritimeBounds, MaritimeDataProvider } from "@/maritime/providers/MaritimeDataProvider";
import { vesselHistoryStore } from "@/maritime/services/vesselRouteService";

export const VESSEL_REFRESH_MS = 60_000;
export const VESSEL_MAX_RENDERED = 2_000;
const STALE_AFTER_MS = 15 * 60_000;
const MAX_BACKOFF_MS = 10 * 60_000;

export const MARITIME_PROVIDERS: MaritimeDataProvider[] = [digitrafficAisProvider, aisStreamProvider];

export interface MaritimeServiceStatus {
  enabled: boolean;
  loading: boolean;
  count: number;
  providerId: string;
  providerName: string;
  coverage: string;
  attribution: string;
  lastRefreshMs: number | null;
  stale: boolean;
  error: string | null;
}

type Listener = (status: MaritimeServiceStatus) => void;

/** Polling + snapshot for AIS vessels; inert (no timers/requests) until started. */
class MaritimeService {
  private provider: MaritimeDataProvider = digitrafficAisProvider;
  private tracks = new Map<number, VesselTrack>();
  private bounds: MaritimeBounds | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private controller: AbortController | null = null;
  private listeners = new Set<Listener>();
  private enabled = false;
  private loading = false;
  private lastRefreshMs: number | null = null;
  private error: string | null = null;
  private failures = 0;
  private maxRendered = VESSEL_MAX_RENDERED;
  version = 0;

  setProvider(id: string) {
    const next = MARITIME_PROVIDERS.find((p) => p.capabilities.id === id);
    if (!next || next === this.provider) return;
    this.provider = next;
    this.tracks.clear();
    vesselHistoryStore.clear();
    this.version += 1;
    this.error = null;
    this.notify();
    if (this.enabled) void this.refresh();
  }

  setMaxRendered(max: number) {
    this.maxRendered = Math.max(50, Math.floor(max));
  }

  getTracks(): VesselTrack[] {
    return [...this.tracks.values()];
  }

  getTrack(mmsi: number): VesselTrack | null {
    return this.tracks.get(mmsi) ?? null;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.status());
    return () => this.listeners.delete(listener);
  }

  status(): MaritimeServiceStatus {
    const c = this.provider.capabilities;
    return {
      enabled: this.enabled,
      loading: this.loading,
      count: this.tracks.size,
      providerId: c.id,
      providerName: c.name,
      coverage: c.coverage,
      attribution: c.attribution,
      lastRefreshMs: this.lastRefreshMs,
      stale: this.lastRefreshMs !== null && Date.now() - this.lastRefreshMs > STALE_AFTER_MS,
      error: this.error,
    };
  }

  private notify() {
    const snapshot = this.status();
    for (const listener of this.listeners) listener(snapshot);
  }

  start(bounds: MaritimeBounds) {
    this.bounds = bounds;
    if (this.enabled) return;
    this.enabled = true;
    this.error = null;
    this.failures = 0;
    this.notify();
    void this.refresh();
  }

  stop() {
    this.enabled = false;
    this.loading = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.controller?.abort();
    this.controller = null;
    this.tracks.clear();
    vesselHistoryStore.clear();
    this.lastRefreshMs = null;
    this.error = null;
    this.version += 1;
    this.notify();
  }

  /** Called after the camera settles (debounced by the renderer). */
  updateBounds(bounds: MaritimeBounds) {
    const previous = this.bounds;
    this.bounds = bounds;
    if (!this.enabled || !previous) return;
    const span = (b: MaritimeBounds) => Math.abs(b.north - b.south) + Math.abs(b.east - b.west);
    const moved =
      Math.abs(previous.north - bounds.north) + Math.abs(previous.west - bounds.west) > span(previous) * 0.3 ||
      Math.abs(span(bounds) - span(previous)) > span(previous) * 0.5;
    if (moved) void this.refresh();
  }

  private schedule(delay: number) {
    if (!this.enabled) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.refresh();
    }, delay);
  }

  private async refresh() {
    if (!this.enabled || !this.bounds) return;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.loading = true;
    this.notify();
    const interval = Math.max(VESSEL_REFRESH_MS, this.provider.capabilities.minRefreshMs);
    try {
      const tracks = await this.provider.fetchRegion({
        bounds: this.bounds,
        limit: this.maxRendered,
        signal: controller.signal,
      });
      if (!this.enabled || controller.signal.aborted) return;
      const now = Date.now();
      const next = new Map<number, VesselTrack>();
      for (const track of tracks) {
        if (now - track.state.observedAtMs > STALE_AFTER_MS * 4) continue;
        next.set(track.object.mmsi, track);
      }
      this.tracks = next;
      vesselHistoryStore.record(next.values());
      this.lastRefreshMs = now;
      this.error = null;
      this.failures = 0;
      this.version += 1;
      this.schedule(interval);
    } catch (cause) {
      if (controller.signal.aborted && !this.enabled) return;
      if ((cause as Error)?.name === "AbortError" && this.controller !== controller) return;
      this.failures += 1;
      this.error = cause instanceof Error ? cause.message : "Vessel feed unavailable.";
      this.schedule(Math.min(MAX_BACKOFF_MS, interval * 2 ** Math.min(this.failures, 3)));
    } finally {
      if (this.controller === controller) this.controller = null;
      this.loading = false;
      this.notify();
    }
  }
}

export const maritimeService = new MaritimeService();
