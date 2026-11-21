import { createFileRoute } from "@tanstack/react-router";

/**
 * Same-origin relay for the open ADSB.lol / adsb.im route database (ODbL).
 * Accepts one callsign + position and forwards it; nothing is stored.
 */
const UPSTREAM =
  process.env["AIRCRAFT_ROUTE_UPSTREAM"] ?? "https://adsb.im/api/0/routeset";

export const Route = createFileRoute("/api/aircraft-route")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { callsign?: unknown; lat?: unknown; lon?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const callsign = typeof body.callsign === "string" ? body.callsign.trim().toUpperCase() : "";
        const lat = Number(body.lat);
        const lon = Number(body.lon);
        if (!/^[A-Z0-9]{2,8}$/.test(callsign) || !Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lon) || Math.abs(lon) > 180) {
          return Response.json({ error: "Invalid callsign/lat/lon" }, { status: 400 });
        }
        try {
          const response = await fetch(UPSTREAM, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "user-agent": "CesiumWorldbox/1.0 (space-situational-awareness demo)",
            },
            body: JSON.stringify({ planes: [{ callsign, lat, lng: lon }] }),
            signal: AbortSignal.timeout(7_000),
          });
          const text = await response.text();
          if (!response.ok) {
            return Response.json({ error: `Route source responded ${response.status}` }, { status: 502 });
          }
          return new Response(text.trim() ? text : "[]", {
            headers: { "content-type": "application/json", "cache-control": "public, max-age=900" },
          });
        } catch {
          return Response.json({ error: "Route source unreachable" }, { status: 502 });
        }
      },
    },
  },
});
