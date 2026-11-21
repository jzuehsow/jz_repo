/** Shared, cached loader for bundled static JSON datasets under /data. */
const cache = new Map<string, Promise<unknown>>();

export function loadStaticJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let pending = cache.get(path);
  if (!pending) {
    pending = fetch(path).then((response) => {
      if (!response.ok) throw new Error(`Dataset unavailable (${response.status})`);
      return response.json();
    });
    pending.catch(() => cache.delete(path));
    cache.set(path, pending);
  }
  if (!signal) return pending as Promise<T>;
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
    if (signal.aborted) return onAbort();
    signal.addEventListener("abort", onAbort, { once: true });
    (pending as Promise<T>).then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}
