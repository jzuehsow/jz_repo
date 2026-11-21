import { AlertTriangle, X } from "lucide-react";

import type { WeatherAlert } from "@/weather/models/WeatherFrame";

const fmt = (iso?: string) => (iso ? new Date(iso).toISOString().replace("T", " ").slice(0, 16) + " UTC" : "—");

export function WeatherAlertPopup({ alert, onClose }: { alert: WeatherAlert; onClose: () => void }) {
  return (
    <section className="panel-surface pointer-events-auto w-[20rem] max-w-full space-y-2 rounded-md p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 text-warning" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{alert.event}</p>
          <p className="font-mono text-[10px] text-muted-foreground">Severity: {alert.severity}</p>
        </div>
        <button type="button" aria-label="Close alert" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <dl className="grid grid-cols-[5rem_1fr] gap-x-2 gap-y-0.5 font-mono text-[10px]">
        <dt className="text-muted-foreground">Effective</dt>
        <dd className="text-foreground">{fmt(alert.effective)}</dd>
        <dt className="text-muted-foreground">Expires</dt>
        <dd className="text-foreground">{fmt(alert.expires)}</dd>
        <dt className="text-muted-foreground">Issued by</dt>
        <dd className="text-foreground">{alert.senderName ?? "—"}</dd>
      </dl>
      {alert.areaDesc ? <p className="line-clamp-3 text-[10px] text-muted-foreground">{alert.areaDesc}</p> : null}
      {alert.description ? (
        <p className="max-h-32 overflow-y-auto text-[11px] leading-snug text-foreground/90">{alert.description}</p>
      ) : null}
      <p className="text-[9px] text-muted-foreground">Source: NOAA / National Weather Service</p>
    </section>
  );
}
