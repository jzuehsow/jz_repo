import { createFileRoute } from "@tanstack/react-router";

import type { VesselTrack } from "@/maritime/models/VesselObject";
import { categorize, flagFromMmsi } from "@/maritime/services/vesselMetadataService";

/**
 * Optional AISStream.io relay. Returns 501 unless AISSTREAM_API_KEY is set, so
 * the app works without it. Opens the stream briefly for the requested bounds
 * and returns a de-duplicated snapshot; the key never reaches the browser.
 */
const COLLECT_MS = 5_000;

interface AisMessage {
  MessageType?: string;
  MetaData?: { MMSI?: number; ShipName?: string; latitude?: number; longitude?: number; time_utc?: string };
  Message?: {
    PositionReport?: { Sog?: number; Cog?: number; TrueHeading?: number; NavigationalStatus?: number };
    ShipStaticData?: {
      Name?: string; CallSign?: string; ImoNumber?: number; Type?: number; Destination?: string;
      MaximumStaticDraught?: number; Dimension?: { A?: number; B?: number; C?: number; D?: number };
    };
  };
}

export const Route = createFileRoute("/api/vessels")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const key = process.env["AISSTREAM_API_KEY"];
        if (!key) return Response.json({ error: "AISSTREAM_API_KEY not configured" }, { status: 501 });
        const url = new URL(request.url);
        const n = (name: string) => Number(url.searchParams.get(name));
        const west = n("west"), south = n("south"), east = n("east"), north = n("north");
        const limit = Math.max(10, Math.min(3000, n("limit") || 2000));
        if (![west, south, east, north].every(Number.isFinite) || Math.abs(south) > 90 || Math.abs(north) > 90) {
          return Response.json({ error: "Invalid bounds" }, { status: 400 });
        }

        const vessels = new Map<number, VesselTrack>();
        await new Promise<void>((resolve) => {
          let socket: WebSocket;
          try {
            socket = new WebSocket("wss://stream.aisstream.io/v0/stream");
          } catch {
            resolve();
            return;
          }
          const done = setTimeout(() => {
            try { socket.close(); } catch { /* ignore */ }
            resolve();
          }, COLLECT_MS);
          socket.addEventListener("open", () => {
            socket.send(JSON.stringify({
              APIKey: key,
              BoundingBoxes: [[[south, west], [north, east]]],
              FilterMessageTypes: ["PositionReport", "ShipStaticData"],
            }));
          });
          socket.addEventListener("message", async (event) => {
            const text = typeof event.data === "string" ? event.data : await new Response(event.data as Blob).text();
            let msg: AisMessage;
            try { msg = JSON.parse(text) as AisMessage; } catch { return; }
            const meta = msg.MetaData;
            const mmsi = meta?.MMSI;
            if (!mmsi || typeof meta.latitude !== "number" || typeof meta.longitude !== "number") return;
            const existing = vessels.get(mmsi);
            const track: VesselTrack = existing ?? {
              object: { mmsi, category: "UNKNOWN", flag: flagFromMmsi(mmsi), name: meta.ShipName?.trim() || undefined },
              state: { mmsi, latitudeDeg: meta.latitude, longitudeDeg: meta.longitude, observedAtMs: Date.now(), source: "AISStream.io" },
            };
            const pos = msg.Message?.PositionReport;
            if (pos) {
              track.state = {
                ...track.state,
                latitudeDeg: meta.latitude,
                longitudeDeg: meta.longitude,
                speedKn: pos.Sog,
                courseDeg: pos.Cog !== undefined && pos.Cog < 360 ? pos.Cog : undefined,
                headingDeg: pos.TrueHeading !== undefined && pos.TrueHeading < 360 ? pos.TrueHeading : undefined,
                navStatus: pos.NavigationalStatus,
                observedAtMs: meta.time_utc ? Date.parse(meta.time_utc) || Date.now() : Date.now(),
              };
            }
            const stat = msg.Message?.ShipStaticData;
            if (stat) {
              const d = stat.Dimension ?? {};
              const name = stat.Name?.trim() || track.object.name;
              track.object = {
                ...track.object,
                name,
                callsign: stat.CallSign?.trim() || undefined,
                imo: stat.ImoNumber || undefined,
                shipTypeCode: stat.Type,
                category: categorize(stat.Type, name),
                destination: stat.Destination?.trim() || undefined,
                draughtM: stat.MaximumStaticDraught || undefined,
                lengthM: (d.A ?? 0) + (d.B ?? 0) || undefined,
                beamM: (d.C ?? 0) + (d.D ?? 0) || undefined,
              };
            }
            vessels.set(mmsi, track);
            if (vessels.size >= limit) {
              clearTimeout(done);
              try { socket.close(); } catch { /* ignore */ }
              resolve();
            }
          });
          socket.addEventListener("error", () => {
            clearTimeout(done);
            resolve();
          });
        });

        return Response.json({ vessels: [...vessels.values()] }, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
