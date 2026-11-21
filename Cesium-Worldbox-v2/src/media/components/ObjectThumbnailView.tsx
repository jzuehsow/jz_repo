import { useState } from "react";
import { ImageOff, Info } from "lucide-react";

import type { ObjectThumbnail } from "@/media/models/ObjectThumbnail";

interface ObjectThumbnailViewProps {
  thumbnail: ObjectThumbnail | null;
}

/**
 * 16:9 thumbnail frame. Renders only where an object is already selected, so
 * no image work happens for globe-wide catalogs. Independent of Cesium.
 */
export function ObjectThumbnailView({ thumbnail }: ObjectThumbnailViewProps) {
  const [failed, setFailed] = useState(false);
  const [showCredit, setShowCredit] = useState(false);

  if (!thumbnail) return null;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-sm border border-border/70 bg-card/70">
      {failed ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
          <ImageOff className="size-5" aria-hidden />
          <span className="font-mono text-[10px] tracking-wider uppercase">Image unavailable</span>
        </div>
      ) : (
        <img
          src={thumbnail.imagePath}
          alt={thumbnail.altText}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-background/90 to-transparent px-2 py-1.5">
        <span className="truncate font-mono text-[10px] tracking-wider text-foreground/90 uppercase">
          {thumbnail.modelFamily}
        </span>
        <button
          type="button"
          aria-label="Image source and licence"
          aria-expanded={showCredit}
          onClick={() => setShowCredit((previous) => !previous)}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Info className="size-3.5" />
        </button>
      </div>

      {showCredit ? (
        <div className="absolute inset-0 flex flex-col justify-center gap-1 bg-background/95 p-2.5 text-left">
          <p className="text-[10px] leading-snug text-foreground">{thumbnail.attribution}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{thumbnail.license}</p>
          <a
            href={thumbnail.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="truncate font-mono text-[10px] text-primary underline-offset-2 hover:underline"
          >
            {thumbnail.sourceName}
          </a>
          {thumbnail.remote ? (
            <p className="font-mono text-[10px] text-warning">Remote asset · not yet cached</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
