import Link from "next/link";
import { Star, CheckCircle2, ChevronRight } from "lucide-react";

interface NearbyCustomer {
  name: string;
  slug: string;
  citySlug: string | null;
  reviews: { overallScore: number }[];
}

interface NearbyListing {
  name: string;
  slug: string;
  citySlug: string;
  category: string | null;
}

interface Props {
  customers: NearbyCustomer[];
  listings: NearbyListing[];
  cityName: string;
}

export default function NearbyStrip({ customers, listings, cityName }: Props) {
  const total = customers.length + listings.length;
  if (total === 0) return null;

  return (
    <section className="mt-12 lg:mt-16 space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">Autres commerces à {cityName}</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{total} établissements à proximité</p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory -mx-4 px-4 lg:-mx-0 lg:px-0">
        {customers.map((b) => {
          const avg =
            b.reviews.length > 0
              ? (b.reviews.reduce((s, r) => s + r.overallScore, 0) / b.reviews.length).toFixed(1)
              : null;
          return (
            <Link
              key={`c-${b.slug}`}
              href={b.citySlug ? `/avis/${b.citySlug}/${b.slug}` : `/r/${b.slug}`}
              className="snap-start shrink-0 w-64 sm:w-72 bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden hover:shadow-md hover:border-[var(--color-border-hover)] transition-all group"
            >
              <div className="h-28 bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-700)] relative">
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 30% 40%, rgba(255,255,255,.4) 0, transparent 50%)",
                  }}
                />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Certifié
                </div>
                <div className="absolute bottom-3 left-3 w-12 h-12 rounded-xl bg-white border border-[var(--color-border)] flex items-center justify-center text-xl font-black text-[var(--color-brand-600)] shadow">
                  {b.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="p-4">
                <div className="font-bold text-sm leading-tight truncate">{b.name}</div>
                {avg ? (
                  <div className="text-xs text-yellow-700 font-bold mt-1 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" /> {avg}
                    <span className="text-[var(--color-text-muted)] font-medium">· {b.reviews.length} {b.reviews.length > 1 ? "avis" : "avis"}</span>
                  </div>
                ) : (
                  <div className="text-xs text-[var(--color-text-muted)] mt-1 italic">Aucun avis encore</div>
                )}
              </div>
            </Link>
          );
        })}

        {listings.map((l) => (
          <Link
            key={`l-${l.slug}`}
            href={`/avis/${l.citySlug}/${l.slug}`}
            className="snap-start shrink-0 w-64 sm:w-72 bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden hover:shadow-md hover:border-[var(--color-border-hover)] transition-all group"
          >
            <div className="h-28 bg-gradient-to-br from-[var(--color-bg-muted)] to-[var(--color-bg-subtle)] relative border-b border-[var(--color-border)]">
              <div className="absolute bottom-3 left-3 w-12 h-12 rounded-xl bg-white border border-[var(--color-border)] flex items-center justify-center text-xl font-black text-[var(--color-text-muted)] shadow">
                {l.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="p-4 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-sm leading-tight truncate">{l.name}</div>
                {l.category && <div className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{l.category}</div>}
                <div className="text-[10px] text-[var(--color-text-muted)] mt-1 italic">Pas encore certifié</div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
