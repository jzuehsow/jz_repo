import { createFileRoute } from "@tanstack/react-router";

/**
 * Same-origin relay for public ADS-B feeds. The feeds do not send CORS headers,
 * so the browser cannot call them directly. Keeping this a thin, dependency-free
 * relay preserves portability: any host that can run the app also serves it, and
 * a different deployment can point VITE_AIRCRAFT_API_BASE_URL elsewhere instead.
 */
const UPSTREAMS: Record<string, string> = {
  "adsb.lol": "https://api.adsb.lol/v2",
  "airplanes.live": "https://api.airplanes.live/v2",
};

export const Route = createFileRoute("/api/aircraft")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const source = url.searchParams.get("source") ?? "adsb.lol";
        const base = UPSTREAMS[source];
        const lat = Number(url.searchParams.get("lat"));
        const lon = Number(url.searchParams.get("lon"));
        const radiusNm = Number(url.searchParams.get("radiusNm"));

        if (!base) {
          return Response.json({ error: `Unknown aircraft source "${source}"` }, { status: 400 });
        }
        if (
          !Number.isFinite(lat) ||
          Math.abs(lat) > 90 ||
          !Number.isFinite(lon) ||
          Math.abs(lon) > 180 ||
          !Number.isFinite(radiusNm)
        ) {
          return Response.json({ error: "Invalid lat/lon/radiusNm" }, { status: 400 });
        }

        const clampedRadius = Math.max(1, Math.min(250, Math.round(radiusNm)));
        const upstream = `${base}/point/${lat.toFixed(4)}/${lon.toFixed(4)}/${clampedRadius}`;

        try {
          const response = await fetch(upstream, {
            headers: {
              accept: "application/json",
              // Some community feeds reject requests without an identifying agent.
              "user-agent": "CesiumWorldbox/1.0 (space-situational-awareness demo)",
            },
            signal: AbortSignal.timeout(7_000),
          });
          if (!response.ok) {
            const body = await response.text();
            console.error(`[aircraft] ${source} responded ${response.status}: ${body.slice(0, 300)}`);
            return Response.json(
              { error: `${source} responded ${response.status}` },
              { status: response.status },
            );
          }
          const payload: unknown = await response.json();
          return Response.json(payload, {
            headers: { "cache-control": "no-store" },
          });
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : "Aircraft feed unreachable";
          console.error(`[aircraft] ${source} request failed: ${message}`);
          return Response.json({ error: message }, { status: 502 });
        }
      },
    },
  },
});
