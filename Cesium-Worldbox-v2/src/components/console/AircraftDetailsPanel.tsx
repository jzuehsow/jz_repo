import { useEffect, useState } from "react";
import { ArrowRight, Crosshair, Plane, X } from "lucide-react";

import type { Airport } from "@/aircraft/models/AircraftRoute";
import { getTypeMetadata, resolveAltitude } from "@/aircraft/services/aircraftMetadataService";
import { getCachedRoute, lookupRoute, type RouteLookup } from "@/aircraft/services/aircraftRouteService";

import type { AircraftTrack } from "@/aircraft/models/AircraftState";
import { formatLat, formatLon, formatNumber, formatUtc } from "@/lib/format";
import { ObjectThumbnailView } from "@/media/components/ObjectThumbnailView";
import { getThumbnailForAircraft } from "@/media/services/thumbnailProvider";

interface AircraftDetailsPanelProps {
  track: AircraftTrack | null;
  attribution: string;
  onClear: () => void;
  onFocus: (track: AircraftTrack) => void;
}

const DASH = "—";

function useRoute(callsign: string | undefined, lat: number | undefined, lon: number | undefined) {
  const key = callsign?.trim().toUpperCase();
  const [state, setState] = useState<{ key?: string; route: RouteLookup | null; loading: boolean; error: boolean }>({
    route: null,
    loading: false,
    error: false,
  });
  useEffect(() => {
    if (!key || lat === undefined || lon === undefined) return;
    const cached = getCachedRoute(key);
    if (cached !== undefined) {
      setState({ key, route: cached, loading: false, error: false });
      return;
    }
    let cancelled = false;
    setState({ key, route: null, loading: true, error: false });
    lookupRoute(key, lat, lon)
      .then((route) => !cancelled && setState({ key, route, loading: false, error: false }))
      .catch(() => !cancelled && setState({ key, route: null, loading: false, error: true }));
    return () => {
      cancelled = true;
    };
    // Position only seeds the lookup; re-querying on every refresh is unnecessary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state.key === key ? state : { route: null, loading: Boolean(key), error: false };
}

function AirportBlock({ airport, label }: { airport: Airport | null; label: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[9px] tracking-wider text-muted-foreground uppercase">{label}</p>
      <p className="truncate text-[11px] font-medium text-foreground">{airport?.name ?? "Unknown"}</p>
      <p className="font-mono text-[10px] text-primary">
        {airport ? [airport.iata, airport.icao].filter(Boolean).join(" / ") : DASH}
      </p>
      {airport?.city ? (
        <p className="truncate text-[10px] text-muted-foreground">
          {airport.city}
          {airport.countryIso2 ? `, ${airport.countryIso2}` : ""}
        </p>
      ) : null}
    </div>
  );
}

export function AircraftDetailsPanel({
  track,
  attribution,
  onClear,
  onFocus,
}: AircraftDetailsPanelProps) {
  if (!track) {
    return (
      <section className="panel-surface pointer-events-auto hidden w-[20rem] flex-col items-center justify-center gap-2 rounded-md p-6 text-center lg:flex">
        <Plane className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-foreground">Aircraft no longer in view</p>
        <p className="text-xs text-muted-foreground">
          The selected aircraft left the polled region or stopped reporting.
        </p>
      </section>
    );
  }

  return <AircraftDetailsBody track={track} attribution={attribution} onClear={onClear} onFocus={onFocus} />;
}

function AircraftDetailsBody({
  track,
  attribution,
  onClear,
  onFocus,
}: AircraftDetailsPanelProps & { track: AircraftTrack }) {
  const { object, state } = track;
  const altitude = resolveAltitude(track);
  const typeMeta = getTypeMetadata(object.typeCode);
  const route = useRoute(object.callsign, state.latitudeDeg, state.longitudeDeg);
  const ageSeconds = Math.max(0, Math.round((Date.now() - state.observedAtMs) / 1000));

  return (
    <section className="panel-surface pointer-events-auto flex w-full flex-col overflow-hidden rounded-md lg:w-[20rem]">
      <div className="flex items-start gap-2 border-b border-panel-border p-3">
        <div className="min-w-0 flex-1">
          <p className="label-caps">Live aircraft</p>
          <h2 className="truncate text-sm font-semibold text-foreground">
            {object.callsign ?? object.registration ?? object.icaoHex.toUpperCase()}
          </h2>
          <p className="font-mono text-[11px] text-muted-foreground">
            ICAO {object.icaoHex.toUpperCase()} · {object.typeCode ?? "type n/a"}
          </p>
        </div>
        <button
          type="button"
          aria-label="Clear selection"
          onClick={onClear}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="scan-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <ObjectThumbnailView
          thumbnail={getThumbnailForAircraft(
            typeMeta?.thumbnailKey ? { ...object, modelFamily: object.modelFamily ?? typeMeta.thumbnailKey } : object,
          )}
        />

        <p className="rounded-sm border border-primary/40 bg-primary/10 px-2 py-1.5 font-mono text-[10px] leading-snug tracking-wider text-primary uppercase">
          Live ADS-B observation · not propagated · {ageSeconds}s old
        </p>

        <Group title="Identification">
          <Row label="Callsign" value={object.callsign ?? DASH} mono />
          <Row label="Registration" value={object.registration ?? DASH} mono />
          <Row
            label="Type"
            value={
              object.typeName ??
              (typeMeta ? `${typeMeta.manufacturer} ${typeMeta.model}` : undefined) ??
              object.typeCode ??
              DASH
            }
          />
          <Row label="Operator" value={object.operator ?? DASH} />
          <Row label="Squawk" value={state.squawk ?? DASH} mono />
        </Group>

        <Group title="Route">
          <div className="space-y-1.5 px-2.5 py-2">
            {!object.callsign ? (
              <p className="text-[11px] text-muted-foreground">No callsign — route unavailable.</p>
            ) : route.loading ? (
              <p className="text-[11px] text-muted-foreground">Looking up route…</p>
            ) : route.route ? (
              <>
                <div className="flex items-start gap-2">
                  <AirportBlock airport={route.route.origin} label="Origin" />
                  <ArrowRight className="mt-4 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <AirportBlock airport={route.route.destination} label="Destination" />
                </div>
                <p className="text-[9px] leading-snug text-muted-foreground">
                  Scheduled route for this callsign · {route.route.source}
                  {route.route.plausible ? "" : " · may not match this flight"}. Solid line = reported
                  positions this session; dashed = estimated remaining route.
                </p>
              </>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Route unavailable{route.error ? " — lookup failed" : ""}.
              </p>
            )}
          </div>
        </Group>

        <Group title="Observed state">
          <Row label="Observed at" value={formatUtc(new Date(state.observedAtMs))} mono />
          <Row label="Latitude" value={formatLat(state.latitudeDeg)} mono />
          <Row label="Longitude" value={formatLon(state.longitudeDeg)} mono />
          <Row
            label="Altitude"
            value={
              altitude.source === "ON_GROUND"
                ? "On ground"
                : altitude.source === "REPORTED"
                  ? `${formatNumber(altitude.altitudeFt ?? 0, 0)} ft`
                  : altitude.source === "ESTIMATED"
                    ? `~${formatNumber(altitude.altitudeFt ?? 0, 0)} ft`
                    : DASH
            }
            mono
          />
          <Row
            label="Altitude source"
            value={
              altitude.source === "ESTIMATED"
                ? `Estimated — ${altitude.note ?? "typical cruise"}`
                : altitude.source === "REPORTED"
                  ? "Reported (ADS-B)"
                  : altitude.source === "ON_GROUND"
                    ? "Reported on ground"
                    : "Not reported"
            }
          />
          <Row
            label="Ground speed"
            value={state.groundSpeedKt !== undefined ? `${formatNumber(state.groundSpeedKt, 0)} kt` : DASH}
            mono
          />
          <Row
            label="Track"
            value={state.trackDeg !== undefined ? `${formatNumber(state.trackDeg, 0)}°` : DASH}
            mono
          />
          <Row
            label="Vertical rate"
            value={
              state.verticalRateFpm !== undefined
                ? `${formatNumber(state.verticalRateFpm, 0)} ft/min`
                : DASH
            }
            mono
          />
          <Row label="Source" value={state.source} mono />
        </Group>

        <p className="text-[10px] leading-snug text-muted-foreground">{attribution}</p>
      </div>

      <div className="border-t border-panel-border p-3">
        <button
          type="button"
          onClick={() => onFocus(track)}
          className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary/90 px-3 py-2 font-mono text-[11px] tracking-widest text-primary-foreground transition-colors hover:bg-primary"
        >
          <Crosshair className="size-3.5" />
          CENTER ON AIRCRAFT
        </button>
      </div>
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-border/70 bg-card/60">
      <p className="label-caps border-b border-border/70 px-2.5 py-1.5">{title}</p>
      <dl className="divide-y divide-border/40">{children}</dl>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 px-2.5 py-1.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd
        className={`truncate text-right text-[11px] text-foreground ${mono ? "font-mono tabular-nums" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
