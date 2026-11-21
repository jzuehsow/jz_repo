/**
 * Keys of airports/ports currently drawn by a selected-object overlay, so the
 * general reference layers can skip them instead of drawing duplicates.
 */
type Listener = () => void;
const keys = { airport: new Set<string>(), port: new Set<string>() };
const listeners = new Set<Listener>();

export const selectionHighlights = {
  set(kind: "airport" | "port", values: Array<string | undefined>) {
    const next = new Set(values.filter((v): v is string => Boolean(v)).map((v) => v.toUpperCase()));
    const current = keys[kind];
    if (next.size === current.size && [...next].every((v) => current.has(v))) return;
    keys[kind] = next;
    for (const listener of listeners) listener();
  },
  has(kind: "airport" | "port", value: string) {
    return keys[kind].has(value.toUpperCase());
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
