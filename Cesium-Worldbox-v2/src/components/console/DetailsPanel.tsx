import { Crosshair, Satellite, X } from "lucide-react";

import type { PropagatedState, SpaceObject } from "@/domain/spaceObject";
import {
  formatDuration,
  formatLat,
  formatLon,
  formatNumber,
  formatSpeed,
  formatUtc,
  relativeToNow,
} from "@/lib/format";
import { ObjectThumbnailView } from "@/media/components/ObjectThumbnailView";
import { getThumbnailForSpaceObject } from "@/media/services/thumbnailProvider";
import { useSimulation } from "@/state/simulationStore";

interface DetailsPanelProps {
  object: SpaceObject | null;
  state: PropagatedState | null;
  onFocus: (noradId: number) => void;
}

export function DetailsPanel({ object, state, onFocus }: DetailsPanelProps) {
  const { selectObject, simTimeMs } = useSimulation();

  if (!object) {
    return (
      <section className="panel-surface pointer-events-auto hidden w-[20rem] flex-col items-center justify-center gap-2 rounded-md p-6 text-center lg:flex">
        <Satellite className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-foreground">No object selected</p>
        <p className="text-xs text-muted-foreground">
          Click a marker on the globe or pick an object from the catalog to inspect its state
          vector and orbit.
        </p>
      </section>
    );
  }

  const estimate = state?.isEstimate ?? false;

  return (
    <section className="panel-surface pointer-events-auto flex w-full flex-col overflow-hidden rounded-md lg:w-[20rem]">
      <div className="flex items-start gap-2 border-b border-panel-border p-3">
        <div className="min-w-0 flex-1">
          <p className="label-caps">Selected object</p>
          <h2 className="truncate text-sm font-semibold text-foreground">{object.name}</h2>
          <p className="font-mono text-[11px] text-muted-foreground">
            NORAD {object.noradId} · {object.cosparId ?? "COSPAR n/a"}
          </p>
        </div>
        <button
          type="button"
          aria-label="Clear selection"
          onClick={() => selectObject(null)}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="scan-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <ObjectThumbnailView thumbnail={getThumbnailForSpaceObject(object)} />

        {estimate ? (
          <p className="rounded-sm border border-warning/40 bg-warning/10 px-2 py-1.5 font-mono text-[10px] leading-snug tracking-wider text-warning uppercase">
            Propagated estimate · SGP4 · {relativeToNow(new Date(simTimeMs))} from now
          </p>
        ) : null}

        <Group title="Identification">
          <Row label="Type" value={object.objectType} />
          <Row label="Operator" value={object.operator ?? "Unknown"} />
          <Row label="Constellation" value={object.constellation ?? "—"} />
          <Row label="Country" value={object.countryCode ?? "—"} />
          <Row label="Launch date" value={object.launchDate ?? "—"} />
          <Row label="Source" value={sourceLabel(object.source)} />
        </Group>

        <Group title={estimate ? "Estimated state" : "Current state"}>
          <Row label="Epoch (elset)" value={formatUtc(new Date(object.elements.epoch))} mono />
          <Row label="State time" value={formatUtc(new Date(simTimeMs))} mono />
          <Row label="Latitude" value={state ? formatLat(state.latitudeDeg) : "—"} mono />
          <Row label="Longitude" value={state ? formatLon(state.longitudeDeg) : "—"} mono />
          <Row
            label="Altitude"
            value={state ? `${formatNumber(state.altitudeKm, 1)} km` : "—"}
            mono
          />
          <Row label="Speed" value={state ? formatSpeed(state.speedKmS) : "—"} mono />
        </Group>

        <Group title="Orbit">
          <Row label="Regime" value={object.orbit.regime} />
          <Row label="Period" value={formatDuration(object.orbit.periodMinutes)} mono />
          <Row label="Inclination" value={`${formatNumber(object.orbit.inclinationDeg, 3)}°`} mono />
          <Row label="Apogee" value={`${formatNumber(object.orbit.apogeeKm, 1)} km`} mono />
          <Row label="Perigee" value={`${formatNumber(object.orbit.perigeeKm, 1)} km`} mono />
          <Row label="Eccentricity" value={formatNumber(object.elements.eccentricity, 6)} mono />
          <Row label="RAAN" value={`${formatNumber(object.elements.raOfAscNode, 3)}°`} mono />
          <Row
            label="Arg. of perigee"
            value={`${formatNumber(object.elements.argOfPericenter, 3)}°`}
            mono
          />
          <Row label="Mean motion" value={`${formatNumber(object.elements.meanMotion, 6)} rev/d`} mono />
          <Row label="Semi-major axis" value={`${formatNumber(object.orbit.semiMajorAxisKm, 1)} km`} mono />
        </Group>
      </div>

      <div className="border-t border-panel-border p-3">
        <button
          type="button"
          onClick={() => onFocus(object.noradId)}
          className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary/90 px-3 py-2 font-mono text-[11px] tracking-widest text-primary-foreground transition-colors hover:bg-primary"
        >
          <Crosshair className="size-3.5" />
          CENTER ON OBJECT
        </button>
      </div>
    </section>
  );
}

function sourceLabel(source: SpaceObject["source"]): string {
  if (source === "celestrak") return "CelesTrak GP (OMM)";
  if (source === "rest-api") return "Backend REST API";
  if (source === "sample") return "Sample elements";
  return "Unknown";
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
