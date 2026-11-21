import { Globe2, Map as MapIcon, Orbit, RotateCcw } from "lucide-react";

import { formatUtcDate, formatUtcTime } from "@/lib/format";
import { useSimulation } from "@/state/simulationStore";

interface TopBarProps {
  objectCount: number;
  visibleCount: number;
  providerLabel: string;
  degraded: boolean;
  onResetView: () => void;
}

export function TopBar({
  objectCount,
  visibleCount,
  providerLabel,
  degraded,
  onResetView,
}: TopBarProps) {
  const { simTimeMs, sceneMode, setSceneMode, isEstimate } = useSimulation();
  const simDate = new Date(simTimeMs);

  return (
    <header className="panel-surface pointer-events-auto flex flex-wrap items-center gap-3 rounded-md px-3 py-2 md:gap-5 md:px-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-sm bg-primary/15 text-primary">
          <Orbit className="size-4.5" aria-hidden />
        </span>
        <div className="leading-tight">
          <h1 className="text-sm font-semibold tracking-[0.18em] uppercase">Cesium Worldbox</h1>
          <p className="label-caps">Space Domain Visualization</p>
        </div>
      </div>

      <div className="hidden h-8 w-px bg-border md:block" />

      <div className="flex items-center gap-1 rounded-sm border border-border bg-secondary/50 p-0.5">
        {(["3D", "2D"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setSceneMode(mode)}
            aria-pressed={sceneMode === mode}
            className={`flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-mono text-[11px] tracking-widest transition-colors ${
              sceneMode === mode
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {mode === "3D" ? <Globe2 className="size-3.5" /> : <MapIcon className="size-3.5" />}
            {mode}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onResetView}
        className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 font-mono text-[11px] tracking-widest text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
      >
        <RotateCcw className="size-3.5" />
        RESET VIEW
      </button>

      <div className="ml-auto flex items-center gap-4">
        <div className="hidden text-right sm:block">
          <p className="label-caps">Catalog · {providerLabel}</p>
          <p className="font-mono text-xs text-foreground">
            {visibleCount.toLocaleString()} / {objectCount.toLocaleString()} objects
            {degraded ? <span className="ml-2 text-warning">SAMPLE</span> : null}
          </p>
        </div>
        <div className="text-right">
          <p className="label-caps">{isEstimate ? "Propagated Estimate · UTC" : "UTC"}</p>
          <p
            className={`font-mono text-lg leading-tight tabular-nums ${
              isEstimate ? "text-warning" : "text-primary"
            }`}
          >
            {formatUtcTime(simDate)}
          </p>
          <p className="label-caps">{formatUtcDate(simDate)}</p>
        </div>
      </div>
    </header>
  );
}
