/**
 * Stub for satellite.js's optional WASM runtimes (`#wasm-single-thread` /
 * `#wasm-multi-thread`). The app only uses the pure-JS SGP4 path, and the
 * emscripten pthreads bundle uses top-level await inside a worker, which
 * cannot be bundled for the IIFE worker output format.
 */
export default function createWasmModuleStub(): Promise<never> {
  return Promise.reject(new Error("satellite.js WASM runtime is disabled in this build"));
}
