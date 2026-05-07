import Image from "next/image";

interface Photo {
  id: string;
  url: string;
}

interface Props {
  photos: Photo[];
  name: string;
}

export default function BusinessHero({ photos, name }: Props) {
  if (photos.length === 0) {
    return (
      <div className="relative h-48 sm:h-64 lg:h-80 overflow-hidden bg-gradient-to-br from-[var(--color-brand-600)] via-[var(--color-brand-500)] to-[var(--color-brand-700)]">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(255,255,255,.4) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,.3) 0, transparent 40%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </div>
    );
  }

  const cols = photos.length === 1 ? "grid-cols-1" : photos.length === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className="relative h-48 sm:h-64 lg:h-80 overflow-hidden">
      <div className={`absolute inset-0 grid h-full w-full gap-px bg-[var(--color-border)] ${cols}`}>
        {photos.slice(0, 3).map((photo, i) => (
          <div key={photo.id} className="relative overflow-hidden bg-[var(--color-bg-muted)]">
            <Image
              src={photo.url}
              alt={name}
              fill
              priority={i === 0}
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none" />
      {photos.length > 3 && (
        <a
          href="#photos"
          className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur text-white text-xs font-bold flex items-center gap-1.5 hover:bg-black/70 transition-colors"
        >
          📷 {photos.length} photos
        </a>
      )}
    </div>
  );
}
