import { ArrowRight, Crosshair, Ship, X } from "lucide-react";

import { formatLat, formatLon, formatNumber, formatUtc } from "@/lib/format";
import type { VesselTrack } from "@/maritime/models/VesselObject";
import type { Port } from "@/maritime/models/VesselRoute";
import { navStatusText, VESSEL_CATEGORIES } from "@/maritime/services/vesselMetadataService";
import { buildVesselRoute } from "@/maritime/services/vesselRouteService";
import { ObjectThumbnailView } from "@/media/components/ObjectThumbnailView";
import { getThumbnailForVessel } from "@/media/services/thumbnailProvider";

interface VesselDetailsPanelProps {
  track: VesselTrack | null;
  attribution: string;
  coverage: string;
  onClear: () => void;
  onFocus: (track: VesselTrack) => void;
}

const DASH = "—";
const num = (v: number | undefined, digits: number, unit: string) =>
  v === undefined ? DASH : `${formatNumber(v, digits)}${unit}`;

function PortBlock({ port, label, fallback }: { port: Port | null; label: string; fallback: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[9px] tracking-wider text-muted-foreground uppercase">{label}</p>
      <p className="truncate text-[11px] font-medium text-foreground">{port?.name ?? fallback}</p>
      <p className="font-mono text-[10px] text-primary">
        {port ? [port.unlocode, port.country].filter(Boolean).join(" · ") || DASH : DASH}
      </p>
    </div>
  );
}

export function VesselDetailsPanel({ track, attribution, coverage, onClear, onFocus }: VesselDetailsPanelProps) {
  if (!track) {
    return (
      <section className="panel-surface pointer-events-auto hidden w-[20rem] flex-col items-center justify-center gap-2 rounded-md p-6 text-center lg:flex">
        <Ship className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-foreground">Vessel no longer in view</p>
        <p className="text-xs text-muted-foreground">It left the loaded area or stopped reporting.</p>
      </section>
    );
  }
  const { object, state } = track;
  const meta = VESSEL_CATEGORIES[object.category];
  const route = buildVesselRoute(track);
  const ageMin = Math.max(0, Math.round((Date.now() - state.observedAtMs) / 60_000));

  return (
    <section className="panel-surface pointer-events-auto flex w-full flex-col overflow-hidden rounded-md lg:w-[20rem]">
      <div className="flex items-start gap-2 border-b border-panel-border p-3">
        <div className="min-w-0 flex-1">
          <p className="label-caps">Vessel · AIS</p>
          <h2 className="truncate text-sm font-semibold text-foreground">{object.name ?? `MMSI ${object.mmsi}`}</h2>
          <p className="font-mono text-[11px] text-muted-foreground">
            MMSI {object.mmsi} · {meta.label}
          </p>
        </div>
        <button type="button" aria-label="Clear selection" onClick={onClear} className="text-muted-foreground transition-colors hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      <div className="scan-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <ObjectThumbnailView thumbnail={getThumbnailForVessel(object, meta.thumbnailKey)} />

        <p className="rounded-sm border border-primary/40 bg-primary/10 px-2 py-1.5 font-mono text-[10px] leading-snug tracking-wider text-primary uppercase">
          Live AIS observation · not propagated · {ageMin} min old
        </p>

        <Group title="Voyage">
          <div className="space-y-1.5 px-2.5 py-2">
            <div className="flex items-start gap-2">
              <PortBlock port={route.origin} label="Origin" fallback="Unknown" />
              <ArrowRight className="mt-4 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <PortBlock port={route.destination} label="Destination" fallback="Not broadcast" />
            </div>
            <p className="text-[9px] leading-snug text-muted-foreground">
              Destination as broadcast by the vessel. Solid line = AIS positions observed this session.
              Detailed route data unavailable — no remaining route is drawn.
            </p>
          </div>
        </Group>

        <Group title="Identification">
          <Row label="IMO" value={object.imo ? String(object.imo) : DASH} mono />
          <Row label="Callsign" value={object.callsign ?? DASH} mono />
          <Row label="Type" value={object.shipTypeCode !== undefined ? `${meta.label} (${object.shipTypeCode})` : meta.label} />
          <Row label="Flag" value={object.flag ?? DASH} />
          <Row label="Length" value={num(object.lengthM, 0, " m")} mono />
          <Row label="Beam" value={num(object.beamM, 0, " m")} mono />
          <Row label="Draught" value={num(object.draughtM, 1, " m")} mono />
        </Group>

        <Group title="Observed state">
          <Row label="Last updated" value={formatUtc(new Date(state.observedAtMs))} mono />
          <Row label="Latitude" value={formatLat(state.latitudeDeg)} mono />
          <Row label="Longitude" value={formatLon(state.longitudeDeg)} mono />
          <Row label="Speed" value={num(state.speedKn, 1, " kn")} mono />
          <Row label="Heading" value={num(state.headingDeg, 0, "°")} mono />
          <Row label="Course" value={num(state.courseDeg, 0, "°")} mono />
          <Row label="Status" value={navStatusText(state.navStatus) ?? DASH} />
          <Row label="Destination" value={object.destination ?? DASH} mono />
          <Row label="ETA" value={object.eta ?? DASH} mono />
          <Row label="Source" value={state.source} mono />
        </Group>

        <p className="text-[10px] leading-snug text-muted-foreground">
          {attribution} · Coverage: {coverage}
        </p>
      </div>

      <div className="border-t border-panel-border p-3">
        <button
          type="button"
          onClick={() => onFocus(track)}
          className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary/90 px-3 py-2 font-mono text-[11px] tracking-widest text-primary-foreground transition-colors hover:bg-primary"
        >
          <Crosshair className="size-3.5" />
          CENTER ON VESSEL
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
      <dd className={`truncate text-right text-[11px] text-foreground ${mono ? "font-mono tabular-nums" : ""}`}>{value}</dd>
    </div>
  );
}
