interface Props {
  lat: number | null;
  lng: number | null;
  address: string | null;
  city: string | null;
  name: string;
}

export default function BusinessMapPreview({ lat, lng, address, city, name }: Props) {
  const query = encodeURIComponent([name, address, city].filter(Boolean).join(", "));
  const mapsUrl = lat && lng
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${query}`;

  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
      <div className="h-32 relative bg-gradient-to-br from-[var(--color-brand-100)] to-[var(--color-brand-50)] overflow-hidden">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(45deg, transparent 48%, var(--color-border-hover) 48%, var(--color-border-hover) 52%, transparent 52%)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
          <div className="w-9 h-9 rounded-full bg-[var(--color-brand-600)] border-4 border-white shadow-lg flex items-center justify-center">
            <span className="text-white text-xs font-black">{name.charAt(0).toUpperCase()}</span>
          </div>
        </div>
      </div>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full py-3 text-xs font-bold text-[var(--color-brand-600)] hover:bg-[var(--color-brand-50)] transition-colors text-center"
      >
        Itinéraire ↗
      </a>
    </div>
  );
}
