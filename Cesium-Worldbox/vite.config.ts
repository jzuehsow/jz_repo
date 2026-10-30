// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { fileURLToPath } from "node:url";

import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const satelliteWasmStub = fileURLToPath(
  new URL("./src/lib/satellite-wasm-stub.ts", import.meta.url),
);

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: [
        // satellite.js ships optional emscripten WASM runtimes that use top-level
        // await; we only use its JS SGP4 path, so stub them out.
        { find: "#wasm-single-thread", replacement: satelliteWasmStub },
        { find: "#wasm-multi-thread", replacement: satelliteWasmStub },
      ],
    },
  },
});
