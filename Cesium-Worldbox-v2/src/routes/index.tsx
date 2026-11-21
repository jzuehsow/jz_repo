import { createFileRoute } from "@tanstack/react-router";

import { WorldboxConsole } from "@/components/console/WorldboxConsole";
import { SimulationProvider } from "@/state/simulationStore";

export const Route = createFileRoute("/")({
  // Cesium is WebGL-only: render the console on the client exclusively.
  ssr: false,
  head: () => ({
    meta: [
      { title: "Cesium Worldbox — Space Domain Visualization Console" },
      {
        name: "description",
        content:
          "Track ~900 active satellites on a 3D/2D Cesium globe with SGP4 propagation, UTC time simulation to +30 days, search, filters and per-object orbit details.",
      },
      { property: "og:title", content: "Cesium Worldbox — Space Domain Visualization Console" },
      {
        property: "og:description",
        content:
          "Operational space-domain-awareness console: SGP4-propagated satellite catalog, orbit tracks, and UTC time simulation on a Cesium globe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: "/cesium/Widgets/widgets.css" }],
  }),
  component: WorldboxPage,
});

function WorldboxPage() {
  return (
    <SimulationProvider>
      <main>
        <h1 className="sr-only">Cesium Worldbox space domain visualization console</h1>
        <WorldboxConsole />
      </main>
    </SimulationProvider>
  );
}
