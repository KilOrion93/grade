import { Phone, Globe, MapPin } from "lucide-react";

interface Props {
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
}

export default function BusinessContactCard({ phone, website, address, city }: Props) {
  if (!phone && !website && !address && !city) return null;

  return (
    <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5 space-y-3">
      <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Contact</h3>

      {phone && (
        <a href={`tel:${phone}`} className="flex items-center gap-3 text-sm hover:text-[var(--color-brand-600)] transition-colors group">
          <span className="w-9 h-9 rounded-lg bg-[var(--color-brand-50)] flex items-center justify-center text-[var(--color-brand-600)] group-hover:bg-[var(--color-brand-100)] transition-colors shrink-0">
            <Phone className="w-4 h-4" />
          </span>
          <span className="font-semibold truncate">{phone}</span>
        </a>
      )}

      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 text-sm hover:text-[var(--color-brand-600)] transition-colors group"
        >
          <span className="w-9 h-9 rounded-lg bg-[var(--color-brand-50)] flex items-center justify-center text-[var(--color-brand-600)] group-hover:bg-[var(--color-brand-100)] transition-colors shrink-0">
            <Globe className="w-4 h-4" />
          </span>
          <span className="font-semibold truncate">
            {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </span>
        </a>
      )}

      {(address || city) && (
        <div className="flex items-start gap-3 text-sm">
          <span className="w-9 h-9 rounded-lg bg-[var(--color-brand-50)] flex items-center justify-center text-[var(--color-brand-600)] shrink-0">
            <MapPin className="w-4 h-4" />
          </span>
          <span className="font-semibold leading-tight pt-1.5">
            {address || city}
            {address && city && (
              <>
                <br />
                <span className="text-xs text-[var(--color-text-muted)] font-medium">{city}</span>
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
