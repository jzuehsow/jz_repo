import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";

import type { ObjectType, OrbitRegime, SpaceObject } from "@/domain/spaceObject";
import { useSimulation } from "@/state/simulationStore";

const REGIMES: OrbitRegime[] = ["LEO", "MEO", "GEO", "HEO"];
const TYPES: ObjectType[] = ["PAYLOAD", "ROCKET BODY", "DEBRIS", "UNKNOWN"];

const REGIME_DOT: Record<OrbitRegime, string> = {
  LEO: "bg-leo",
  MEO: "bg-meo",
  GEO: "bg-geo",
  HEO: "bg-heo",
};

interface CatalogPanelProps {
  results: SpaceObject[];
  operators: string[];
  isLoading: boolean;
  notice?: string | undefined;
  minimized?: boolean;
  onToggleMinimize?: () => void;
}

export function CatalogPanel({
  results,
  operators,
  isLoading,
  notice,
  minimized = false,
  onToggleMinimize,
}: CatalogPanelProps) {
  const { filters, setFilters, selectedNoradId, selectObject } = useSimulation();

  const toggle = <T extends string>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  if (minimized) {
    return (
      <section className="panel-surface pointer-events-auto flex flex-col items-center gap-2 overflow-hidden rounded-md py-2 px-1">
        <button
          type="button"
          aria-label="Expand catalog panel"
          onClick={onToggleMinimize}
          className="flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
        <span className="label-caps" style={{ writingMode: "vertical-rl" }}>
          Catalog
        </span>
        <span className="font-mono text-[10px] text-muted-foreground" style={{ writingMode: "vertical-rl" }}>
          {results.length.toLocaleString()}
        </span>
      </section>
    );
  }

  return (
    <section className="panel-surface pointer-events-auto flex w-full flex-col overflow-hidden rounded-md md:w-[19rem]">
      <div className="flex items-center justify-between border-b border-panel-border p-3">
        <label className="label-caps" htmlFor="catalog-search">
          Search catalog
        </label>
        <button
          type="button"
          aria-label="Minimize catalog panel"
          onClick={onToggleMinimize}
          className="flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>
      <div className="border-b border-panel-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            id="catalog-search"
            value={filters.query}
            onChange={(event) =>
              setFilters((previous) => ({ ...previous, query: event.target.value }))
            }
            placeholder="Name, NORAD ID, COSPAR…"
            className="w-full rounded-sm border border-input bg-background/70 py-1.5 pr-7 pl-8 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
          />
          {filters.query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setFilters((previous) => ({ ...previous, query: "" }))}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 border-b border-panel-border p-3">
        <FilterRow label="Orbit regime">
          {REGIMES.map((regime) => (
            <Chip
              key={regime}
              active={filters.regimes.includes(regime)}
              onClick={() =>
                setFilters((previous) => ({
                  ...previous,
                  regimes: toggle(previous.regimes, regime),
                }))
              }
            >
              <span className={`size-1.5 rounded-full ${REGIME_DOT[regime]}`} />
              {regime}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="Object type">
          {TYPES.map((type) => (
            <Chip
              key={type}
              active={filters.objectTypes.includes(type)}
              onClick={() =>
                setFilters((previous) => ({
                  ...previous,
                  objectTypes: toggle(previous.objectTypes, type),
                }))
              }
            >
              {type}
            </Chip>
          ))}
        </FilterRow>

        {operators.length > 0 ? (
          <FilterRow label="Operator / constellation">
            <select
              multiple={false}
              value={filters.operators[0] ?? ""}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  operators: event.target.value ? [event.target.value] : [],
                }))
              }
              className="w-full rounded-sm border border-input bg-background/70 px-2 py-1.5 font-mono text-xs text-foreground outline-none focus:border-ring"
            >
              <option value="">All operators</option>
              {operators.map((operator) => (
                <option key={operator} value={operator}>
                  {operator}
                </option>
              ))}
            </select>
          </FilterRow>
        ) : null}
      </div>

      {notice ? (
        <p className="border-b border-panel-border bg-warning/10 px-3 py-2 text-[11px] leading-snug text-warning">
          {notice}
        </p>
      ) : null}

      <div className="flex items-center justify-between px-3 py-2">
        <span className="label-caps">Results</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {isLoading ? "loading…" : results.length.toLocaleString()}
        </span>
      </div>

      <ul className="scan-scroll min-h-0 flex-1 overflow-y-auto border-t border-panel-border">
        {results.slice(0, 300).map((object) => {
          const active = object.noradId === selectedNoradId;
          return (
            <li key={object.id}>
              <button
                type="button"
                onClick={() => selectObject(active ? null : object.noradId)}
                className={`flex w-full items-center gap-2 border-b border-border/50 px-3 py-2 text-left transition-colors ${
                  active ? "bg-primary/15" : "hover:bg-secondary/60"
                }`}
              >
                <span
                  className={`size-2 shrink-0 rounded-full ${REGIME_DOT[object.orbit.regime]}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">
                    {object.name}
                  </span>
                  <span className="block truncate font-mono text-[10px] text-muted-foreground">
                    {object.noradId} · {object.orbit.regime} ·{" "}
                    {object.constellation ?? object.objectType}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {!isLoading && results.length === 0 ? (
          <li className="px-3 py-6 text-center text-xs text-muted-foreground">
            No objects match the current filters.
          </li>
        ) : null}
        {results.length > 300 ? (
          <li className="px-3 py-2 text-center font-mono text-[10px] text-muted-foreground">
            Showing first 300 of {results.length.toLocaleString()} — refine filters
          </li>
        ) : null}
      </ul>
    </section>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label-caps mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[10px] tracking-wider transition-colors ${
        active
          ? "border-primary/70 bg-primary/20 text-foreground"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
