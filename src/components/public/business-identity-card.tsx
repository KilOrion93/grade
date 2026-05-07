import Image from "next/image";
import { MapPin, CheckCircle2, Phone, Globe } from "lucide-react";

interface Props {
  name: string;
  logoUrl: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  isCustomer: boolean;
  hasHero: boolean;
}

export default function BusinessIdentityCard({ name, logoUrl, address, city, phone, website, isCustomer, hasHero }: Props) {
  return (
    <div
      className={`bg-white rounded-3xl border border-[var(--color-border)] shadow-xl p-5 sm:p-6 lg:p-8 ${
        hasHero ? "-mt-12 sm:-mt-14 lg:-mt-16 relative" : ""
      }`}
    >
      <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
        {logoUrl ? (
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-[var(--color-border)] shadow shrink-0 relative ring-4 ring-white -mt-12 sm:mt-0 mx-auto sm:mx-0">
            <Image src={logoUrl} alt={name} fill className="object-cover" sizes="96px" />
          </div>
        ) : (
          <div
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shrink-0 flex items-center justify-center text-3xl sm:text-4xl font-black border shadow ring-4 ring-white -mt-12 sm:mt-0 mx-auto sm:mx-0 ${
              isCustomer
                ? "bg-[var(--color-brand-50)] text-[var(--color-brand-600)] border-[var(--color-brand-200)]"
                : "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] border-[var(--color-border)]"
            }`}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">{name}</h1>

          {(address || city) && (
            <p className="text-[var(--color-text-secondary)] text-sm sm:text-base mt-2 flex items-center gap-1.5 justify-center sm:justify-start">
              <MapPin className="w-4 h-4 text-[var(--color-brand-500)] shrink-0" />
              <span className="truncate">{address || city}</span>
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
            {isCustomer ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Certifié Grade
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700">
                Non certifié
              </span>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                className="px-2.5 py-1 rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-brand-300)] hover:text-[var(--color-brand-600)] transition-colors flex items-center gap-1"
              >
                <Phone className="w-3 h-3" /> {phone}
              </a>
            )}
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-brand-300)] hover:text-[var(--color-brand-600)] transition-colors flex items-center gap-1"
              >
                <Globe className="w-3 h-3" /> Site web
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
