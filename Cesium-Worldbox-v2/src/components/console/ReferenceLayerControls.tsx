import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { LayerCategory, LayerDefinition } from "@/layers/LayerDefinition";
import type { LayersState } from "@/state/useLayers";

const SECTIONS: Array<{ category: LayerCategory; title: string }> = [
  { category: "SPACE", title: "Space" },
  { category: "TRANSPORTATION", title: "Transportation" },
  { category: "MAP_LABELS", title: "Map labels" },
];

function Row({ layer, layers, child }: { layer: LayerDefinition; layers: LayersState; child?: boolean }) {
  const enabled = layers.enabledIds.has(layer.id);
  const parentOff = layer.parentId ? !layers.enabledIds.has(layer.parentId) : false;
  const status = layers.statuses[layer.id];
  return (
    <div className={child ? "pl-5" : "rounded-sm border border-border/60 bg-card/50 px-2.5 py-2"}>
      <label className={`flex items-start gap-2 ${parentOff ? "opacity-40" : ""}`}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={parentOff}
          onChange={() => layers.toggleLayer(layer.id)}
          className="mt-0.5 size-3.5 accent-[var(--color-primary)]"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-medium text-foreground">{layer.name}</span>
          {!child ? (
            <span className="block text-[10px] leading-snug text-muted-foreground">{layer.description}</span>
          ) : null}
        </span>
      </label>
      {!child && enabled && status && status.kind !== "idle" ? (
        <p
          className={`mt-1 pl-5 font-mono text-[10px] ${
            status.kind === "error" ? "text-destructive" : status.kind === "active" ? "text-success" : "text-muted-foreground"
          }`}
        >
          {status.kind === "loading" ? "Loading…" : (status.message ?? status.kind)}
        </p>
      ) : null}
      {!child && enabled && layer.attribution ? (
        <p className="mt-0.5 pl-5 text-[9px] leading-snug text-muted-foreground">{layer.attribution}</p>
      ) : null}
    </div>
  );
}

/** SPACE / TRANSPORTATION / MAP LABELS sections; children grey out while their parent is off. */
export function ReferenceLayerControls({ layers, only }: { layers: LayersState; only: LayerCategory[] }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  return (
    <>
      {SECTIONS.filter((s) => only.includes(s.category)).map(({ category, title }) => {
        const defs = layers.definitions.filter((l) => l.category === category);
        const parents = defs.filter((l) => !l.parentId);
        const isCollapsed = collapsed[category] ?? false;
        return (
          <div key={category} className="space-y-1.5">
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [category]: !isCollapsed }))}
              aria-expanded={!isCollapsed}
              className="flex w-full items-center gap-1 text-left"
            >
              {isCollapsed ? <ChevronRight className="size-3" aria-hidden /> : <ChevronDown className="size-3" aria-hidden />}
              <span className="label-caps text-[9px]">{title}</span>
            </button>
            {isCollapsed
              ? null
              : parents.map((parent) => {
                  const children = defs.filter((l) => l.parentId === parent.id);
                  return (
                    <div key={parent.id} className="space-y-1">
                      <Row layer={parent} layers={layers} />
                      {children.length ? (
                        <div className="grid grid-cols-2 gap-x-1 gap-y-1">
                          {children.map((c) => (
                            <Row key={c.id} layer={c} layers={layers} child />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
          </div>
        );
      })}
    </>
  );
}
