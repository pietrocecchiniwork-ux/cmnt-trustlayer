interface Props {
  lat: number;
  lng: number;
  size?: number;
}

/**
 * Static OpenStreetMap thumbnail for a single GPS coordinate.
 * Uses staticmap.openstreetmap.de — no API key required, CORS-friendly.
 */
export function GpsMapThumb({ lat, lng, size = 48 }: Props) {
  // Fallback uses Leaflet-style static tile approach via wikimedia
  const zoom = 17;
  // Compute single tile coords
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
      className="block flex-shrink-0 relative border border-foreground/20 hover:opacity-80 transition-opacity"
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt="map"
        loading="lazy"
        className="w-full h-full object-cover"
        onError={(e) => {
          // Hide broken tile, show coordinates instead
          (e.currentTarget.parentElement as HTMLElement).innerHTML =
            `<div class="w-full h-full flex items-center justify-center font-mono text-[8px] text-foreground/40 leading-tight text-center px-1">${lat.toFixed(3)}<br/>${lng.toFixed(3)}</div>`;
        }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-destructive text-[14px] leading-none drop-shadow">
        ⊙
      </span>
    </a>
  );
}
