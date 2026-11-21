import type { AircraftTrack } from "@/aircraft/models/AircraftState";
import { adsbLolProvider } from "@/aircraft/providers/AdsbLolProvider";
import { aircraftHistoryStore } from "@/aircraft/services/aircraftHistoryStore";
import { distanceKm, type AircraftDataProvider } from "@/aircraft/providers/AircraftDataProvider";

export const AIRCRAFT_REFRESH_MS = 12_000;
export const AIRCRAFT_REQUEST_TIMEOUT_MS = 8_000;
export const AIRCRAFT_MAX_RENDERED = 1_200;
const STALE_AFTER_MS = 60_000;
const MAX_BACKOFF_MS = 120_000;

export interface AircraftRegion {
  latitudeDeg: number;
  longitudeDeg: number;
  radiusKm: number;
}

export interface AircraftServiceStatus {
  enabled: boolean;
  loading: boolean;
  count: number;
  providerName: string;
  attribution: string;
  lastRefreshMs: number | null;
  stale: boolean;
  error: string | null;
}

type Listener = (status: AircraftServiceStatus) => void;

/**
 * Owns polling, aborting, and the current aircraft snapshot. Lives outside
 * React so refreshes never rerender the console tree beyond the status readout.
 */
class AircraftService {
  private provider: AircraftDataProvider = adsbLolProvider;
  private tracks = new Map<string, AircraftTrack>();
  private region: AircraftRegion | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private controller: AbortController | null = null;
  private listeners = new Set<Listener>();
  private enabled = false;
  private loading = false;
  private lastRefreshMs: number | null = null;
  private error: string | null = null;
  private failures = 0;
  private maxRendered = AIRCRAFT_MAX_RENDERED;
  /** Bumped on every successful refresh so renderers can diff cheaply. */
  version = 0;

  setProvider(provider: AircraftDataProvider) {
    if (provider.id === this.provider.id) return;
    this.provider = provider;
    if (this.enabled) void this.refresh(true);
  }

  setMaxRendered(max: number) {
    this.maxRendered = Math.max(50, Math.floor(max));
  }

  getProvider(): AircraftDataProvider {
    return this.provider;
  }

  getTracks(): AircraftTrack[] {
    return [...this.tracks.values()];
  }

  getTrack(icaoHex: string): AircraftTrack | null {
    return this.tracks.get(icaoHex) ?? null;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.status());
    return () => this.listeners.delete(listener);
  }

  status(): AircraftServiceStatus {
    return {
      enabled: this.enabled,
      loading: this.loading,
      count: this.tracks.size,
      providerName: this.provider.name,
      attribution: this.provider.attribution,
      lastRefreshMs: this.lastRefreshMs,
      stale:
        this.lastRefreshMs !== null && Date.now() - this.lastRefreshMs > STALE_AFTER_MS,
      error: this.error,
    };
  }

  private notify() {
    const snapshot = this.status();
    for (const listener of this.listeners) listener(snapshot);
  }

  start(region: AircraftRegion) {
    this.region = region;
    if (this.enabled) return;
    this.enabled = true;
    this.error = null;
    this.failures = 0;
    this.notify();
    void this.refresh(true);
  }

  stop() {
    this.enabled = false;
    this.loading = false;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.controller?.abort();
    this.controller = null;
    this.tracks.clear();
    aircraftHistoryStore.clear();
    this.lastRefreshMs = null;
    this.error = null;
    this.failures = 0;
    this.version += 1;
    this.notify();
  }

  /**
   * Camera-aware region update. Only triggers an immediate request when the
   * view moved a meaningful distance or the radius changed materially.
   */
  updateRegion(region: AircraftRegion) {
    const previous = this.region;
    this.region = region;
    if (!this.enabled) return;
    if (!previous) {
      void this.refresh(true);
      return;
    }
    const moved = distanceKm(
      previous.latitudeDeg,
      previous.longitudeDeg,
      region.latitudeDeg,
      region.longitudeDeg,
    );
    const radiusChange = Math.abs(region.radiusKm - previous.radiusKm) / previous.radiusKm;
    if (moved > previous.radiusKm * 0.35 || radiusChange > 0.5) {
      void this.refresh(true);
    }
  }

  private scheduleNext(delayMs: number) {
    if (!this.enabled) return;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.refresh(false);
    }, delayMs);
  }

  private async refresh(immediate: boolean) {
    if (!this.enabled || !this.region) return;
    if (this.loading && !immediate) return;

    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const timeout = setTimeout(() => controller.abort(), AIRCRAFT_REQUEST_TIMEOUT_MS);
    this.loading = true;
    this.notify();

    const region = this.region;
    try {
      const tracks = await this.provider.fetchRegion({
        latitudeDeg: region.latitudeDeg,
        longitudeDeg: region.longitudeDeg,
        radiusKm: Math.min(region.radiusKm, this.provider.maxRadiusKm),
        limit: this.maxRendered,
        signal: controller.signal,
      });
      if (!this.enabled || controller.signal.aborted) return;
      const next = new Map<string, AircraftTrack>();
      for (const track of tracks) next.set(track.object.icaoHex, track);
      this.tracks = next;
      aircraftHistoryStore.record(next.values());
      this.lastRefreshMs = Date.now();
      this.error = null;
      this.failures = 0;
      this.version += 1;
      this.scheduleNext(Math.max(AIRCRAFT_REFRESH_MS, this.provider.minRefreshMs));
    } catch (cause) {
      if (controller.signal.aborted && !this.enabled) return;
      this.failures += 1;
      const aborted = controller.signal.aborted;
      this.error = aborted
        ? "Aircraft feed timed out."
        : cause instanceof Error
          ? cause.message
          : "Aircraft feed unavailable.";
      const backoff = Math.min(
        MAX_BACKOFF_MS,
        Math.max(AIRCRAFT_REFRESH_MS, this.provider.minRefreshMs) * 2 ** Math.min(this.failures, 4),
      );
      this.scheduleNext(backoff);
    } finally {
      clearTimeout(timeout);
      if (this.controller === controller) this.controller = null;
      this.loading = false;
      this.notify();
    }
  }
}

export const aircraftService = new AircraftService();
