import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

import { formatUtc } from "@/lib/format";
import type { WeatherState } from "@/weather/state/useWeather";

export function WeatherTimeControl({ weather }: { weather: WeatherState }) {
  const { commonFrames, effectiveTimeMs } = weather;
  if (commonFrames.length === 0 || effectiveTimeMs === null) return null;
  const offsetH = Math.round((effectiveTimeMs - Date.now()) / 3_600_000);
  const offset = offsetH <= 0 ? "Now" : `+${offsetH}h`;
  const index = commonFrames.indexOf(effectiveTimeMs);
  const btn =
    "rounded-sm border border-border p-1 text-muted-foreground transition-colors hover:text-foreground";
  return (
    <div className="space-y-1.5 rounded-sm border border-primary/40 bg-card/60 p-2">
      <div className="flex items-center justify-between">
        <p className="label-caps text-[9px]">Weather time</p>
        <span className="font-mono text-[10px] text-primary">{offset}</span>
      </div>
      <p className="font-mono text-[10px] text-foreground">{formatUtc(new Date(effectiveTimeMs))}</p>
      <input
        type="range"
        min={0}
        max={commonFrames.length - 1}
        value={Math.max(0, index)}
        onChange={(event) => weather.setTime(commonFrames[Number(event.target.value)]!)}
        aria-label="Weather forecast frame"
        className="w-full accent-[var(--color-primary)]"
      />
      <div className="flex items-center gap-1">
        <button type="button" className={btn} aria-label="Previous frame" onClick={() => weather.step(-1)}>
          <ChevronLeft className="size-3" />
        </button>
        <button
          type="button"
          className={btn}
          aria-label={weather.playing ? "Pause" : "Play"}
          onClick={() => weather.setPlaying(!weather.playing)}
        >
          {weather.playing ? <Pause className="size-3" /> : <Play className="size-3" />}
        </button>
        <button type="button" className={btn} aria-label="Next frame" onClick={() => weather.step(1)}>
          <ChevronRight className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => {
            weather.setPlaying(false);
            weather.setTime(null);
          }}
          className="ml-auto rounded-sm border border-border px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-muted-foreground hover:text-foreground"
        >
          CURRENT
        </button>
      </div>
      <p className="text-[9px] leading-snug text-muted-foreground">
        Hourly model frames supplied by the provider · independent of the satellite clock.
      </p>
    </div>
  );
}
