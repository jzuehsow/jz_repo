import { Pause, Play, SkipBack } from "lucide-react";

import { formatUtc, relativeToNow } from "@/lib/format";
import { MAX_HORIZON_MS, SPEED_OPTIONS, useSimulation } from "@/state/simulationStore";

export function TimeControls() {
  const {
    simTimeMs,
    offsetMs,
    isPlaying,
    speed,
    isEstimate,
    togglePlaying,
    setSpeed,
    setOffsetMs,
    resetToNow,
  } = useSimulation();

  const simDate = new Date(simTimeMs);
  const days = offsetMs / 86_400_000;

  return (
    <footer className="panel-surface pointer-events-auto flex flex-col gap-2 rounded-md px-3 py-2.5 md:flex-row md:items-center md:gap-4 md:px-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlaying}
          aria-label={isPlaying ? "Pause simulation" : "Play simulation"}
          className="flex size-9 items-center justify-center rounded-sm bg-primary/90 text-primary-foreground transition-colors hover:bg-primary"
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <button
          type="button"
          onClick={resetToNow}
          className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-2 font-mono text-[11px] tracking-widest text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
        >
          <SkipBack className="size-3.5" />
          NOW
        </button>
      </div>

      <div className="flex items-center gap-1 rounded-sm border border-border bg-secondary/40 p-0.5">
        {SPEED_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setSpeed(option)}
            aria-pressed={speed === option}
            className={`rounded-sm px-2 py-1 font-mono text-[10px] tracking-wider transition-colors ${
              speed === option
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option}×
          </button>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="label-caps">Simulation time · now → +30 days</span>
          <span
            className={`font-mono text-[11px] tabular-nums ${isEstimate ? "text-warning" : "text-primary"}`}
          >
            {formatUtc(simDate)} · {relativeToNow(simDate)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={MAX_HORIZON_MS}
          step={60_000}
          value={offsetMs}
          onChange={(event) => setOffsetMs(Number(event.target.value))}
          aria-label="Simulation time offset from now"
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
        />
        <div className="mt-1 flex justify-between font-mono text-[9px] tracking-widest text-muted-foreground">
          <span>NOW</span>
          <span>+{days.toFixed(1)} D</span>
          <span>+30 D</span>
        </div>
      </div>

      <p className="max-w-[16rem] font-mono text-[9px] leading-snug tracking-wider text-muted-foreground uppercase">
        {isEstimate
          ? "Future states are SGP4 propagated estimates, not observations."
          : "Positions are SGP4 estimates from published mean elements."}
      </p>
    </footer>
  );
}
