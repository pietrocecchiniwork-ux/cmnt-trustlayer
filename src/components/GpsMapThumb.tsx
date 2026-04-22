import { useState } from "react";

interface Props {
  lat: number;
  lng: number;
  size?: number;
}

/**
 * Static OpenStreetMap thumbnail for a single GPS coordinate.
 * Shows a skeleton placeholder while the tile loads, and falls back
 * to plain coordinates if the tile fails to load.
 */
export function GpsMapThumb({ lat, lng, size = 48 }: Props) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  const zoom = 17;
  const x = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  );
  const src = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
  const link = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title={`${lat.toFixed(5)}, ${lng.toFixed(5)} — open in maps`}
      className="block flex-shrink-0 relative border border-foreground/20 hover:opacity-80 transition-opacity overflow-hidden bg-muted"
      style={{ width: size, height: size }}
    >
      {status === "loading" && (
        <div
          className="absolute inset-0 bg-muted animate-pulse"
          aria-label="loading map"
        />
      )}

      {status === "error" ? (
        <div className="w-full h-full flex items-center justify-center font-mono text-[8px] text-foreground/40 leading-tight text-center px-1">
          {lat.toFixed(3)}
          <br />
          {lng.toFixed(3)}
        </div>
      ) : (
        <img
          src={src}
          alt="map"
          loading="lazy"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            status === "loaded" ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {status !== "error" && (
        <span className="absolute inset-0 flex items-center justify-center text-destructive text-[14px] leading-none drop-shadow pointer-events-none">
          ⊙
        </span>
      )}
    </a>
  );
}
